import IntegratorComparison from "@/components/comparison/IntegratorComparison";

export const metadata = { title: "Comparison — Aphelion" };

export default function ComparisonPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 md:px-8 py-10">
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.14em] text-ink-faint font-mono mb-2">Comparison</div>
        <h1 className="font-display text-[28px] md:text-[32px] font-semibold text-ink">Numerical Method Comparison</h1>
        <p className="text-[13.5px] text-ink-dim mt-1.5 max-w-2xl">
          Same initial conditions, same time step, five different integrators. This runs live in your
          browser — not pre-computed — so switching the scenario re-runs all five from scratch.
        </p>
      </div>
      <IntegratorComparison />
    </div>
  );
}
