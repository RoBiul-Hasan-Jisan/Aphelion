import ProjectileSimulator from "@/components/simulators/ProjectileSimulator";
import { LearnPanel } from "@/components/docs/LearnPanel";

export const metadata = {
  title: "Projectile Simulator — Aphelion",
};

export default function ProjectilePage() {
  return (
    <div className="mx-auto max-w-[1600px] px-5 md:px-8 py-8 md:py-10">
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.14em] text-ink-faint font-mono mb-2">Simulation · Kinematics</div>
        <h1 className="font-display text-[26px] md:text-[30px] font-semibold text-ink">Projectile Motion Simulator</h1>
        <p className="text-[13.5px] text-ink-dim mt-1.5 max-w-2xl">
          The dashed line is the closed-form vacuum solution — everything else is numerically integrated live.
        </p>
      </div>
      <ProjectileSimulator />
      <div className="mt-6">
        <LearnPanel
          title="Learning Mode — Reading the trajectory"
          docsAnchor="projectile"
          formulas={[
            { label: "Vacuum range", formula: "R = v₀²sin(2θ) / g" },
            { label: "Quadratic drag force", formula: "F = ½ρ·Cd·A·|v|·v" },
            { label: "Linear drag force", formula: "F = −k·v" },
            { label: "Total mechanical energy", formula: "E = ½mv² + mgh" },
          ]}
        />
      </div>
    </div>
  );
}
