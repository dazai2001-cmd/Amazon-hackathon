/** Synthetic phone-landmark source for local TV/relay integration testing. No camera is used. */
import WebSocket from 'ws';
import { createInterface } from 'node:readline';
import { DEFAULT_PROFILE, syntheticPose } from '../shared/motion';
import { poseWithBlade } from '../shared/game';
import { lanePoint, type AttackLane } from '../shared/weapons';
import type { Activity, ServerMessage } from '../shared/protocol';

const code = process.argv[2]?.toUpperCase();
if (!code || !/^[23456789A-Z]{6}$/.test(code)) throw new Error('Usage: node --import tsx scripts/relay-fixture.ts SIX_CHARACTER_TV_CODE');
const response = await fetch('http://localhost:8787/api/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
const joined = await response.json() as { phoneToken?: string; error?: string };
if (!response.ok || !joined.phoneToken) throw new Error(joined.error || 'Unable to join the local TV room.');
const url = new URL('ws://localhost:8787/relay'); url.search = new URLSearchParams({ role: 'phone', code, token: joined.phoneToken }).toString();
const socket = new WebSocket(url);
let sequence = 0, activity: Activity = 'home', calibrationStep = 0, mode = 'live';
let duelWindup = -10000, duelExchange = 0;
let incoming: AttackLane = 'high', lesson: 'shield' | 'cut' | 'evade' | null = null, lessonStarted = 0;
socket.on('open', () => console.log('SYNTHETIC TEST INPUT connected at 18 fps. Commands: live, blank, freeze, quit. Calibration follows the TV cues; gameplay uses wrist sweeps and intermittent shields.'));
socket.on('message', bytes => {
  const message = JSON.parse(bytes.toString()) as ServerMessage;
  if (message.type !== 'command') return;
  if (message.action === 'activity') { activity = message.value as Activity; calibrationStep = 0; }
  if (message.action === 'instruction') {
    console.log(`TV cue: ${message.value}`);
    if (message.value.startsWith('Relax your arms')) calibrationStep = 0;
    if (message.value.startsWith('Lean left')) calibrationStep = 1;
    if (message.value.startsWith('Lean right')) calibrationStep = 2;
    if (message.value.startsWith('Raise both hands to your comfortable target. Hold')) calibrationStep = 3;
    if (message.value.startsWith('Calibration complete')) calibrationStep = 0;
    const attack = /^Incoming (high|left|right)\.$/.exec(message.value);
    if (attack) { duelWindup = performance.now(); duelExchange++; incoming = attack[1] as AttackLane; lesson = null; }
    if (message.value.startsWith('Raise your shield.')) { lesson = 'shield'; lessonStarted = performance.now(); }
    if (message.value.startsWith('Your blade follows')) { lesson = 'cut'; lessonStarted = performance.now(); }
    if (message.value.startsWith('Finally, shift')) { lesson = 'evade'; lessonStarted = performance.now(); }
  }
});
const timer = setInterval(() => {
  if (socket.readyState !== WebSocket.OPEN || mode === 'freeze') return;
  const now = performance.now(), t = now / 1000;
  const counterAge = now - duelWindup - (duelExchange % 2 ? 1400 : 1260);
  const swinging = counterAge >= 0 && counterAge < 300;
  const lessonAge = now - lessonStarted, lessonSwing = lesson === 'cut' && lessonAge % 1000 < 300;
  const cutProgress = swinging ? counterAge / 300 : lessonSwing ? lessonAge % 1000 / 300 : 0;
  const guarding = lesson === 'shield' || (duelExchange > 0 && counterAge < 0);
  const duelPoints = poseWithBlade(syntheticPose(lesson === 'evade' && lessonAge < 800 ? .85 : 0), { x: .82 - cutProgress * .64, y: .22 + cutProgress * .42 }, guarding, DEFAULT_PROFILE, lanePoint(incoming), true);
  const points = activity === 'calibrate' ? syntheticPose(calibrationStep === 1 ? -0.8 : calibrationStep === 2 ? 0.8 : 0, calibrationStep === 3)
    : activity === 'chapter' ? duelPoints
    : activity === 'play' ? poseWithBlade(syntheticPose(Math.sin(t * 0.7)), { x: 0.5 + Math.sin(t * 3) * 0.4, y: 0.52 + Math.sin(t * 1.3) * 0.18 }, t % 7 < 2.3, DEFAULT_PROFILE)
    : activity === 'coach' ? syntheticPose(0, t % 3.4 < 2.7) : syntheticPose();
  socket.send(JSON.stringify({ type: 'pose', seq: sequence++, t: now, landmarks: mode === 'blank' ? [] : points, fps: 18 }));
}, 1000 / 18);
const input = createInterface({ input: process.stdin });
const finish = () => { clearInterval(timer); socket.close(); input.close(); };
input.on('line', line => { const command = line.trim(); if (command === 'quit') finish(); else if (['live', 'blank', 'freeze'].includes(command)) { mode = command; console.log(`SYNTHETIC TEST INPUT: ${mode}`); } });
socket.on('close', (code, reason) => { console.log(`Test connection closed (${code}): ${reason}`); clearInterval(timer); input.close(); });
socket.on('error', error => { console.error(error.message); finish(); });
process.once('SIGINT', finish);
