"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  ProjectileParams,
  ProjectileState,
  PROJECTILE_PRESETS,
  DragModel,
  stepProjectile,
  deriveProjectile,
  vacuumTrajectory,
} from "@/lib/physics/projectile";
import { IntegratorId, INTEGRATOR_META } from "@/lib/physics/integrators";
import { Panel, Readout, Badge } from "@/components/ui/Panel";
import { Slider, Segmented } from "@/components/ui/Slider";
import { Play, Pause, RotateCcw } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const METHODS: { id: IntegratorId; label: string }[] = [
  { id: "rk4", label: "RK4" },
  { id: "rk45", label: "RK45 (Adaptive)" },
  { id: "improved-euler", label: "Improved Euler" },
  { id: "explicit-euler", label: "Euler" },
];

const DRAG_MODELS: { id: DragModel; label: string }[] = [
  { id: "vacuum", label: "Vacuum" },
  { id: "linear", label: "Linear Drag" },
  { id: "quadratic", label: "Quadratic Drag" },
];

interface Sample {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  ax: number;
  ay: number;
  drag: number;
  ke: number;
  pe: number;
  te: number;
}

const GRAPHS: { key: keyof Sample | "vx" | "vy"; label: string; color: string; unit: string }[] = [
  { key: "y", label: "Height vs Time", color: "#7c5cff", unit: "m" },
  { key: "x", label: "Range vs Time", color: "#00e5c7", unit: "m" },
  { key: "speed", label: "Speed vs Time", color: "#ffb020", unit: "m/s" },
  { key: "vx", label: "Horizontal Velocity", color: "#00e5c7", unit: "m/s" },
  { key: "vy", label: "Vertical Velocity", color: "#7c5cff", unit: "m/s" },
  { key: "drag", label: "Drag Force", color: "#ff5470", unit: "N" },
  { key: "ke", label: "Kinetic Energy", color: "#00e5c7", unit: "J" },
  { key: "pe", label: "Potential Energy", color: "#7c5cff", unit: "J" },
  { key: "te", label: "Total Mechanical Energy", color: "#ffb020", unit: "J" },
];

