import type { SessionInfo } from '../../shared/protocol';

export function readSessionInfo(value: unknown): SessionInfo | null {
  if (!value || typeof value !== 'object') return null;
  const s = value as SessionInfo;
  if (typeof s.code !== 'string' || !/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(s.code)
    || typeof s.tvToken !== 'string' || !/^[a-f0-9]{48}$/.test(s.tvToken)
    || typeof s.phoneToken !== 'string' || !/^[a-f0-9]{48}$/.test(s.phoneToken)
    || !Number.isFinite(s.expiresAt) || s.expiresAt <= Date.now() + 60000
    || typeof s.phoneUrl !== 'string' || s.phoneUrl.length > 2048) return null;
  try {
    const url = new URL(s.phoneUrl), link = new URLSearchParams(url.hash.slice(1));
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.pathname.endsWith('/phone')
      || link.get('code') !== s.code || link.get('token') !== s.phoneToken) return null;
  } catch { return null; }
  return { code: s.code, tvToken: s.tvToken, phoneToken: s.phoneToken, phoneUrl: s.phoneUrl, expiresAt: s.expiresAt };
}
export function createSessionRooms() {
  let roomPromise: Promise<SessionInfo> | null = null, generation = 0, reuseSaved = true;
  function createRoom() {
    if (roomPromise) return roomPromise;
    const requestGeneration = generation;
    const pending = (async () => {
      if (reuseSaved) {
        try {
          const saved = readSessionInfo(JSON.parse(sessionStorage.getItem('moveroom.session') || 'null'));
          if (saved) return saved;
        } catch { /* Make a new room if the saved session is invalid. */ }
      }
      const response = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error('The pairing server is unavailable. Start it, then try again.');
      const session = readSessionInfo(await response.json());
      if (!session) throw new Error('The pairing server returned an invalid room. Try reconnecting.');
      if (generation === requestGeneration) {
        try { sessionStorage.setItem('moveroom.session', JSON.stringify(session)); } catch { /* Pairing works without saved storage. */ }
      }
      return session;
    })();
    roomPromise = pending;
    void pending.catch(() => { if (roomPromise === pending) roomPromise = null; });
    return pending;
  }
  function clearRoom() {
    generation++; roomPromise = null; reuseSaved = false;
    try { sessionStorage.removeItem('moveroom.session'); } catch { /* Renewal ignores the old saved room even if deletion fails. */ }
  }
  return { createRoom, clearRoom };
}
// One shared request cache per page, including React's development remounts.
export const { createRoom, clearRoom } = createSessionRooms();
