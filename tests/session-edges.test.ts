import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import type { SessionInfo } from '../shared/protocol';
import { createSessionRooms } from '../src/lib/session';

const session = (code = 'ABC234'): SessionInfo => ({ code, tvToken: 'a'.repeat(48), phoneToken: 'b'.repeat(48),
  phoneUrl: `https://192.168.1.2:8788/phone#code=${code}&token=${'b'.repeat(48)}`, expiresAt: Date.now() + 3600000 });
function harness(context: TestContext) {
  let saved: string | null = null, calls = 0;
  const store = { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; }, removeItem: () => { saved = null; } };
  context.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json(session()); });
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: store });
  context.after(() => {
    context.mock.restoreAll();
    if (original) Object.defineProperty(globalThis, 'sessionStorage', original);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  });
  return { ...createSessionRooms(), store, save: (value: unknown) => { saved = JSON.stringify(value); }, calls: () => calls };
}

test('corrupted or near-expired saved rooms are replaced with a valid pairing session', async context => {
  const h = harness(context);
  for (const invalid of [{ expiresAt: Date.now() + 3600000 }, { ...session(), code: '!!!!!!' },
    { ...session(), tvToken: '' }, { ...session(), phoneUrl: 'javascript:alert(1)' },
    { ...session(), phoneUrl: session().phoneUrl.replace('ABC234', 'XYZ567') }, { ...session(), expiresAt: Date.now() + 1000 }]) {
    h.save(invalid); const before = h.calls();
    assert.deepEqual(await createSessionRooms().createRoom(), JSON.parse(h.store.getItem()!));
    assert.equal(h.calls(), before + 1, JSON.stringify(invalid));
  }
});

test('valid saved rooms and concurrent callers reuse one session', async context => {
  const h = harness(context), { createRoom, clearRoom } = h, valid = session(); h.save(valid);
  assert.deepEqual(await createRoom(), valid); assert.equal(h.calls(), 0);
  clearRoom(); const [a, b, c] = await Promise.all([createRoom(), createRoom(), createRoom()]);
  assert.deepEqual(a, b); assert.deepEqual(b, c); assert.equal(h.calls(), 1);
});

test('unavailable browser storage cannot prevent pairing or reconnecting', async context => {
  const h = harness(context), { createRoom, clearRoom } = h;
  context.mock.method(h.store, 'getItem', () => { throw new Error('Storage disabled'); });
  context.mock.method(h.store, 'setItem', () => { throw new Error('Storage full'); });
  assert.equal((await createRoom()).code, 'ABC234');
  context.mock.method(h.store, 'removeItem', () => { throw new Error('Storage disabled'); });
  assert.doesNotThrow(clearRoom);
  assert.equal((await createRoom()).code, 'ABC234');
  h.store.removeItem = () => {};
});

test('a malformed server response is rejected and the next attempt can recover', async context => {
  const { createRoom } = harness(context);
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async () => Response.json(++calls === 1 ? { expiresAt: Date.now() + 3600000 } : session()));
  await assert.rejects(createRoom(), /pairing/i);
  assert.equal((await createRoom()).code, 'ABC234');
});

test('a superseded pairing request cannot overwrite a newly renewed room', async context => {
  const h = harness(context), { createRoom, clearRoom } = h;
  let resolveFirst!: (response: Response) => void, calls = 0;
  context.mock.method(globalThis, 'fetch', () => ++calls === 1
    ? new Promise<Response>(resolve => { resolveFirst = resolve; }) : Promise.resolve(Response.json(session('XYZ567'))));
  const old = createRoom(); clearRoom(); const current = await createRoom();
  resolveFirst(Response.json(session())); await old;
  assert.equal(current.code, 'XYZ567');
  assert.equal(JSON.parse(h.store.getItem()!).code, 'XYZ567');
  assert.deepEqual(await createRoom(), current);
});

test('renewal ignores the old saved room even when deletion fails but reading still works', async context => {
  const h = harness(context), { createRoom, clearRoom } = h; h.save(session());
  assert.equal((await createRoom()).code, 'ABC234');
  context.mock.method(h.store, 'removeItem', () => { throw new Error('Storage cannot delete'); });
  context.mock.method(globalThis, 'fetch', async () => Response.json(session('XYZ567')));
  clearRoom(); assert.equal((await createRoom()).code, 'XYZ567');
});
