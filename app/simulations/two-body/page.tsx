import TwoBodySimulator from "@/components/simulators/TwoBodySimulator";
import { LearnPanel } from "@/components/docs/LearnPanel";

export const metadata = {
  title: "Two-Body Simulator — Aphelion",
};

export default function TwoBodyPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-5 md:px-8 py-8 md:py-10">
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.14em] text-ink-faint font-mono mb-2">Simulation · Orbital Mechanics</div>
        <h1 className="font-display text-[26px] md:text-[30px] font-semibold text-ink">Two-Body Gravitational Simulator</h1>
        <p className="text-[13.5px] text-ink-dim mt-1.5 max-w-2xl">
          Drag to pan, scroll to zoom. Switch integrators mid-run and watch the energy monitor react.
        </p>
      </div>
      <TwoBodySimulator />
      <div className="mt-6">
        <LearnPanel
          title="Learning Mode — What the dashboard is showing you"
          docsAnchor="gravitation"
          formulas={[
            { label: "Gravitational force", formula: "F = G·m₁·m₂ / (r² + ε²)" },
            { label: "Total energy (watch this stay flat)", formula: "E = KE + PE" },
            { label: "Orbit type from energy", formula: "ε_orb < 0 → ellipse, = 0 → parabola, > 0 → hyperbola" },
            { label: "Kepler's third law", formula: "T = 2π√(|a|³ / μ)" },
          ]}
        />
      </div>
    </div>
  );
}
