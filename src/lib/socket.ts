import type { ServerMessage } from '../../shared/protocol';

export class RoomSocket {
  private ws: WebSocket | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private retries = 0;
  constructor(private role: 'tv' | 'phone', private code: string, private token: string,
    private onMessage: (message: ServerMessage) => void, private onState: (connected: boolean) => void) { this.connect(); }
  private connect() {
    const url = new URL('/relay', window.location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.search = new URLSearchParams({ role: this.role, code: this.code, token: this.token }).toString();
    const ws = this.ws = new WebSocket(url);
    ws.onopen = () => { this.retries = 0; this.onState(true); this.heartbeat = setInterval(() => this.send({ type: 'ping', t: performance.now() }), 4000); };
    ws.onmessage = event => { try { this.onMessage(JSON.parse(event.data) as ServerMessage); } catch { /* Ignore malformed messages. */ } };
    ws.onerror = () => { /* Close handles reconnect. */ };
    ws.onclose = event => {
      if (this.heartbeat) clearInterval(this.heartbeat);
      this.onState(false);
      if (this.stopped) return;
      if ([4401, 4409, 4001, 4408].includes(event.code)) {
        this.onMessage({ type: 'error', message: event.code === 4401 ? 'Room expired. Create a new pairing code.' : event.code === 4001 ? 'This room was opened on another TV tab. Reconnect to create your own room.' : event.code === 4408 ? 'Connection paused after too many messages. Reconnect to a new room.' : 'A phone is already connected to this room.' }); return;
      }
      if (this.retries >= 5) { this.onMessage({ type: 'error', message: 'The room is unavailable. Check the server, then reconnect with a new pairing code.' }); return; }
      this.timer = setTimeout(() => this.connect(), Math.min(8000, 600 * 2 ** this.retries++));
    };
  }
  send(message: object) { if (this.ws?.readyState === WebSocket.OPEN && this.ws.bufferedAmount < 32_000) this.ws.send(JSON.stringify(message)); }
  close() { this.stopped = true; if (this.timer) clearTimeout(this.timer); if (this.heartbeat) clearInterval(this.heartbeat); this.ws?.close(); }
}
