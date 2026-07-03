import Link from "next/link";
import { ArrowRight, Orbit, Waves, GitCompare, BookOpen } from "lucide-react";
import HeroOrbit from "@/components/home/HeroOrbit";
import StatBlock from "@/components/home/StatBlock";
import FeatureCard from "@/components/home/FeatureCard";

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 grid-surface opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_20%,black,transparent)]" />
        <div className="relative mx-auto max-w-7xl px-5 md:px-8 pt-16 pb-20 md:pt-24 md:pb-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-line-bright text-[11px] font-mono text-ink-dim mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-kinetic animate-pulse" />
              6 integrators · 2 simulators · real-time
            </div>
            <h1 className="font-display text-[40px] leading-[1.05] md:text-[56px] font-semibold text-ink mb-5">
              Watch classical mechanics
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-gravity to-kinetic">
                compute itself, live.
              </span>
            </h1>
            <p className="text-[15px] md:text-[16px] text-ink-dim leading-relaxed max-w-lg mb-8">
              Aphelion is a research-grade laboratory for orbital mechanics and projectile motion —
              run the same system through six numerical integrators side by side and watch where
              each one earns its keep, and where it quietly falls apart.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/simulations/two-body"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-ink text-void text-[13px] font-medium hover:bg-white transition-colors"
              >
                Launch Two-Body Simulator <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/simulations/projectile"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-line-bright text-ink text-[13px] font-medium hover:bg-panel-raised transition-colors"
              >
                Launch Projectile Lab
              </Link>
            </div>
          </div>
          <HeroOrbit />
        </div>

        <div className="relative border-t border-line">
          <div className="mx-auto max-w-7xl px-5 md:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatBlock value="6" label="Numerical integrators" />
            <StatBlock value="21" label="Live telemetry readouts" />
            <StatBlock value="60fps" label="Canvas render target" />
            <StatBlock value="10" label="Synchronized live graphs" />
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="mx-auto max-w-7xl px-5 md:px-8 py-20">
        <div className="max-w-xl mb-12">
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-faint font-mono mb-3">What&apos;s inside</div>
          <h2 className="font-display text-[28px] md:text-[32px] font-semibold text-ink">
            Two laboratories, one numerical core
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-5 mb-5">
          <FeatureCard
            icon={<Orbit className="h-5 w-5 text-gravity" />}
            title="Two-Body Gravitational Simulator"
            description="Model circular, elliptical, and hyperbolic orbits, binary systems, and collisions with a live energy-conservation monitor comparing Euler, Verlet, RK4, and adaptive RK45."
            href="/simulations/two-body"
            accent="gravity"
          />
          <FeatureCard
            icon={<Waves className="h-5 w-5 text-kinetic" />}
            title="Projectile Motion Simulator"
            description="Launch through vacuum, linear drag, or quadratic drag with configurable wind, mass, and elevation — with ten synchronized live graphs tracking every derived quantity."
            href="/simulations/projectile"
            accent="kinetic"
          />
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <FeatureCard
            icon={<GitCompare className="h-5 w-5 text-energy" />}
            title="Method Comparison"
            description="Put every integrator side by side on accuracy, computational cost, stability, and long-run energy drift."
            href="/comparison"
            accent="energy"
          />
          <FeatureCard
            icon={<BookOpen className="h-5 w-5 text-ink-dim" />}
            title="Documentation & Derivations"
            description="The equations, Butcher tableaus, and orbital-mechanics derivations behind every simulation, written out in full."
            href="/documentation"
            accent="default"
          />
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-[22px] font-semibold text-ink mb-1.5">Ready to perturb a system?</h3>
            <p className="text-[13.5px] text-ink-dim">Every parameter is live. Nothing here is pre-rendered.</p>
          </div>
          <Link
            href="/simulations/two-body"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-ink text-void text-[13px] font-medium hover:bg-white transition-colors shrink-0"
          >
            Open the Lab <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
