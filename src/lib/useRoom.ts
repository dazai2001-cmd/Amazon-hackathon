import { useCallback, useEffect, useRef, useState } from 'react';
import type { Command, PoseFrame, SessionInfo } from '../../shared/protocol';
import { RoomSocket } from './socket';
import type { ArenaCommand, ArenaState } from '../../shared/multiplayer';

let roomPromise: Promise<SessionInfo> | null = null;
function createRoom() {
  if (!roomPromise) roomPromise = (async () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('moveroom.session') || 'null') as SessionInfo | null;
      if (saved && saved.expiresAt > Date.now() + 60_000) return saved;
    } catch { /* Make a new room if the saved session is invalid. */ }
    const response = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (!response.ok) throw new Error('The pairing server is unavailable. Start it, then try again.');
    const session = await response.json() as SessionInfo;
    sessionStorage.setItem('moveroom.session', JSON.stringify(session));
    return session;
  })().catch(error => { roomPromise = null; throw error; });
  return roomPromise;
}

export function useRoom() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [phoneConnected, setPhoneConnected] = useState(false);
  const [connected, setConnected] = useState(false);
  const [frame, setFrame] = useState<{ packet: PoseFrame; receivedAt: number } | null>(null);
  const [error, setError] = useState('');
  const [latency, setLatency] = useState<number | null>(null);
  const [generation, setGeneration] = useState(0);
  const [arena, setArena] = useState<ArenaState>({ type: 'arena-state', me: null, war: null, match: null }), [arenaError, setArenaError] = useState('');
  const socket = useRef<RoomSocket | null>(null);
  useEffect(() => {
    let stopped = false;
    createRoom().then(info => {
      if (stopped) return;
      setSession(info); setError('');
      const connection = new RoomSocket('tv', info.code, info.tvToken, message => {
        if (stopped) return;
        if (message.type === 'pose') setFrame({ packet: message, receivedAt: performance.now() });
        if (message.type === 'presence' || message.type === 'connected') {
          setPhoneConnected(message.phoneConnected);
          if (!message.phoneConnected) setFrame(null);
        }
        if (message.type === 'error') setError(message.message);
        if (message.type === 'pong') setLatency(Math.round(performance.now() - message.t));
        if (message.type === 'arena-state') setArena(message);
        if (message.type === 'arena-error') setArenaError(message.message);
      }, state => { if (!stopped) { setConnected(state); if (state) connection.send({ type: 'arena-command', action: 'sync' }); else { setPhoneConnected(false); setFrame(null); } } });
      socket.current = connection;
    }).catch(error => { if (!stopped) setError(error.message); });
    return () => { stopped = true; socket.current?.close(); socket.current = null; };
  }, [generation]);
  const command = useCallback((action: Command['action'], value: string) => socket.current?.send({ type: 'command', action, value }), []);
  const arenaCommand = useCallback((message: ArenaCommand) => { if (message.action !== 'input') setArenaError(''); socket.current?.send(message); }, []);
  const renew = useCallback(() => {
    roomPromise = null; sessionStorage.removeItem('moveroom.session');
    setSession(null); setPhoneConnected(false); setFrame(null); setGeneration(v => v + 1);
    setArena({ type: 'arena-state', me: null, war: null, match: null }); setArenaError('');
  }, []);
  return { session, phoneConnected, connected, frame, error, latency, command, renew, arena, arenaError, arenaCommand };
}
