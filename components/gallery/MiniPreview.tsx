"use client";

import { useEffect, useRef } from "react";
import { TWO_BODY_PRESETS, stepTwoBody, TwoBodyState } from "@/lib/physics/twoBody";
import { PROJECTILE_PRESETS, stepProjectile, ProjectileState } from "@/lib/physics/projectile";

export function MiniTwoBodyPreview({ presetId }: { presetId: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const preset = TWO_BODY_PRESETS.find((p) => p.id === presetId)!;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let state: TwoBodyState = { t: 0, y: preset.initial.slice(), merged: false };
    const trail1: { x: number; y: number }[] = [];
    const trail2: { x: number; y: number }[] = [];
    let raf = 0;
    let alive = true;

    const draw = () => {
      if (!alive) return;
      if (!state.merged) {
        for (let i = 0; i < 3; i++) {
          const res = stepTwoBody(state, preset.params, "velocity-verlet", 0.006);
          state = res.state;
        }
        trail1.push({ x: state.y[0], y: state.y[1] });
        trail2.push({ x: state.y[4], y: state.y[5] });
        if (trail1.length > 200) trail1.shift();
        if (trail2.length > 200) trail2.shift();
      }

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = rect.width, H = rect.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0a0d14";
      ctx.fillRect(0, 0, W, H);

      const zoom = Math.min(W, H) / 16;
      const cx = W / 2, cy = H / 2;
      const toS = (x: number, y: number): [number, number] => [cx + x * zoom, cy - y * zoom];

      const drawTrail = (trail: { x: number; y: number }[], color: string) => {
        for (let i = 1; i < trail.length; i++) {
          const alpha = (i / trail.length) * 0.6;
          const [x0, y0] = toS(trail[i - 1].x, trail[i - 1].y);
          const [x1, y1] = toS(trail[i].x, trail[i].y);
          ctx.strokeStyle = color.replace("A", alpha.toFixed(2));
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
      };
      drawTrail(trail1, "rgba(124,92,255,A)");
      drawTrail(trail2, "rgba(0,229,199,A)");

      const [s1x, s1y] = toS(state.y[0], state.y[1]);
      const [s2x, s2y] = toS(state.y[4], state.y[5]);
      ctx.fillStyle = "#7c5cff";
      ctx.beginPath();
      ctx.arc(s1x, s1y, Math.max(4, Math.cbrt(preset.params.m1) * 0.7), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#00e5c7";
      ctx.beginPath();
      ctx.arc(s2x, s2y, Math.max(2.5, Math.cbrt(preset.params.m2) * 0.7), 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [presetId]);

  return <canvas ref={ref} className="w-full h-full" />;
}

export function MiniProjectilePreview({ presetId }: { presetId: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const preset = PROJECTILE_PRESETS.find((p) => p.id === presetId)!;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const angle = (preset.params.angleDeg * Math.PI) / 180;
    let state: ProjectileState = {
      t: 0,
      y: [0, preset.params.launchHeight, preset.params.v0 * Math.cos(angle), preset.params.v0 * Math.sin(angle)],
      landed: false,
    };
    const trail: { x: number; y: number }[] = [];
    let raf = 0;
    let alive = true;
    let resetTimer = 0;

    const draw = () => {
      if (!alive) return;
      if (!state.landed) {
        for (let i = 0; i < 2; i++) {
          const res = stepProjectile(state, preset.params, "rk4", 0.006);
          state = res.state;
        }
        trail.push({ x: state.y[0], y: state.y[1] });
      } else {
        resetTimer++;
        if (resetTimer > 60) {
          state = { t: 0, y: [0, preset.params.launchHeight, preset.params.v0 * Math.cos(angle), preset.params.v0 * Math.sin(angle)], landed: false };
          trail.length = 0;
          resetTimer = 0;
        }
      }

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = rect.width, H = rect.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0a0d14";
      ctx.fillRect(0, 0, W, H);

      const maxX = Math.max(preset.params.v0 * 5, 30);
      const maxY = Math.max(preset.params.v0 * 2, 30);
      const padB = 16;
      const sx = (x: number) => 10 + (x / maxX) * (W - 20);
      const sy = (y: number) => H - padB - (y / maxY) * (H - padB - 10);

      ctx.strokeStyle = "rgba(148,163,184,0.35)";
      ctx.beginPath();
      ctx.moveTo(0, sy(0));
      ctx.lineTo(W, sy(0));
      ctx.stroke();

      if (trail.length > 1) {
        ctx.strokeStyle = "#00e5c7";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        trail.forEach((p, i) => {
          const X = sx(p.x), Y = sy(Math.max(0, p.y));
          if (i === 0) ctx.moveTo(X, Y);
          else ctx.lineTo(X, Y);
        });
        ctx.stroke();
      }

      const cx = sx(state.y[0]), cy = sy(Math.max(0, state.y[1]));
      ctx.fillStyle = "#e7ecf5";
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [presetId]);

  return <canvas ref={ref} className="w-full h-full" />;
}
