import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { isCommand, isPoseFrame, type SessionInfo } from '../shared/protocol';

type Room = { code: string; tvToken: string; phoneToken: string; expiresAt: number; tv: WebSocket | null; phone: WebSocket | null };
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const equalToken = (a: string, b: string) => /^[a-f0-9]{48}$/.test(a) && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export class SessionRelay {
  onTVMessage?: (room: string, message: unknown) => boolean;
  onTVPresence?: (room: string, connected: boolean) => void;
  rooms = new Map<string, Room>();
  private wss = new WebSocketServer({ noServer: true, maxPayload: 16_384, perMessageDeflate: false });
  private cleanup: ReturnType<typeof setInterval>;
  constructor(private phoneBase: string, public ttl = 60 * 60 * 1000) {
    this.cleanup = setInterval(() => this.expire(), 30_000); this.cleanup.unref();
  }
  create(): SessionInfo {
    this.expire();
    if (this.rooms.size >= 100) throw new Error('Too many active rooms. Try again later.');
    let code: string;
    do { code = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(''); } while (this.rooms.has(code));
    const room: Room = { code, tvToken: randomBytes(24).toString('hex'), phoneToken: randomBytes(24).toString('hex'), expiresAt: Date.now() + this.ttl, tv: null, phone: null };
    this.rooms.set(code, room);
    return { code, tvToken: room.tvToken, phoneToken: room.phoneToken, expiresAt: room.expiresAt,
      phoneUrl: `${this.phoneBase}/phone#code=${code}&token=${room.phoneToken}` };
  }
  join(code: string) {
    const room = this.rooms.get(code.toUpperCase());
    if (!room || room.expiresAt < Date.now()) return null;
    if (room.phone?.readyState === WebSocket.OPEN) return { busy: true };
    return { code: room.code, phoneToken: room.phoneToken };
  }
  attach(server: Server) {
    server.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url || '/', `http://${request.headers.host}`);
      if (url.pathname !== '/relay') return;
      const room = this.rooms.get(url.searchParams.get('code') || '');
      const role = url.searchParams.get('role');
      const token = url.searchParams.get('token') || '';
      let validOrigin = !request.headers.origin;
      try { validOrigin ||= new URL(request.headers.origin!).host === request.headers.host; } catch { /* Reject malformed origins. */ }
      const valid = validOrigin && room && room.expiresAt > Date.now() && (role === 'tv' || role === 'phone')
        && equalToken(token, role === 'tv' ? room.tvToken : room.phoneToken);
      if (!valid) { socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); socket.destroy(); return; }
      this.wss.handleUpgrade(request, socket, head, ws => this.connect(room, role, ws, request));
    });
  }
  private send(ws: WebSocket | null, message: object) {
    if (ws?.readyState === WebSocket.OPEN && ws.bufferedAmount < 64_000) ws.send(JSON.stringify(message));
  }
  sendToTV(code: string, message: object) { this.send(this.rooms.get(code)?.tv || null, message); }
  private presence(room: Room) {
    const message = { type: 'presence', phoneConnected: room.phone?.readyState === WebSocket.OPEN, tvConnected: room.tv?.readyState === WebSocket.OPEN };
    this.send(room.tv, message); this.send(room.phone, message);
  }
  private connect(room: Room, role: 'tv' | 'phone', ws: WebSocket, _request: IncomingMessage) {
    if (role === 'phone' && room.phone?.readyState === WebSocket.OPEN) {
      this.send(ws, { type: 'error', message: 'A phone is already connected to this room.' }); ws.close(4409); return;
    }
    if (role === 'tv') room.tv?.close(4001, 'TV reconnected');
    room[role] = ws;
    this.send(ws, { type: 'connected', role, phoneConnected: room.phone?.readyState === WebSocket.OPEN, tvConnected: room.tv?.readyState === WebSocket.OPEN });
    this.presence(room);
    if (role === 'tv') this.onTVPresence?.(room.code, true);
    let lastSequence = -1, windowStart = Date.now(), packets = 0;
    ws.on('message', raw => {
      if (room[role] !== ws) return;
      if (Date.now() - windowStart >= 1000) { windowStart = Date.now(); packets = 0; }
      if (++packets > 45) { ws.close(4408, 'Too many messages'); return; }
      let message: unknown;
      try { message = JSON.parse(raw.toString()); } catch { this.send(ws, { type: 'error', message: 'Invalid message.' }); return; }
      if (message && typeof message === 'object' && (message as { type?: string }).type === 'ping') {
        const t = (message as { t?: number }).t;
        if (typeof t === 'number' && Number.isFinite(t)) this.send(ws, { type: 'pong', t });
      } else if (role === 'phone' && isPoseFrame(message)) {
        if (message.seq <= lastSequence) return;
        lastSequence = message.seq; this.send(room.tv, message);
      } else if (role === 'tv' && isCommand(message)) this.send(room.phone, message);
      else if (role === 'tv' && this.onTVMessage?.(room.code, message)) { /* Authenticated game commands. */ }
      else this.send(ws, { type: 'error', message: 'Unsupported message for this device.' });
    });
    ws.on('close', () => { if (room[role] === ws) { room[role] = null; this.presence(room); if (role === 'tv') this.onTVPresence?.(room.code, false); } });
    ws.on('error', () => { /* Close events update presence. */ });
  }
  expire() {
    for (const [code, room] of this.rooms) if (room.expiresAt < Date.now()) {
      room.tv?.close(4401, 'Room expired'); room.phone?.close(4401, 'Room expired'); this.rooms.delete(code);
    }
  }
  close() { clearInterval(this.cleanup); for (const room of this.rooms.values()) { room.tv?.terminate(); room.phone?.terminate(); } this.rooms.clear(); this.wss.close(); }
}
