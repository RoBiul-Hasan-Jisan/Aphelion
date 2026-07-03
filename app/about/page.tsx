import { Badge } from "@/components/ui/Panel";

export const metadata = { title: "About — Aphelion" };

const STACK = [
  { group: "Frontend", items: ["Next.js (App Router)", "React", "TypeScript", "Tailwind CSS v4"] },
  { group: "Physics Engine", items: ["Custom TypeScript ODE solvers", "Newtonian gravitation", "Drag & wind models"] },
  { group: "Visualization", items: ["Canvas 2D rendering", "Recharts", "requestAnimationFrame loops"] },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 md:px-8 py-14">
      <div className="text-[11px] uppercase tracking-[0.14em] text-ink-faint font-mono mb-2">About</div>
      <h1 className="font-display text-[30px] md:text-[34px] font-semibold text-ink mb-5">Aphelion</h1>
      <p className="text-[14.5px] text-ink-dim leading-relaxed mb-6">
        Aphelion is an interactive laboratory for classical mechanics, built to make numerical
        integration tangible rather than abstract. Instead of stating that Explicit Euler drifts
        and Velocity Verlet doesn&apos;t, the two simulators let you run the same orbit through both
        and watch the energy monitor prove it in real time.
      </p>
      <p className="text-[14.5px] text-ink-dim leading-relaxed mb-6">
        Every trajectory on this site — from the hero animation on the home page to the gallery
        thumbnails — is a genuine live simulation running the shared physics engine in
        <code className="mx-1 px-1.5 py-0.5 rounded bg-panel-raised border border-line text-[12.5px] font-mono text-ink">/lib/physics</code>
        . Nothing is pre-rendered or faked; changing a parameter changes the numbers that come out.
      </p>

      <h2 className="font-display text-[18px] font-semibold text-ink mt-10 mb-3">Objectives</h2>
      <ul className="list-disc list-inside space-y-1.5 text-[13.5px] text-ink-dim mb-6">
        <li>Make the difference between numerical methods visible, not just described</li>
        <li>Keep every simulation parameter live and immediately reflected in the visuals and dashboard</li>
        <li>Match the visual and interaction quality of professional scientific software</li>
      </ul>

      <h2 className="font-display text-[18px] font-semibold text-ink mt-10 mb-4">Technology</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {STACK.map((s) => (
          <div key={s.group} className="panel rounded-xl p-4">
            <div className="text-[10.5px] uppercase tracking-[0.1em] text-ink-faint font-mono mb-2.5">{s.group}</div>
            <div className="flex flex-wrap gap-1.5">
              {s.items.map((i) => (
                <Badge key={i}>{i}</Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
