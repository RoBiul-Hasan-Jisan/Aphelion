"use client";

import { useMemo, useState } from "react";
import { TWO_BODY_PRESETS, stepTwoBody, deriveQuantities, TwoBodyState } from "@/lib/physics/twoBody";
import { IntegratorId, INTEGRATOR_META } from "@/lib/physics/integrators";
import { Panel, Badge } from "@/components/ui/Panel";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const METHODS: IntegratorId[] = ["explicit-euler", "semi-implicit-euler", "velocity-verlet", "rk4", "rk45"];
const COLORS: Record<IntegratorId, string> = {
  "explicit-euler": "#ff5470",
  "semi-implicit-euler": "#00e5c7",
  "velocity-verlet": "#7c5cff",
  rk4: "#ffb020",
  rk45: "#5aa9ff",
  "improved-euler": "#c084fc",
};

function runBatch(presetId: string, steps: number, dt: number) {
  const preset = TWO_BODY_PRESETS.find((p) => p.id === presetId)!;
  const results: Record<string, { t: number; error: number }[]> = {};
  const timings: Record<string, number> = {};

  for (const method of METHODS) {
    let state: TwoBodyState = { t: 0, y: preset.initial.slice(), merged: false };
    const q0 = deriveQuantities(state, preset.params);
    const e0 = q0.totalEnergy;
    const series: { t: number; error: number }[] = [];
    const start = performance.now();
    for (let i = 0; i < steps; i++) {
      const res = stepTwoBody(state, preset.params, method, dt);
      state = res.state;
      if (i % 10 === 0) {
        const q = deriveQuantities(state, preset.params);
        const err = Math.abs((q.totalEnergy - e0) / (Math.abs(e0) || 1)) * 100;
        series.push({ t: state.t, error: Math.min(err, 500) });
      }
      if (state.merged) break;
    }
    timings[method] = performance.now() - start;
    results[method] = series;
  }
  return { results, timings };
}

export default function IntegratorComparison() {
  const [presetId, setPresetId] = useState(TWO_BODY_PRESETS[0].id);
  const { results, timings } = useMemo(() => runBatch(presetId, 4000, 0.006), [presetId]);

  // Merge into a single array keyed by index for the chart
  const chartData = useMemo(() => {
    const len = Math.max(...METHODS.map((m) => results[m]?.length ?? 0));
    const rows: Record<string, number>[] = [];
    for (let i = 0; i < len; i++) {
      const row: Record<string, number> = { t: results[METHODS[0]]?.[i]?.t ?? i };
      for (const m of METHODS) {
        if (results[m][i]) row[m] = results[m][i].error;
      }
      rows.push(row);
    }
    return rows;
  }, [results]);

  return (
    <div className="space-y-6">
      <Panel className="p-4">
        <div className="flex flex-wrap gap-2">
          {TWO_BODY_PRESETS.map((p) => (
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
      </Panel>

      <Panel title="Energy Drift Over 4,000 Steps" eyebrow="Same initial conditions, five methods">
        <div className="p-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
              <XAxis dataKey="t" stroke="#56607a" fontSize={10} tickFormatter={(v) => v.toFixed(0)} />
              <YAxis stroke="#56607a" fontSize={10} width={54} tickFormatter={(v) => v.toFixed(1) + "%"} />
              <Tooltip
                contentStyle={{ background: "#10141d", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 8, fontSize: 11 }}
                formatter={(v, name) => [Number(v).toFixed(4) + "%", INTEGRATOR_META[name as IntegratorId].label]}
                labelFormatter={(v) => `t = ${Number(v).toFixed(1)}s`}
              />
              <Legend
                formatter={(value) => INTEGRATOR_META[value as IntegratorId].label}
                wrapperStyle={{ fontSize: 11 }}
              />
              {METHODS.map((m) => (
                <Line key={m} type="monotone" dataKey={m} stroke={COLORS[m]} dot={false} strokeWidth={1.75} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="px-4 pb-4 text-[11.5px] text-ink-faint">
          Y-axis is percent drift in total mechanical energy from its initial value — the standard proxy for numerical error in conservative systems.
          Watch Explicit Euler climb steadily while Verlet and Semi-Implicit Euler stay bounded despite being lower order.
        </p>
      </Panel>

      <Panel title="Method Characteristics" eyebrow="Accuracy · Cost · Stability">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-ink-faint text-left">
                <th className="px-4 py-2.5 font-medium">Method</th>
                <th className="px-4 py-2.5 font-medium">Order</th>
                <th className="px-4 py-2.5 font-medium">Symplectic</th>
                <th className="px-4 py-2.5 font-medium">Adaptive</th>
                <th className="px-4 py-2.5 font-medium">4,000-step time</th>
                <th className="px-4 py-2.5 font-medium">Final drift</th>
              </tr>
            </thead>
            <tbody>
              {METHODS.map((m) => {
                const meta = INTEGRATOR_META[m];
                const series = results[m];
                const finalErr = series?.[series.length - 1]?.error ?? 0;
                return (
                  <tr key={m} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-ink flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: COLORS[m] }} />
                      {meta.label}
                    </td>
                    <td className="px-4 py-2.5 text-ink-dim tabular">{meta.order}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={meta.symplectic ? "kinetic" : "default"}>{meta.symplectic ? "yes" : "no"}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={meta.adaptive ? "gravity" : "default"}>{meta.adaptive ? "yes" : "no"}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-ink-dim tabular">{timings[m]?.toFixed(1)} ms</td>
                    <td className="px-4 py-2.5 tabular">
                      <span className={finalErr > 5 ? "text-danger" : finalErr > 0.1 ? "text-energy" : "text-kinetic"}>
                        {finalErr.toFixed(3)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
