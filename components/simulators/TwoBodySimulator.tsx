"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  TwoBodyParams,
  TwoBodyState,
  TWO_BODY_PRESETS,
  stepTwoBody,
  deriveQuantities,
} from "@/lib/physics/twoBody";
import { IntegratorId, INTEGRATOR_META } from "@/lib/physics/integrators";
import { Panel, Readout, Badge } from "@/components/ui/Panel";
import { Slider, Segmented, Toggle } from "@/components/ui/Slider";
import { Play, Pause, RotateCcw, StepForward, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

const METHODS: { id: IntegratorId; label: string }[] = [
  { id: "velocity-verlet", label: "Verlet" },
  { id: "semi-implicit-euler", label: "Semi-Implicit Euler" },
  { id: "rk4", label: "RK4" },
  { id: "rk45", label: "RK45 (Adaptive)" },
  { id: "explicit-euler", label: "Explicit Euler" },
];

interface ViewOptions {
  trails: boolean;
  velocityVectors: boolean;
  accelVectors: boolean;
  forceVectors: boolean;
  centerOfMass: boolean;
  focus: boolean;
  grid: boolean;
  fieldLines: boolean;
  predicted: boolean;
}

const DEFAULT_VIEW: ViewOptions = {
  trails: true,
  velocityVectors: true,
  accelVectors: false,
  forceVectors: true,
  centerOfMass: true,
  focus: false,
  grid: true,
  fieldLines: false,
  predicted: false,
};

const TRAIL_MAX = 1400;

export default function TwoBodySimulator() {
  const [presetId, setPresetId] = useState(TWO_BODY_PRESETS[0].id);
  const preset = useMemo(() => TWO_BODY_PRESETS.find((p) => p.id === presetId)!, [presetId]);

  const [params, setParams] = useState<TwoBodyParams>(preset.params);
  const [method, setMethod] = useState<IntegratorId>("velocity-verlet");
  const [timeScale, setTimeScale] = useState(1);
  const [baseDt, setBaseDt] = useState(0.006);
  const [running, setRunning] = useState(true);
  const [view, setView] = useState<ViewOptions>(DEFAULT_VIEW);
  const [initialEnergy, setInitialEnergy] = useState<number | null>(null);
  const [energyError, setEnergyError] = useState(0);
  const [rk45Error, setRk45Error] = useState(0);
  const [frameStep, setFrameStep] = useState(false);

  const stateRef = useRef<TwoBodyState>({ t: 0, y: preset.initial.slice(), merged: false });
  const trail1 = useRef<{ x: number; y: number }[]>([]);
  const trail2 = useRef<{ x: number; y: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef({ x: 0, y: 0, zoom: 55 });
  const dragRef = useRef<{ dragging: boolean; lastX: number; lastY: number }>({ dragging: false, lastX: 0, lastY: 0 });
  const [, forceRender] = useState(0);
  const rafRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    stateRef.current = { t: 0, y: preset.initial.slice(), merged: false };
    trail1.current = [];
    trail2.current = [];
    const q = deriveQuantities(stateRef.current, params);
    setInitialEnergy(q.totalEnergy);
    setEnergyError(0);
    cameraRef.current = { x: 0, y: 0, zoom: 55 };
    forceRender((v) => v + 1);
  }, [preset, params]);

  useEffect(() => {
    setParams(preset.params);
    stateRef.current = { t: 0, y: preset.initial.slice(), merged: false };
    trail1.current = [];
    trail2.current = [];
    const q = deriveQuantities(stateRef.current, preset.params);
    setInitialEnergy(q.totalEnergy);
    setEnergyError(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId]);

  // Simulation + render loop
  useEffect(() => {
    let alive = true;
    const loop = () => {
      if (!alive) return;
      const canvas = canvasRef.current;
      if (canvas) {
        if (running || frameStep) {
          const substeps = Math.max(1, Math.round(timeScale * 6));
          const dt = baseDt;
          for (let i = 0; i < substeps; i++) {
            if (stateRef.current.merged) break;
            const res = stepTwoBody(stateRef.current, params, method, dt);
            stateRef.current = res.state;
            if (res.error !== undefined) setRk45Error(res.error);
          }
          if (frameStep) setFrameStep(false);

          trail1.current.push({ x: stateRef.current.y[0], y: stateRef.current.y[1] });
          trail2.current.push({ x: stateRef.current.y[4], y: stateRef.current.y[5] });
          if (trail1.current.length > TRAIL_MAX) trail1.current.shift();
          if (trail2.current.length > TRAIL_MAX) trail2.current.shift();

          if (initialEnergy !== null) {
            const q = deriveQuantities(stateRef.current, params);
            const err = Math.abs((q.totalEnergy - initialEnergy) / (Math.abs(initialEnergy) || 1)) * 100;
            setEnergyError(err);
          }
        }
        render(canvas);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, params, method, timeScale, baseDt, frameStep, initialEnergy, view]);

  const render = (canvas: HTMLCanvasElement) => {
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = rect.width;
    const H = rect.height;
    ctx.clearRect(0, 0, W, H);

    const cam = cameraRef.current;
    const q = deriveQuantities(stateRef.current, params);
    if (view.focus) {
      cam.x = q.centerOfMass[0];
      cam.y = q.centerOfMass[1];
    }
    const toScreen = (x: number, y: number): [number, number] => [
      W / 2 + (x - cam.x) * cam.zoom,
      H / 2 - (y - cam.y) * cam.zoom,
    ];

    // Background
    ctx.fillStyle = "#0a0d14";
    ctx.fillRect(0, 0, W, H);

    if (view.grid) {
      ctx.strokeStyle = "rgba(148,163,184,0.08)";
      ctx.lineWidth = 1;
      const step = cam.zoom;
      const offX = (W / 2 - cam.x * cam.zoom) % step;
      const offY = (H / 2 + cam.y * cam.zoom) % step;
      for (let x = offX; x < W; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = offY; y < H; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    }

    if (view.fieldLines) {
      ctx.strokeStyle = "rgba(124,92,255,0.18)";
      ctx.lineWidth = 1;
      const [fx, fy] = toScreen(q.r1[0], q.r1[1]);
      for (let ring = 1; ring <= 6; ring++) {
        ctx.beginPath();
        ctx.arc(fx, fy, ring * cam.zoom * 0.9, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Trails
    const drawTrail = (trail: { x: number; y: number }[], color: string) => {
      if (trail.length < 2) return;
      for (let i = 1; i < trail.length; i++) {
        const alpha = i / trail.length;
        const [x0, y0] = toScreen(trail[i - 1].x, trail[i - 1].y);
        const [x1, y1] = toScreen(trail[i].x, trail[i].y);
        ctx.strokeStyle = color.replace("ALPHA", (alpha * 0.85).toFixed(2));
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
    };
    if (view.trails) {
      drawTrail(trail1.current, "rgba(124,92,255,ALPHA)");
      drawTrail(trail2.current, "rgba(0,229,199,ALPHA)");
    }

    // Center of mass
    if (view.centerOfMass) {
      const [cx, cy] = toScreen(q.centerOfMass[0], q.centerOfMass[1]);
      ctx.strokeStyle = "#ffb020";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 7, cy);
      ctx.lineTo(cx + 7, cy);
      ctx.moveTo(cx, cy - 7);
      ctx.lineTo(cx, cy + 7);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.stroke();
    }

    const arrow = (x0: number, y0: number, x1: number, y1: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      const angle = Math.atan2(y1 - y0, x1 - x0);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - 7 * Math.cos(angle - 0.4), y1 - 7 * Math.sin(angle - 0.4));
      ctx.lineTo(x1 - 7 * Math.cos(angle + 0.4), y1 - 7 * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fill();
    };

    // Bodies + vectors
    const drawBody = (
      pos: [number, number],
      vel: [number, number],
      acc: [number, number],
      radius: number,
      color: string,
      massLabel: string
    ) => {
      const [sx, sy] = toScreen(pos[0], pos[1]);
      const screenR = Math.max(4, radius * cam.zoom);

      if (view.velocityVectors) {
        const scale = 12;
        arrow(sx, sy, sx + vel[0] * scale, sy - vel[1] * scale, "#00e5c7");
      }
      if (view.accelVectors) {
        const scale = 40;
        arrow(sx, sy, sx + acc[0] * scale, sy - acc[1] * scale, "#ff5470");
      }
      if (view.forceVectors && !view.accelVectors) {
        const scale = 40;
        arrow(sx, sy, sx + acc[0] * scale, sy - acc[1] * scale, "rgba(255,176,32,0.85)");
      }

      const grad = ctx.createRadialGradient(sx - screenR * 0.3, sy - screenR * 0.3, 0, sx, sy, screenR);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.35, color);
      grad.addColorStop(1, color);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, screenR, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "10px var(--font-jetbrains), monospace";
      ctx.fillStyle = "rgba(231,236,245,0.55)";
      ctx.fillText(massLabel, sx + screenR + 5, sy + 3);
    };

    drawBody(q.r1, q.v1, q.accel1, Math.cbrt(params.m1) * 0.045, "#7c5cff", `m₁ = ${params.m1}`);
    drawBody(q.r2, q.v2, q.accel2, Math.cbrt(params.m2) * 0.045, "#00e5c7", `m₂ = ${params.m2}`);
  };

  // Pointer interactions: drag to pan, wheel to zoom
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const cam = cameraRef.current;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    cam.zoom = Math.min(400, Math.max(6, cam.zoom * factor));
  };
  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    const cam = cameraRef.current;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    cam.x -= dx / cam.zoom;
    cam.y += dy / cam.zoom;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
  };
  const endDrag = () => (dragRef.current.dragging = false);

  const q = deriveQuantities(stateRef.current, params);
  const methodMeta = INTEGRATOR_META[method];

  const fmt = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : "—");

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
      {/* Canvas + top controls */}
      <div className="flex flex-col gap-4 min-w-0">
        <Panel className="p-4">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap gap-2">
              {TWO_BODY_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPresetId(p.id)}
                  className={`px-3 py-1.5 rounded-full text-[11.5px] font-medium border transition-colors ${
                    presetId === p.id
                      ? "bg-panel-raised text-ink border-line-bright"
                      : "text-ink-dim border-transparent hover:text-ink"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[12px] text-ink-faint mt-2">{preset.description}</p>
        </Panel>

        <div className="relative rounded-2xl overflow-hidden panel panel-glow">
          <canvas
            ref={canvasRef}
            className="w-full h-[480px] md:h-[560px] cursor-grab active:cursor-grabbing touch-none"
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
          />
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge tone={q.orbitClass === "collision" ? "danger" : "default"}>{q.orbitClass}</Badge>
            {stateRef.current.merged && <Badge tone="danger">Merged</Badge>}
          </div>
          <div className="absolute top-3 right-3 flex gap-1.5">
            <button onClick={() => (cameraRef.current.zoom *= 1.2)} className="p-1.5 rounded-lg bg-panel border border-line text-ink-dim hover:text-ink" aria-label="Zoom in">
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => (cameraRef.current.zoom /= 1.2)} className="p-1.5 rounded-lg bg-panel border border-line text-ink-dim hover:text-ink" aria-label="Zoom out">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => (cameraRef.current = { x: 0, y: 0, zoom: 55 })} className="p-1.5 rounded-lg bg-panel border border-line text-ink-dim hover:text-ink" aria-label="Recenter">
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRunning((r) => !r)}
                className="p-2 rounded-full bg-kinetic text-void hover:brightness-110 transition"
                aria-label={running ? "Pause" : "Play"}
              >
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button onClick={() => setFrameStep(true)} className="p-2 rounded-full bg-panel border border-line text-ink-dim hover:text-ink" aria-label="Step frame">
                <StepForward className="h-4 w-4" />
              </button>
              <button onClick={reset} className="p-2 rounded-full bg-panel border border-line text-ink-dim hover:text-ink" aria-label="Reset">
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
            <div className="tabular text-[11px] text-ink-dim bg-panel/80 backdrop-blur px-2.5 py-1 rounded-full border border-line">
              t = {fmt(stateRef.current.t, 2)}s
            </div>
          </div>
        </div>

        <Panel title="Integration Method" eyebrow="Numerical Scheme">
          <div className="p-4 space-y-3">
            <Segmented options={METHODS} value={method} onChange={setMethod} />
            <p className="text-[12px] text-ink-faint leading-relaxed">{methodMeta.description}</p>
            <div className="flex gap-2 flex-wrap">
              <Badge tone="kinetic">order {methodMeta.order}</Badge>
              <Badge tone={methodMeta.symplectic ? "kinetic" : "energy"}>{methodMeta.symplectic ? "symplectic" : "non-symplectic"}</Badge>
              {methodMeta.adaptive && <Badge tone="gravity">adaptive step</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-x-4 pt-1">
              <Slider label="Time Scale" value={timeScale} min={0.1} max={4} step={0.1} onChange={setTimeScale} />
              <Slider label="Base dt" value={baseDt} min={0.001} max={0.02} step={0.001} format={(v) => v.toFixed(3)} onChange={setBaseDt} />
            </div>
          </div>
        </Panel>
      </div>

      {/* Right dashboard */}
      <div className="flex flex-col gap-4">
        <Panel title="Live Physics Dashboard" eyebrow="Telemetry">
          <div className="p-4 grid grid-cols-1 gap-x-4">
            <Readout label="Position (m₁)" value={`${fmt(q.r1[0])}, ${fmt(q.r1[1])}`} />
            <Readout label="Position (m₂)" value={`${fmt(q.r2[0])}, ${fmt(q.r2[1])}`} />
            <Readout label="Separation" value={fmt(q.separation)} unit="m" />
            <Readout label="Relative Speed" value={fmt(q.relSpeed)} unit="m/s" accent="kinetic" />
            <Readout label="Kinetic Energy" value={fmt(q.kineticEnergy)} unit="J" accent="kinetic" />
            <Readout label="Potential Energy" value={fmt(q.potentialEnergy)} unit="J" accent="gravity" />
            <Readout label="Total Energy" value={fmt(q.totalEnergy)} unit="J" />
            <Readout label="Angular Momentum" value={fmt(q.angularMomentum)} unit="m²/s" />
            <Readout label="Eccentricity" value={fmt(q.eccentricity)} />
            <Readout
              label="Orbital Period"
              value={q.orbitalPeriod ? fmt(q.orbitalPeriod, 2) : "open orbit"}
              unit={q.orbitalPeriod ? "s" : undefined}
            />
            <Readout label="Escape Velocity" value={fmt(q.escapeVelocity)} unit="m/s" />
            <Readout label="Sim Time" value={fmt(stateRef.current.t, 2)} unit="s" />
          </div>
        </Panel>

        <Panel title="Energy Conservation Monitor" eyebrow="Numerical Error">
          <div className="p-4 space-y-2">
            <Readout
              label="Drift from t=0"
              value={fmt(energyError, 4)}
              unit="%"
              accent={energyError > 1 ? "danger" : energyError > 0.05 ? "energy" : "kinetic"}
            />
            {method === "rk45" && <Readout label="Local Step Error" value={rk45Error.toExponential(2)} accent="gravity" />}
            <div className="h-1.5 rounded-full bg-void overflow-hidden border border-line">
              <div
                className={`h-full transition-all ${energyError > 1 ? "bg-danger" : energyError > 0.05 ? "bg-energy" : "bg-kinetic"}`}
                style={{ width: `${Math.min(100, energyError * 8)}%` }}
              />
            </div>
            <p className="text-[11px] text-ink-faint pt-1">
              Symplectic methods (Verlet, Semi-Implicit Euler) keep this bounded and oscillating.
              Non-symplectic methods (Euler, RK4) tend to drift steadily over long runs.
            </p>
          </div>
        </Panel>

        <Panel title="View & Overlays" eyebrow="Display">
          <div className="p-4 divide-y divide-line/60">
            <Toggle label="Motion trails" checked={view.trails} onChange={(v) => setView((s) => ({ ...s, trails: v }))} />
            <Toggle label="Velocity vectors" checked={view.velocityVectors} onChange={(v) => setView((s) => ({ ...s, velocityVectors: v }))} />
            <Toggle label="Acceleration vectors" checked={view.accelVectors} onChange={(v) => setView((s) => ({ ...s, accelVectors: v }))} />
            <Toggle label="Force vectors" checked={view.forceVectors} onChange={(v) => setView((s) => ({ ...s, forceVectors: v }))} />
            <Toggle label="Center of mass" checked={view.centerOfMass} onChange={(v) => setView((s) => ({ ...s, centerOfMass: v }))} />
            <Toggle label="Camera follow (COM)" checked={view.focus} onChange={(v) => setView((s) => ({ ...s, focus: v }))} />
            <Toggle label="Coordinate grid" checked={view.grid} onChange={(v) => setView((s) => ({ ...s, grid: v }))} />
            <Toggle label="Field lines" checked={view.fieldLines} onChange={(v) => setView((s) => ({ ...s, fieldLines: v }))} />
          </div>
        </Panel>

        <Panel title="System Parameters" eyebrow="Configuration">
          <div className="p-4">
            <Slider label="Gravitational constant G" value={params.G} min={0.1} max={5} step={0.05} onChange={(v) => setParams((p) => ({ ...p, G: v }))} />
            <Slider label="Mass m₁" value={params.m1} min={1} max={200} step={1} onChange={(v) => setParams((p) => ({ ...p, m1: v }))} />
            <Slider label="Mass m₂" value={params.m2} min={1} max={200} step={1} onChange={(v) => setParams((p) => ({ ...p, m2: v }))} />
            <Slider label="Softening length" value={params.softening} min={0} max={0.3} step={0.01} onChange={(v) => setParams((p) => ({ ...p, softening: v }))} />
            <Slider label="Restitution" value={params.restitution} min={0} max={1} step={0.05} onChange={(v) => setParams((p) => ({ ...p, restitution: v }))} />
            <Toggle label="Collisions enabled" checked={params.collisionsEnabled} onChange={(v) => setParams((p) => ({ ...p, collisionsEnabled: v }))} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
