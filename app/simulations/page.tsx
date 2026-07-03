import { Orbit, Waves } from "lucide-react";
import FeatureCard from "@/components/home/FeatureCard";

export default function SimulationsIndex() {
  return (
    <div className="mx-auto max-w-5xl px-5 md:px-8 py-16">
      <div className="text-[11px] uppercase tracking-[0.14em] text-ink-faint font-mono mb-3">Simulations</div>
      <h1 className="font-display text-[32px] font-semibold text-ink mb-3">Choose a laboratory</h1>
      <p className="text-[14px] text-ink-dim max-w-lg mb-10">
        Both simulators share the same numerical core — pick whichever system you want to perturb.
      </p>
      <div className="grid md:grid-cols-2 gap-5">
        <FeatureCard
          icon={<Orbit className="h-5 w-5 text-gravity" />}
          title="Two-Body Gravitational Simulator"
          description="Circular, elliptical, and hyperbolic orbits, binary systems, and collisions, with an energy-conservation monitor across five integrators."
          href="/simulations/two-body"
          accent="gravity"
        />
        <FeatureCard
          icon={<Waves className="h-5 w-5 text-kinetic" />}
          title="Projectile Motion Simulator"
          description="Vacuum, linear-drag, and quadratic-drag trajectories with wind, elevation, and ten synchronized live graphs."
          href="/simulations/projectile"
          accent="kinetic"
        />
      </div>
    </div>
  );
}
