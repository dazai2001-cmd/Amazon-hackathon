import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import https from 'node:https';
import net from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
assert.ok(existsSync(join(root, 'dist/index.html')), 'Run npm run build before npm run test:production.');
const freePort = async () => {
  const probe = net.createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve)); return port;
};
const port = await freePort();
let tlsPort = await freePort(); while (tlsPort === port) tlsPort = await freePort();
await mkdir(join(root, '.local'), { recursive: true });
const data = await mkdtemp(join(root, '.local/production-check-'));
const base = `http://127.0.0.1:${port}`, secureBase = `https://127.0.0.1:${tlsPort}`;
let output = '';
const server = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts', '--production'], {
  cwd: root, env: { ...process.env, PORT: String(port), TLS_PORT: String(tlsPort), TLS_ENABLED: 'true',
    PHONE_BASE_URL: secureBase, DATA_DIR: data }, stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', chunk => { output = (output + chunk).slice(-8000); });
server.stderr.on('data', chunk => { output = (output + chunk).slice(-8000); });
server.on('error', error => { output += error.message; });
const clients = [];
const stop = () => { clients.forEach(client => client.terminate()); server.kill(); };
process.once('SIGINT', stop); process.once('SIGTERM', stop);
const request = async (path, options) => fetch(base + path, { ...options, signal: AbortSignal.timeout(10000) });
const json = async (path, body) => {
  const response = await request(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  assert.ok(response.ok, `${path}: HTTP ${response.status}`); return response.json();
};
const packet = (socket, type) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { socket.off('message', receive); reject(new Error(`No ${type} packet received.`)); }, 10000);
  const receive = raw => { const value = JSON.parse(raw); if (value.type === type) { clearTimeout(timer); socket.off('message', receive); resolve(value); } };
  socket.on('message', receive);
});

try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null || server.signalCode !== null) throw new Error('Production server exited before becoming ready.');
    try { ready = (await json('/api/health')).ok === true; } catch { /* Wait for initial certificate generation. */ }
    if (ready) break; await delay(250);
  }
  assert.ok(ready, 'Production server did not become ready in 30 seconds.');
  const config = await json('/api/config'); assert.equal(config.phoneBase, secureBase);
  for (const path of ['/', '/chapter', '/training', '/arena', '/phone']) {
    const response = await request(path); assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/); assert.match(await response.text(), /Earned Valor/);
  }
  const index = await (await request('/')).text();
  const bundled = [...index.matchAll(/(?:src|href)="(\/assets\/[^" ]+\.(?:js|css))"/g)].map(match => match[1]);
  assert.ok(bundled.some(path => path.endsWith('.js')), 'Production JavaScript bundle is missing.');
  for (const path of [...bundled, '/vision/runtime.js', '/vision/pose-worker.js', '/vision/wasm/vision_wasm_internal.wasm',
    '/vision/pose_landmarker_full.task', '/vision/pose_landmarker_lite.task', '/assets/medieval/characters/instructor.png']) {
    const response = await request(path); assert.equal(response.status, 200, path);
    assert.ok((await response.arrayBuffer()).byteLength > 100, `${path} is empty.`);
    assert.doesNotMatch(response.headers.get('content-type'), /text\/html/, `${path} returned the app instead of the asset.`);
  }
  assert.equal((await request('/missing-reviewer-asset.js')).status, 404);
  const ca = await readFile(join(root, '.local/tls/cert.pem'));
  const secureHealth = await new Promise((resolve, reject) => {
    const call = https.get(secureBase + '/api/health', { ca, timeout: 10000 }, response => {
      let body = ''; response.on('data', chunk => { body += chunk; });
      response.on('end', () => { try { assert.equal(response.statusCode, 200); resolve(JSON.parse(body)); } catch (error) { reject(error); } });
    });
    call.on('timeout', () => call.destroy(new Error('HTTPS health check timed out.'))); call.on('error', reject);
  });
  assert.equal(secureHealth.ok, true);
  const session = await json('/api/sessions', {}), joined = await json('/api/join', { code: session.code });
  assert.equal(joined.phoneToken, session.phoneToken);
  assert.ok(session.phoneUrl.startsWith(secureBase + '/phone#'));
  const connect = async role => {
    const url = new URL('/relay', role === 'phone' ? secureBase.replace('https:', 'wss:') : base.replace('http:', 'ws:'));
    url.search = new URLSearchParams({ role, code: session.code, token: role === 'tv' ? session.tvToken : joined.phoneToken });
    const socket = new WebSocket(url, role === 'phone' ? { ca } : {}); clients.push(socket);
    await once(socket, 'open', { signal: AbortSignal.timeout(10000) });
    return socket;
  };
  const tv = await connect('tv'), phone = await connect('phone');
  const pose = { type: 'pose', seq: 1, t: 100, fps: 18, landmarks: Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: 1 })) };
  const received = packet(tv, 'pose'); phone.send(JSON.stringify(pose)); assert.deepEqual(await received, pose);
  const ack = packet(phone, 'pose-ack'); tv.send(JSON.stringify({ type: 'pose-ack', seq: 1, t: 100 })); assert.equal((await ack).seq, 1);
  assert.ok(Array.isArray((await json('/api/clans')).clans));
  console.log('Production smoke check passed: five routes, built assets, both pose models/WASM, trusted local HTTPS, HTTP-to-WSS pairing, landmarks and TV acknowledgement.');
  console.log('This check uses synthetic landmarks; it does not measure human camera accuracy or device performance.');
} catch (error) {
  console.error(output); throw error;
} finally {
  stop(); process.off('SIGINT', stop); process.off('SIGTERM', stop);
}
