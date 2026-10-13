import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import https from 'node:https';
import { networkInterfaces } from 'node:os';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { generate } from 'selfsigned';
import { SessionRelay } from './relay';
import { ClanWars } from './multiplayer';

if (existsSync('.env')) process.loadEnvFile('.env');

const production = process.argv.includes('--production');
const port = Number(process.env.PORT || 8787);
const tlsPort = Number(process.env.TLS_PORT || 8788);
const localAddresses = Object.values(networkInterfaces()).flat().filter(a => a?.family === 'IPv4' && !a.internal).map(a => a!.address);
const lan = localAddresses.find(ip => ip.startsWith('192.168.')) || localAddresses.find(ip => ip.startsWith('10.')) || localAddresses[0] || 'localhost';
const phoneBase = (process.env.PHONE_BASE_URL || `https://${lan}:${tlsPort}`).replace(/\/$/, '');
const relay = new SessionRelay(phoneBase);
const clanWars = new ClanWars((room, message) => relay.sendToTV(room, message));
relay.onTVMessage = (room, message) => clanWars.command(room, message);
relay.onTVPresence = (room, connected) => clanWars.connected(room, connected);
const joinAttempts = new Map<string, { count: number; startedAt: number }>();
const json = (response: ServerResponse, status: number, body: object) => { response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(body)); };

async function body(request: IncomingMessage) {
  if (!request.headers['content-type']?.startsWith('application/json')) throw new Error('Send JSON.');
  let content = '';
  for await (const chunk of request) { content += chunk; if (content.length > 2048) throw new Error('Request too large.'); }
  return JSON.parse(content || '{}');
}
const vite = production ? null : await (await import('vite')).createServer({ server: { middlewareMode: true, ws: { port: 8790 } }, appType: 'spa' });
const distRoot = resolve('dist');
const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.task': 'application/octet-stream', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json' };

async function handle(request: IncomingMessage, response: ServerResponse) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'same-origin');
  response.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  const pathname = new URL(request.url || '/', `http://${request.headers.host}`).pathname;
  if (request.method === 'POST') {
    const origin = request.headers.origin;
    try { if (origin && new URL(origin).host !== request.headers.host) return json(response, 403, { error: 'Open Earned Valor on this server.' }); }
    catch { return json(response, 403, { error: 'Invalid origin.' }); }
  }
  try {
    if (pathname === '/api/health') return json(response, 200, { ok: true, name: 'Earned Valor', version: '0.1.0' });
    if (pathname === '/api/config') return json(response, 200, { phoneBase, httpPort: port, httpsPort: tlsPort, lan });
    if (pathname === '/api/sessions' && request.method === 'POST') return json(response, 201, relay.create());
    if (pathname === '/api/join' && request.method === 'POST') {
      const ip = request.socket.remoteAddress || 'local';
      const now = Date.now();
      let attempt = joinAttempts.get(ip);
      if (!attempt || now - attempt.startedAt > 60_000) { attempt = { count: 0, startedAt: now }; joinAttempts.set(ip, attempt); }
      if (++attempt.count > 10) return json(response, 429, { error: 'Too many attempts. Wait a minute and try again.' });
      const input = await body(request);
      if (typeof input.code !== 'string' || !/^[23456789A-Z]{6}$/.test(input.code.toUpperCase())) return json(response, 400, { error: 'Enter the six-character code from your TV.' });
      const joined = relay.join(input.code);
      if (!joined) return json(response, 404, { error: 'That room is unavailable. Check the code on your TV.' });
      if ('busy' in joined) return json(response, 409, { error: 'A phone is already connected. Disconnect it first.' });
      return json(response, 200, joined);
    }
    if (pathname.startsWith('/api/')) return json(response, 404, { error: 'Unknown endpoint.' });
    if (vite) return vite.middlewares(request, response);
    let path = resolve(distRoot, `.${decodeURIComponent(pathname)}`);
    if (!path.startsWith(distRoot + '\\') && path !== distRoot && !path.startsWith(distRoot + '/')) return json(response, 403, { error: 'Invalid path.' });
    if (!existsSync(path) || !(await stat(path)).isFile()) {
      if (extname(pathname)) return json(response, 404, { error: 'Asset not found.' });
      path = resolve(distRoot, 'index.html');
    }
    response.writeHead(200, { 'Content-Type': `${mime[extname(path)] || 'application/octet-stream'}${['.html', '.js', '.css'].includes(extname(path)) ? '; charset=utf-8' : ''}` });
    response.end(await readFile(path));
  } catch (error) { json(response, 400, { error: error instanceof Error ? error.message : 'Request failed.' }); }
}

const tlsRoot = resolve('.local/tls');
await mkdir(tlsRoot, { recursive: true });
const certFile = resolve(tlsRoot, 'cert.pem'), keyFile = resolve(tlsRoot, 'key.pem');
if (!existsSync(certFile) || !existsSync(keyFile)) {
  const cert = await generate([{ name: 'commonName', value: 'Earned Valor Development' }], {
    keySize: 2048, algorithm: 'sha256',
    extensions: [{ name: 'subjectAltName', altNames: [
      { type: 2, value: 'localhost' }, { type: 7, ip: '127.0.0.1' }, ...localAddresses.map(ip => ({ type: 7 as const, ip })),
    ] }],
  });
  await writeFile(certFile, cert.cert); await writeFile(keyFile, cert.private, { mode: 0o600 });
}
const server = http.createServer((req, res) => { void handle(req, res); });
const secure = https.createServer({ cert: await readFile(certFile), key: await readFile(keyFile) }, (req, res) => { void handle(req, res); });
relay.attach(server); relay.attach(secure);
server.listen(port, '0.0.0.0', () => {
  console.log(`\nEarned Valor is ready.\n  Desktop TV preview: http://localhost:${port}\n  Android emulator:   http://10.0.2.2:${port}\n  Phone over Wi-Fi:   ${phoneBase}/phone\n  Phone over USB:     http://localhost:${port}/phone\n\nWi-Fi uses a local development certificate. USB localhost requires adb reverse; run npm run phone:usb.\n`);
});
secure.listen(tlsPort, '0.0.0.0');
const shutdown = async () => { clanWars.close(); relay.close(); await vite?.close(); server.close(); secure.close(); process.exit(0); };
process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
