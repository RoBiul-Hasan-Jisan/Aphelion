import Link from "next/link";
import { TWO_BODY_PRESETS } from "@/lib/physics/twoBody";
import { PROJECTILE_PRESETS } from "@/lib/physics/projectile";
import { MiniTwoBodyPreview, MiniProjectilePreview } from "@/components/gallery/MiniPreview";
import { Badge } from "@/components/ui/Panel";

export const metadata = { title: "Gallery — Aphelion" };

export default function GalleryPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 md:px-8 py-10">
      <div className="mb-10">
        <div className="text-[11px] uppercase tracking-[0.14em] text-ink-faint font-mono mb-2">Gallery</div>
        <h1 className="font-display text-[28px] md:text-[32px] font-semibold text-ink mb-3">Scenario Library</h1>
        <p className="text-[13.5px] text-ink-dim max-w-2xl">
          Every card below is a live, running simulation — a small window into the same engine that
          powers the full simulators. Click through to open any scenario at full size.
        </p>
      </div>

      <div className="mb-4">
        <Badge tone="gravity">Two-Body Scenarios</Badge>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
        {TWO_BODY_PRESETS.map((p) => (
          <Link key={p.id} href="/simulations/two-body" className="group panel rounded-2xl overflow-hidden hover:border-line-bright transition-colors">
            <div className="h-40">
              <MiniTwoBodyPreview presetId={p.id} />
            </div>
            <div className="p-4">
              <h3 className="font-display text-[14px] font-semibold text-ink mb-1">{p.label}</h3>
              <p className="text-[11.5px] text-ink-faint leading-relaxed">{p.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mb-4">
        <Badge tone="kinetic">Projectile Scenarios</Badge>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {PROJECTILE_PRESETS.map((p) => (
          <Link key={p.id} href="/simulations/projectile" className="group panel rounded-2xl overflow-hidden hover:border-line-bright transition-colors">
            <div className="h-40">
              <MiniProjectilePreview presetId={p.id} />
            </div>
            <div className="p-4">
              <h3 className="font-display text-[14px] font-semibold text-ink mb-1">{p.label}</h3>
              <p className="text-[11.5px] text-ink-faint leading-relaxed">{p.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
