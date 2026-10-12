import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { conversations, newStoryProgress, readStoryProgress, type ConversationId } from '../shared/chapter';
import { goalDistance, moveInCourtyard, routeTo, shots, spawn } from '../shared/courtyard';
import catalogue from '../content/story/chapter-01-dialogue.json';

test('every story branch reaches its scene ending and every recorded line exists', () => {
  const ids = new Set(catalogue.dialogue.map(line => line.id));
  for (const [name, script] of Object.entries(conversations)) {
    const nodes = new Map(script.nodes.map(node => [node.key, node]));
    assert.equal(nodes.size, script.nodes.length, `duplicate node in ${name}`);
    const visit = (key: string, path: Set<string>): void => {
      assert.ok(!path.has(key), `unintentional loop in ${name}:${key}`);
      const node = nodes.get(key); assert.ok(node, `missing branch ${name}:${key}`);
      assert.ok(node.text.trim()); if (node.voiceId) assert.ok(ids.has(node.voiceId), `missing voice line ${node.voiceId}`);
      const next = node.choices?.map(choice => choice.next) || (node.byMotive ? Object.values(node.byMotive) : node.next ? [node.next] : []);
      for (const target of next) visit(target, new Set([...path, key]));
    };
    visit(script.nodes[0].key, new Set());
  }
});

test('motive choices lead to their actual spoken response and return to the equipment scene', () => {
  const arrival = conversations.arrival;
  const choices = arrival.nodes.find(n => n.key === 'reason')!.choices!;
  assert.deepEqual(choices.map(c => c.motive), ['coin', 'belonging', 'truth']);
  for (const choice of choices) {
    const reply = arrival.nodes.find(n => n.key === choice.next)!;
    assert.equal(reply.next, 'kit'); assert.ok(reply.voiceId);
  }
  for (const id of ['victory', 'defeat'] as ConversationId[]) assert.ok(conversations[id].nodes.some(n => n.byMotive));
});

test('saved story checkpoints validate and never overwrite gear or the reward save', () => {
  const saved = { version: 2 as const, quest: 'forge' as const, memorySeen: true, lessonDone: true };
  assert.deepEqual(readStoryProgress(JSON.parse(JSON.stringify(saved))), saved);
  for (const invalid of [null, {}, { ...saved, version: 1 }, { ...saved, quest: 'missing' }, { ...saved, lessonDone: 'true' }]) assert.deepEqual(readStoryProgress(invalid), newStoryProgress());
  assert.deepEqual(Object.keys(saved).sort(), Object.keys(newStoryProgress()).sort());
});

test('the guided story walk reaches the forge, board and gate without crossing fences', () => {
  let position = { x: shots.mara.position[0], z: shots.mara.position[2] };
  for (const quest of ['forge', 'orders', 'gate'] as const) {
    for (const waypoint of routeTo(quest, position)) {
      for (let step = 0; step < 3000; step++) {
        const dx = waypoint.x - position.x, dz = waypoint.z - position.z, distance = Math.hypot(dx, dz);
        if (distance < .09) break;
        position = moveInCourtyard(position, dx / distance * Math.min(distance, .0375), dz / distance * Math.min(distance, .0375));
        if (step === 2999) assert.fail(`stuck on guided route to ${quest}`);
      }
    }
    assert.ok(goalDistance(position, quest) < 2.9, `cannot interact at ${quest}`);
  }
  const againstFence = moveInCourtyard({ x: 4, z: 0 }, 1, 0);
  assert.equal(againstFence.x, 4);
  assert.ok(goalDistance(spawn, 'alden') > 2.9);
});

test('the sound pack contains all 108 cast lines and playable files for every cue', () => {
  const manifest = JSON.parse(readFileSync('public/assets/medieval/audio/manifest.json', 'utf8'));
  const entries = [...catalogue.dialogue, ...catalogue.exerciseCues];
  assert.equal(Object.keys(manifest.voices).length, entries.length);
  for (const entry of entries) {
    const clip = manifest.voices[entry.id]; assert.ok(clip, `missing clip ${entry.id}`);
    assert.ok(clip.duration > .2 && Number.isFinite(clip.duration));
    assert.ok(existsSync(`public${clip.url}`)); assert.ok(readFileSync(`public${clip.url}`).length > 1000);
  }
  const cast = ['C01_S01_L003', 'C01_S02_L004', 'C01_S06_L001', 'C01_S02_L001', 'C01_S01_L001'].map(id => manifest.voices[id].voice);
  assert.equal(new Set(cast).size, 5);
  for (const cue of ['courtyard', 'trial', 'revelation', 'wind', 'rain', 'forge', 'shield', 'impact', 'swish', 'footstep', 'gate', 'horn', 'coin', 'page', 'ui']) {
    assert.ok(manifest.sounds[cue], `missing sound ${cue}`); assert.ok(existsSync(`public${manifest.sounds[cue].url}`));
  }
});
