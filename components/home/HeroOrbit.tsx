"use client";

import { useEffect, useRef } from "react";
import { velocityVerlet } from "@/lib/physics/integrators";

export default function HeroOrbit() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let y = [0, 0, 0, -0.22, 4.6, 0, 0, 3.6]; // [x1,y1,vx1,vy1,x2,y2,vx2,vy2]
    const G = 1, m1 = 90, m2 = 6, soft = 0.05;
    const f = (state: number[]) => {
      const [x1, y1, , , x2, y2] = state;
      const dx = x2 - x1, dy = y2 - y1;
      const r2 = dx * dx + dy * dy + soft * soft;
      const r = Math.sqrt(r2);
      const F = (G * m1 * m2) / r2;
      const fx = (F * dx) / r, fy = (F * dy) / r;
      return [state[2], state[3], fx / m1, fy / m1, state[6], state[7], -fx / m2, -fy / m2];
    };

    const trail: { x: number; y: number }[] = [];
    let raf = 0;
    let alive = true;

    const draw = () => {
      if (!alive) return;
      for (let i = 0; i < 3; i++) {
        const res = velocityVerlet(y, f, 0, 0.01);
        y = res.y;
      }
      trail.push({ x: y[4], y: y[5] });
      if (trail.length > 260) trail.shift();

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = rect.width, H = rect.height;
      ctx.clearRect(0, 0, W, H);

      const zoom = Math.min(W, H) / 12;
      const cx = W / 2, cy = H / 2;
      const toS = (x: number, yy: number): [number, number] => [cx + x * zoom, cy - yy * zoom];

      // faint field rings
      ctx.strokeStyle = "rgba(124,92,255,0.08)";
      for (let ring = 1; ring <= 4; ring++) {
        ctx.beginPath();
        ctx.arc(cx, cy, ring * zoom * 1.15, 0, Math.PI * 2);
        ctx.stroke();
      }

      // trail
      for (let i = 1; i < trail.length; i++) {
        const alpha = (i / trail.length) * 0.7;
        const [x0, y0] = toS(trail[i - 1].x, trail[i - 1].y);
        const [x1, y1] = toS(trail[i].x, trail[i].y);
        ctx.strokeStyle = `rgba(0,229,199,${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }

      const [s1x, s1y] = toS(y[0], y[1]);
      const [s2x, s2y] = toS(y[4], y[5]);

      const g1 = ctx.createRadialGradient(s1x - 6, s1y - 6, 0, s1x, s1y, 22);
      g1.addColorStop(0, "#b8a6ff");
      g1.addColorStop(1, "#7c5cff");
      ctx.fillStyle = g1;
      ctx.beginPath();
      ctx.arc(s1x, s1y, 22, 0, Math.PI * 2);
      ctx.fill();

      const g2 = ctx.createRadialGradient(s2x - 3, s2y - 3, 0, s2x, s2y, 8);
      g2.addColorStop(0, "#ffffff");
      g2.addColorStop(1, "#00e5c7");
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(s2x, s2y, 8, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="relative aspect-square max-w-[440px] mx-auto w-full rounded-3xl panel panel-glow overflow-hidden">
      <canvas ref={ref} className="w-full h-full" />
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[10px] font-mono text-ink-faint">
        <span>velocity-verlet · live</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-kinetic animate-pulse" /> integrating
        </span>
      </div>
    </div>
  );
}
