import { useEffect, useRef } from 'react';
import type { GameSnapshot, Point } from '../../shared/game';

const stars = Array.from({ length: 65 }, (_, i) => ({ x: ((i * 173 + 19) % 997) / 997, y: ((i * 97 + 31) % 631) / 631, size: i % 7 === 0 ? 1.8 : 0.8 }));
function polygon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, n: number, rotation = 0) {
  ctx.beginPath(); for (let i = 0; i <= n; i++) { const a = i * Math.PI * 2 / n + rotation; const px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath();
}
function render(ctx: CanvasRenderingContext2D, w: number, h: number, s: GameSnapshot, now: number) {
  const background = ctx.createLinearGradient(0, 0, 0, h); background.addColorStop(0, '#111e22'); background.addColorStop(1, '#24352b'); ctx.fillStyle = background; ctx.fillRect(0, 0, w, h);
  const halo = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.6); halo.addColorStop(0, '#86bf5a1d'); halo.addColorStop(1, '#86bf5a00'); ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h);
  for (const star of stars) { ctx.globalAlpha = 0.32 + Math.sin(now / 1700 + star.x * 20) * 0.15; ctx.fillStyle = '#e6efd8'; ctx.beginPath(); ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
  ctx.strokeStyle = '#abec7412'; ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.moveTo(w / 2, h * 0.35); ctx.lineTo(i * w / 13, h); ctx.stroke(); }
  for (let i = 0; i < 8; i++) { const y = h * (0.65 + i * i * 0.008); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.strokeStyle = '#bfe08c10'; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.47, w * 0.39, h * 0.34, 0, 0, Math.PI * 2); ctx.stroke();
  for (const target of s.targets) {
    const x = target.x * w, y = target.y * h, r = target.radius * h;
    const life = Math.max(0, 1 - target.age / target.lifetime), growth = Math.min(1, target.age * 5);
    ctx.save(); ctx.translate(x, y); ctx.scale(growth, growth);
    if (target.kind === 'drone') {
      ctx.shadowBlur = 18; ctx.shadowColor = '#c7f56b'; ctx.fillStyle = '#293e2d'; ctx.strokeStyle = '#c7f56b'; ctx.lineWidth = 2;
      polygon(ctx, 0, 0, r * 0.85, 6, Math.PI / 6 + Math.sin(now / 1400 + target.id) * 0.07); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.strokeStyle = '#c7f56b55'; ctx.beginPath(); ctx.moveTo(-r * 1.15, -r * 0.14); ctx.lineTo(-r * 0.85, -r * 0.14); ctx.moveTo(r * 0.85, -r * 0.14); ctx.lineTo(r * 1.15, -r * 0.14); ctx.stroke();
      ctx.fillStyle = '#d6ffa6'; ctx.fillRect(-r * 0.42, -r * 0.16, r * 0.22, r * 0.16); ctx.fillRect(r * 0.2, -r * 0.16, r * 0.22, r * 0.16);
      ctx.strokeStyle = '#c7f56b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 1.18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * life); ctx.stroke();
    } else {
      ctx.shadowBlur = 20; ctx.shadowColor = '#ff9974'; ctx.strokeStyle = '#ff9974'; ctx.lineWidth = 2; ctx.fillStyle = '#ff997425';
      polygon(ctx, 0, 0, r * (0.85 + target.age * 0.13), 3, -Math.PI / 2); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffd4b5'; ctx.beginPath(); ctx.arc(0, 0, r * 0.13, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.4 + (1 - life) * 0.5; ctx.beginPath(); ctx.arc(0, 0, r * (2.4 - target.age * 0.5), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffa886'; ctx.font = '600 10px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SHIELD', 0, r * 2.7);
    } ctx.restore();
  }
  for (const burst of s.bursts) {
    const age = s.elapsed - burst.at, x = burst.x * w, y = burst.y * h;
    const color = burst.kind === 'slice' ? '#d8ff9f' : burst.kind === 'block' ? '#a9ddff' : '#ff9b78'; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.globalAlpha = 1 - age / 0.55;
    for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9 + burst.id; const r = (0.03 + age * 0.18) * h; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.lineWidth = 2; ctx.stroke(); }
    if (burst.kind === 'slice') { ctx.font = '700 16px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SLICE', x, y - age * h * 0.09); }
  } ctx.globalAlpha = 1;
  if (s.shielding) { ctx.strokeStyle = '#a9ddff88'; ctx.fillStyle = '#7ec9ff0b'; ctx.lineWidth = 3; ctx.shadowColor = '#a9ddff'; ctx.shadowBlur = 22; polygon(ctx, w * 0.5, h * 0.54, h * 0.31, 6, Math.PI / 6); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0; }
  for (let i = 1; i < s.trail.length; i++) { const a = s.trail[i - 1], b = s.trail[i]; ctx.globalAlpha = Math.max(0, 1 - (s.elapsed - b.at) / 0.22); ctx.strokeStyle = '#c7f56b'; ctx.lineWidth = 6; ctx.shadowColor = '#c7f56b'; ctx.shadowBlur = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a.x * w, a.y * h); ctx.lineTo(b.x * w, b.y * h); ctx.stroke(); } ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  const bx = s.blade.x * w, by = s.blade.y * h;
  ctx.save(); ctx.translate(bx, by); ctx.rotate(-Math.PI / 4);
  ctx.strokeStyle = '#e9ffc8'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.shadowColor = '#c7f56b'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.moveTo(0, 15); ctx.lineTo(0, -h * 0.1); ctx.stroke();
  ctx.strokeStyle = '#8fa78a'; ctx.shadowBlur = 0; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-9, 16); ctx.lineTo(9, 16); ctx.moveTo(0, 17); ctx.lineTo(0, 31); ctx.stroke(); ctx.restore();
  ctx.strokeStyle = '#d5fba655'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bx, by, 13, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#e9ffc8'; ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2); ctx.fill();
}

export default function OrbitCanvas({ state, preview, onPreviewMove, onAspect }: { state: GameSnapshot; preview: boolean; onPreviewMove: (point: Point) => void; onAspect: (aspect: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null), data = useRef(state); data.current = state;
  useEffect(() => {
    const canvas = ref.current!, ctx = canvas.getContext('2d')!; let raf = 0;
    const draw = (now: number) => { const rect = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) { canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr); onAspect(rect.width / rect.height); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); render(ctx, rect.width, rect.height, data.current, now); raf = requestAnimationFrame(draw);
    }; raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf);
  }, [onAspect]);
  return <canvas ref={ref} className="orbit-canvas" aria-label="Orbit Arena: tracked wrist energy sword, drones and incoming bolts" onPointerMove={event => { if (!preview) return; const r = event.currentTarget.getBoundingClientRect(); onPreviewMove({ x: (event.clientX - r.left) / r.width, y: (event.clientY - r.top) / r.height }); }}/>;
}
