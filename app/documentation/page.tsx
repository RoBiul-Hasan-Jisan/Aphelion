import { DocSection, FormulaCard } from "@/components/docs/FormulaCard";

export const metadata = { title: "Documentation — Aphelion" };

const TOC = [
  { id: "gravitation", label: "Gravitational Mechanics" },
  { id: "orbital-elements", label: "Orbital Elements" },
  { id: "integrators", label: "Numerical Integrators" },
  { id: "projectile", label: "Projectile Motion" },
  { id: "drag", label: "Drag Models" },
  { id: "references", label: "References" },
];

export default function DocumentationPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 md:px-8 py-10 grid md:grid-cols-[200px_1fr] gap-10">
      <aside className="hidden md:block sticky top-24 self-start">
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink-faint font-mono mb-3">On this page</div>
        <nav className="space-y-2.5">
          {TOC.map((t) => (
            <a key={t.id} href={`#${t.id}`} className="block text-[12.5px] text-ink-dim hover:text-ink transition-colors">
              {t.label}
            </a>
          ))}
        </nav>
      </aside>

      <div>
        <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-ink-faint font-mono">Documentation</div>
        <h1 className="font-display text-[30px] md:text-[34px] font-semibold text-ink mb-3">
          Equations & Derivations
        </h1>
        <p className="text-[14px] text-ink-dim max-w-2xl">
          Everything the two simulators compute under the hood, written out explicitly — the physics
          they model and the numerical methods used to advance them in time.
        </p>

        <DocSection id="gravitation" eyebrow="01" title="Gravitational Mechanics">
          <p>
            Both bodies are treated as point masses obeying Newton&apos;s law of universal gravitation.
            The force on body 1 due to body 2, and the equal-and-opposite reaction on body 2, are:
          </p>
          <FormulaCard label="Newtonian gravitational force" formula="F = G · m₁ · m₂ / r²" note="G, m₁, and m₂ are all user-configurable in the simulator." />
          <p>
            To avoid a numerical singularity as separation r → 0, the simulator applies Plummer
            softening: the denominator uses √(r² + ε²) instead of r, where ε is the softening length.
            This keeps the force finite during very close approaches without materially changing the
            trajectory when ε is small relative to typical separations.
          </p>
          <FormulaCard label="Softened force magnitude" formula="F = G·m₁·m₂ / (r² + ε²)" />
          <p>Total mechanical energy and its two components are tracked every frame:</p>
          <FormulaCard label="Kinetic energy" formula="KE = ½m₁v₁² + ½m₂v₂²" />
          <FormulaCard label="Potential energy" formula="PE = −G·m₁·m₂ / √(r² + ε²)" />
          <FormulaCard label="Total energy (conserved)" formula="E = KE + PE" note="A well-behaved integrator keeps E nearly constant. This is exactly what the energy conservation monitor tracks." />
        </DocSection>

        <DocSection id="orbital-elements" eyebrow="02" title="Orbital Elements">
          <p>
            The dashboard derives standard two-body orbital elements from the relative position and
            velocity vectors (body 2 relative to body 1), using the combined gravitational parameter
            μ = G(m₁ + m₂).
          </p>
          <FormulaCard label="Specific relative angular momentum" formula="h = rₓ·v_y − r_y·vₓ" />
          <FormulaCard label="Specific orbital energy" formula="ε_orb = ½v² − μ/r" />
          <FormulaCard label="Semi-major axis" formula="a = −μ / (2·ε_orb)" note="Negative ε_orb → bound (elliptical) orbit. Zero → parabolic. Positive → hyperbolic (open trajectory)." />
          <FormulaCard label="Orbital period (bound orbits only)" formula="T = 2π · √(|a|³ / μ)" note="Kepler's third law, applied to the reduced two-body problem." />
          <FormulaCard label="Escape velocity at current separation" formula="v_esc = √(2μ / r)" />
          <p>
            Eccentricity is computed from the Laplace–Runge–Lenz vector, which is exact for any
            conic-section orbit and doesn&apos;t depend on knowing the orbit is closed in advance —
            this is what lets the simulator classify hyperbolic flybys correctly.
          </p>
        </DocSection>

        <DocSection id="integrators" eyebrow="03" title="Numerical Integrators">
          <p>
            Every integrator advances the same system of ordinary differential equations — it&apos;s
            only the update rule that changes. All methods below operate on the state vector
            (position, velocity) for each body.
          </p>
          <FormulaCard label="Explicit (forward) Euler — 1st order" formula="y_(n+1) = y_n + dt · f(y_n)" note="Simplest possible method. Not symplectic: energy in a gravitational system drifts monotonically, usually outward, spiraling orbits open over time." />
          <FormulaCard label="Semi-Implicit (symplectic) Euler — 1st order" formula="v_(n+1) = v_n + dt·a(r_n);  r_(n+1) = r_n + dt·v_(n+1)" note="Updates velocity first, then uses the new velocity to update position. This small reordering makes it symplectic — energy oscillates but never drifts." />
          <FormulaCard label="Velocity Verlet — 2nd order, symplectic" formula="r_(n+1) = r_n + v_n·dt + ½a_n·dt²;  v_(n+1) = v_n + ½(a_n + a_(n+1))·dt" note="The standard choice for gravitational N-body work: cheap, time-reversible, and excellent long-term energy behavior." />
          <FormulaCard label="Classical RK4 — 4th order" formula="y_(n+1) = y_n + (dt/6)(k₁ + 2k₂ + 2k₃ + k₄)" note="Very accurate over short spans, but not symplectic — a slow secular energy drift appears over long integrations even though local error is tiny." />
          <FormulaCard label="Adaptive RK45 (Dormand–Prince)" formula="y_(n+1) = y_n + dt·Σ bᵢ·kᵢ,  with embedded 4th/5th-order error estimate" note="Computes both a 4th- and 5th-order estimate from the same function evaluations; the difference estimates local error and drives step-size selection." />
        </DocSection>

        <DocSection id="projectile" eyebrow="04" title="Projectile Motion">
          <p>The projectile lab integrates the same kind of state (position, velocity) under gravity, optionally with drag and wind:</p>
          <FormulaCard label="Equations of motion" formula="ẍ = a_drag,x;   ÿ = −g + a_drag,y" />
          <p>With no drag, this reduces to the closed-form solution shown as the dashed reference curve:</p>
          <FormulaCard label="Vacuum trajectory (closed form)" formula="x(t) = v₀cos(θ)·t;   y(t) = h₀ + v₀sin(θ)·t − ½g·t²" />
          <FormulaCard label="Range and max height (vacuum, h₀ = 0)" formula="R = v₀²sin(2θ)/g;   H = v₀²sin²(θ)/(2g)" />
        </DocSection>

        <DocSection id="drag" eyebrow="05" title="Drag Models">
          <p>Two drag models are available, applied opposite to the projectile&apos;s velocity relative to the wind:</p>
          <FormulaCard label="Linear drag (Stokes-like, low Reynolds number)" formula="F_drag = −k · v_rel" note="Appropriate for small, slow, or highly viscous-medium motion. k is the linear drag coefficient." />
          <FormulaCard label="Quadratic drag (high Reynolds number)" formula="F_drag = −½ · ρ · Cd · A · |v_rel| · v_rel" note="The standard model for macroscopic objects moving through air at typical speeds: cannonballs, thrown balls, arrows. ρ is air density, Cd the drag coefficient, A the cross-sectional area." />
          <p>
            Wind is modeled by subtracting a constant wind vector from the projectile&apos;s velocity
            before computing drag, so drag always acts relative to the surrounding air, not the ground.
          </p>
        </DocSection>

        <DocSection id="references" eyebrow="06" title="References">
          <ul className="list-disc list-inside space-y-1.5">
            <li>Hairer, Lubich & Wanner — <span className="text-ink">Geometric Numerical Integration</span> (symplectic methods, energy behavior)</li>
            <li>Dormand & Prince (1980) — <span className="text-ink">A family of embedded Runge-Kutta formulae</span></li>
            <li>Curtis, H. — <span className="text-ink">Orbital Mechanics for Engineering Students</span> (orbital element derivations)</li>
            <li>Press et al. — <span className="text-ink">Numerical Recipes</span> (integrator implementation details)</li>
          </ul>
        </DocSection>
      </div>
    </div>
  );
}
