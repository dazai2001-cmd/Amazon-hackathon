import { useEffect, useRef } from 'react';
import type { Landmark } from '../../shared/protocol';
import { POSE_CONNECTIONS } from '../../shared/motion';

export function drawPose(ctx: CanvasRenderingContext2D, points: Landmark[], width: number, height: number, color = '#c7f56b', mirror = true, lineWidth = 4) {
  const position = (i: number) => ({ x: (mirror ? 1 - points[i].x : points[i].x) * width, y: points[i].y * height });
  ctx.lineWidth = lineWidth; ctx.lineCap = 'round'; ctx.strokeStyle = color; ctx.fillStyle = color;
  for (const [a, b] of POSE_CONNECTIONS) {
    if (!points[a] || !points[b] || Math.min(points[a].visibility, points[b].visibility) < 0.45) continue;
    const p = position(a), q = position(b); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }
  for (const i of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
    if (!points[i] || points[i].visibility < 0.45) continue;
    const p = position(i); ctx.beginPath(); ctx.arc(p.x, p.y, lineWidth * 1.2, 0, Math.PI * 2); ctx.fill();
  }
  if (points[0]?.visibility > 0.45 && points[11] && points[12]) {
    const p = position(0); const size = Math.max(10, Math.abs(points[11].x - points[12].x) * width * 0.26);
    ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.stroke();
  }
}

export default function PoseView({ points, ghost, className = '' }: { points: Landmark[]; ghost?: Landmark[]; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!; const ctx = canvas.getContext('2d')!;
    const box = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = box.width * dpr; canvas.height = box.height * dpr;
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, box.width, box.height);
    if (ghost?.length === 33) { ctx.globalAlpha = 0.35; drawPose(ctx, ghost, box.width, box.height, '#b4a1ff', true, 5); ctx.globalAlpha = 1; }
    if (points.length === 33) { ctx.shadowColor = '#c7f56b'; ctx.shadowBlur = 15; drawPose(ctx, points, box.width, box.height, '#c7f56b', true, 5); }
  }, [points, ghost]);
  return <canvas ref={ref} className={`pose-canvas ${className}`} aria-label="Live movement silhouette" />;
}