// Custom Toggle component that works reliably
const ToggleSwitch = ({ 
  label, 
  checked, 
  onChange 
}: { 
  label: string; 
  checked: boolean; 
  onChange: (checked: boolean) => void;
}) => {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[13px] text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-5 w-10 items-center rounded-full transition-colors
          ${checked ? 'bg-kinetic' : 'bg-line'}
          focus:outline-none focus:ring-2 focus:ring-kinetic/50
        `}
      >
        <span
          className={`
            inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform
            ${checked ? 'translate-x-5' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
};

export default function ProjectileSimulator() {
  const [presetId, setPresetId] = useState(PROJECTILE_PRESETS[0].id);
  const preset = useMemo(() => PROJECTILE_PRESETS.find((p) => p.id === presetId)!, [presetId]);
  const [params, setParams] = useState<ProjectileParams>(preset.params);
  const [method, setMethod] = useState<IntegratorId>("rk4");
  const [running, setRunning] = useState(true);
  const [showVacuumOverlay, setShowVacuumOverlay] = useState(true);
  const [selectedGraph, setSelectedGraph] = useState<(typeof GRAPHS)[number]["key"]>("y");
  const [, forceUpdate] = useState(0);

  const initialState = (): ProjectileState => {
    const angle = (params.angleDeg * Math.PI) / 180;
    return { t: 0, y: [0, params.launchHeight, params.v0 * Math.cos(angle), params.v0 * Math.sin(angle)], landed: false };
  };

  const stateRef = useRef<ProjectileState>(initialState());
  // Use a simple variable outside React's scope
  const historyData = useRef<Sample[]>([]);
  const maxHeightRef = useRef(params.launchHeight);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const frameCounterRef = useRef(0);

  const sampleFrom = (state: ProjectileState): Sample => {
    const d = deriveProjectile(state, params);
    return {
      t: state.t,
      x: d.position[0],
      y: d.position[1],
      vx: d.velocity[0],
      vy: d.velocity[1],
      speed: d.speed,
      ax: d.acceleration[0],
      ay: d.acceleration[1],
      drag: d.dragMag,
      ke: d.kineticEnergy,
      pe: d.potentialEnergy,
      te: d.totalEnergy,
    };
  };

  const reset = useCallback(() => {
    stateRef.current = initialState();
    // Create a new array reference
    historyData.current = [sampleFrom(stateRef.current)];
    maxHeightRef.current = params.launchHeight;
    frameCounterRef.current = 0;
    forceUpdate((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    setParams(preset.params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId]);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, method]);

  const vacuum = useMemo(() => vacuumTrajectory(params), [params]);

  useEffect(() => {
    let alive = true;
    let acc = 0;
    let last = performance.now();
    const dt = 0.004;
    const loop = (now: number) => {
      if (!alive) return;
      const elapsed = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (running && !stateRef.current.landed) {
        acc += elapsed;
        let steps = 0;
        while (acc > dt && steps < 60) {
          const res = stepProjectile(stateRef.current, params, method, dt);
          stateRef.current = res.state;
          acc -= dt;
          steps++;
          maxHeightRef.current = Math.max(maxHeightRef.current, stateRef.current.y[1]);
          if (Math.floor(stateRef.current.t / 0.02) !== Math.floor((stateRef.current.t - dt) / 0.02)) {
            // FIX: Create a new array instead of mutating
            const newSample = sampleFrom(stateRef.current);
            const currentHistory = historyData.current;
            const newHistory = [...currentHistory, newSample];
            if (newHistory.length > 600) {
              newHistory.shift();
            }
            historyData.current = newHistory;
            
            // Only update state occasionally to avoid performance issues
            frameCounterRef.current++;
            if (frameCounterRef.current % 2 === 0) {
              forceUpdate((v) => v + 1);
            }
          }
          if (stateRef.current.landed) break;
        }
      }
      const canvas = canvasRef.current;
      if (canvas) renderCanvas(canvas);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, params, method]);

  const renderCanvas = (canvas: HTMLCanvasElement) => {
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
    ctx.fillStyle = "#0a0d14";
    ctx.fillRect(0, 0, W, H);

    const maxRange = Math.max(vacuum.range * 1.15, stateRef.current.y[0] * 1.15, 10);
    const maxH = Math.max(vacuum.maxHeight * 1.3, maxHeightRef.current * 1.3, 10);
    const padL = 50, padB = 36, padT = 20, padR = 20;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const sx = (x: number) => padL + (x / maxRange) * plotW;
    const sy = (y: number) => H - padB - (y / maxH) * plotH;

    // grid
    ctx.strokeStyle = "rgba(148,163,184,0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const gx = padL + (i / 6) * plotW;
      ctx.beginPath();
      ctx.moveTo(gx, padT);
      ctx.lineTo(gx, H - padB);
      ctx.stroke();
    }
    for (let i = 0; i <= 4; i++) {
      const gy = padT + (i / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(W - padR, gy);
      ctx.stroke();
    }
    // ground
    ctx.strokeStyle = "rgba(148,163,184,0.35)";
    ctx.beginPath();
    ctx.moveTo(padL, sy(0));
    ctx.lineTo(W - padR, sy(0));
    ctx.stroke();

    // axis labels
    ctx.fillStyle = "rgba(139,150,171,0.8)";
    ctx.font = "10px var(--font-jetbrains), monospace";
    ctx.fillText("0", padL - 4, sy(0) + 14);
    ctx.fillText(maxRange.toFixed(0) + "m", W - padR - 24, H - padB + 14);
    ctx.fillText(maxH.toFixed(0) + "m", 4, padT + 8);

    // vacuum overlay
    if (showVacuumOverlay) {
      ctx.strokeStyle = "rgba(148,163,184,0.5)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      vacuum.points.forEach((p, i) => {
        const X = sx(p.x), Y = sy(Math.max(0, p.y));
        if (i === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // trajectory
    const hist = historyData.current;
    if (hist.length > 1) {
      ctx.strokeStyle = "#00e5c7";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      hist.forEach((p, i) => {
        const X = sx(p.x), Y = sy(Math.max(0, p.y));
        if (i === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      });
      ctx.stroke();
    }

    const cur = stateRef.current;
    const d = deriveProjectile(cur, params);
    const cx = sx(cur.y[0]), cy = sy(Math.max(0, cur.y[1]));

    // velocity vector
    const vscale = 2.2;
    ctx.strokeStyle = "#7c5cff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + d.velocity[0] * vscale, cy - d.velocity[1] * vscale);
    ctx.stroke();

    // drag vector
    if (params.dragModel !== "vacuum") {
      const dscale = 4;
      ctx.strokeStyle = "#ff5470";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + d.dragForce[0] * dscale, cy - d.dragForce[1] * dscale);
      ctx.stroke();
    }

    // apex marker
    const apexSample = hist.reduce((a, b) => (b.y > a.y ? b : a), hist[0] ?? sampleFrom(cur));
    if (apexSample) {
      const ax = sx(apexSample.x), ay = sy(apexSample.y);
      ctx.strokeStyle = "rgba(255,176,32,0.7)";
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax, sy(0));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffb020";
      ctx.beginPath();
      ctx.arc(ax, ay, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // projectile
    ctx.fillStyle = "#e7ecf5";
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#00e5c7";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (cur.landed) {
      ctx.fillStyle = "rgba(0,229,199,0.9)";
      ctx.beginPath();
      ctx.moveTo(cx, sy(0) - 10);
      ctx.lineTo(cx - 5, sy(0));
      ctx.lineTo(cx + 5, sy(0));
      ctx.closePath();
      ctx.fill();
    }
  };

  const d = deriveProjectile(stateRef.current, params);
  const methodMeta = INTEGRATOR_META[method];
  const fmt = (v: number, dgt = 2) => (Number.isFinite(v) ? v.toFixed(dgt) : "—");
  const graphMeta = GRAPHS.find((g) => g.key === selectedGraph)!;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
      <div className="flex flex-col gap-4 min-w-0">
        <Panel className="p-4">
          <div className="flex flex-wrap gap-2">
            {PROJECTILE_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPresetId(p.id)}
                className={`px-3 py-1.5 rounded-full text-[11.5px] font-medium border transition-colors ${
                  presetId === p.id ? "bg-panel-raised text-ink border-line-bright" : "text-ink-dim border-transparent hover:text-ink"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-ink-faint mt-2">{preset.description}</p>
        </Panel>

        <div className="relative rounded-2xl overflow-hidden panel panel-glow">
          <canvas ref={canvasRef} className="w-full h-[380px] md:h-[420px]" />
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge tone={stateRef.current.landed ? "kinetic" : "default"}>{stateRef.current.landed ? "Landed" : "In Flight"}</Badge>
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setRunning((r) => !r)} className="p-2 rounded-full bg-kinetic text-void hover:brightness-110 transition" aria-label={running ? "Pause" : "Play"}>
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button onClick={reset} className="p-2 rounded-full bg-panel border border-line text-ink-dim hover:text-ink" aria-label="Reset">
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
            <div className="tabular text-[11px] text-ink-dim bg-panel/80 backdrop-blur px-2.5 py-1 rounded-full border border-line">t = {fmt(stateRef.current.t)}s</div>
          </div>
        </div>

        <Panel title="Numerical Solver" eyebrow="Integration Method">
          <div className="p-4 space-y-3">
            <Segmented options={METHODS} value={method} onChange={setMethod} />
            <p className="text-[12px] text-ink-faint leading-relaxed">{methodMeta.description}</p>
            <ToggleSwitch 
              label="Show vacuum reference (dashed)" 
              checked={showVacuumOverlay} 
              onChange={setShowVacuumOverlay} 
            />
          </div>
        </Panel>

        <Panel title="Live Graphs" eyebrow="Synchronized Charts">
          <div className="p-4">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {GRAPHS.map((g) => (
                <button
                  key={g.key}
                  onClick={() => setSelectedGraph(g.key)}
                  className={`px-2.5 py-1 rounded-full text-[10.5px] font-mono border transition-colors ${
                    selectedGraph === g.key ? "bg-panel-raised text-ink border-line-bright" : "text-ink-faint border-transparent hover:text-ink-dim"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData.current} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                  <XAxis dataKey="t" stroke="#56607a" fontSize={10} tickFormatter={(v) => v.toFixed(1)} />
                  <YAxis stroke="#56607a" fontSize={10} width={50} />
                  <Tooltip
                    contentStyle={{ background: "#10141d", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 8, fontSize: 11 }}
                    labelFormatter={(v) => `t = ${Number(v).toFixed(2)}s`}
                    formatter={(v) => [Number(v).toFixed(3) + " " + graphMeta.unit, graphMeta.label]}
                  />
                  <Line type="monotone" dataKey={selectedGraph} stroke={graphMeta.color} dot={false} strokeWidth={2} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Panel>
      </div>

      <div className="flex flex-col gap-4">
        <Panel title="Live Physics Dashboard" eyebrow="Telemetry">
          <div className="p-4">
            <Readout label="Position" value={`${fmt(d.position[0])}, ${fmt(d.position[1])}`} unit="m" />
            <Readout label="Velocity" value={`${fmt(d.velocity[0])}, ${fmt(d.velocity[1])}`} unit="m/s" accent="kinetic" />
            <Readout label="Speed" value={fmt(d.speed)} unit="m/s" accent="kinetic" />
            <Readout label="Acceleration" value={`${fmt(d.acceleration[0])}, ${fmt(d.acceleration[1])}`} unit="m/s²" />
            <Readout label="Drag Force" value={fmt(d.dragMag)} unit="N" accent="danger" />
            <Readout label="Max Height Reached" value={fmt(maxHeightRef.current)} unit="m" accent="gravity" />
            <Readout label="Kinetic Energy" value={fmt(d.kineticEnergy)} unit="J" accent="kinetic" />
            <Readout label="Potential Energy" value={fmt(d.potentialEnergy)} unit="J" accent="gravity" />
            <Readout label="Total Energy" value={fmt(d.totalEnergy)} unit="J" />
            <Readout label="Range (analytic, vacuum)" value={fmt(vacuum.range)} unit="m" />
            <Readout label="Flight Time (analytic)" value={fmt(vacuum.flightTime)} unit="s" />
          </div>
        </Panel>

        <Panel title="Launch Parameters" eyebrow="Configuration">
          <div className="p-4">
            <Slider label="Initial velocity" value={params.v0} min={5} max={120} step={1} unit="m/s" onChange={(v) => setParams((p) => ({ ...p, v0: v }))} />
            <Slider label="Launch angle" value={params.angleDeg} min={0} max={90} step={1} unit="°" onChange={(v) => setParams((p) => ({ ...p, angleDeg: v }))} />
            <Slider label="Mass" value={params.mass} min={0.05} max={20} step={0.05} unit="kg" onChange={(v) => setParams((p) => ({ ...p, mass: v }))} />
            <Slider label="Gravity" value={params.gravity} min={1} max={25} step={0.1} unit="m/s²" onChange={(v) => setParams((p) => ({ ...p, gravity: v }))} />
            <Slider label="Launch height" value={params.launchHeight} min={0} max={80} step={1} unit="m" onChange={(v) => setParams((p) => ({ ...p, launchHeight: v }))} />
          </div>
        </Panel>

        <Panel title="Air & Wind" eyebrow="Drag Model">
          <div className="p-4 space-y-3">
            <Segmented options={DRAG_MODELS} value={params.dragModel} onChange={(v) => setParams((p) => ({ ...p, dragModel: v }))} />
            {params.dragModel !== "vacuum" && (
              <>
                {params.dragModel === "quadratic" && (
                  <>
                    <Slider label="Air density" value={params.airDensity} min={0.1} max={2} step={0.01} unit="kg/m³" onChange={(v) => setParams((p) => ({ ...p, airDensity: v }))} />
                    <Slider label="Cross-section" value={params.crossSection} min={0.001} max={0.3} step={0.001} unit="m²" onChange={(v) => setParams((p) => ({ ...p, crossSection: v }))} />
                  </>
                )}
                <Slider label="Drag coefficient" value={params.dragCoefficient} min={0.01} max={2} step={0.01} onChange={(v) => setParams((p) => ({ ...p, dragCoefficient: v }))} />
              </>
            )}
            <Slider label="Wind speed" value={params.windSpeed} min={0} max={25} step={0.5} unit="m/s" onChange={(v) => setParams((p) => ({ ...p, windSpeed: v }))} />
            <Slider label="Wind direction" value={params.windDeg} min={0} max={360} step={5} unit="°" onChange={(v) => setParams((p) => ({ ...p, windDeg: v }))} />
          </div>
        </Panel>
      </div>
    </div>
  );
}