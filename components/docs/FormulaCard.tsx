import { ReactNode } from "react";

export function FormulaCard({ label, formula, note }: { label: string; formula: string; note?: string }) {
  return (
    <div className="rounded-xl border border-line bg-void/50 px-4 py-3.5">
      <div className="text-[10.5px] uppercase tracking-[0.1em] text-ink-faint font-mono mb-2">{label}</div>
      <div className="font-mono text-[15px] text-kinetic overflow-x-auto whitespace-nowrap">{formula}</div>
      {note && <p className="text-[12px] text-ink-dim mt-2 leading-relaxed">{note}</p>}
    </div>
  );
}

export function DocSection({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 py-10 border-b border-line last:border-0">
      <div className="text-[11px] uppercase tracking-[0.14em] text-ink-faint font-mono mb-2">{eyebrow}</div>
      <h2 className="font-display text-[22px] md:text-[24px] font-semibold text-ink mb-4">{title}</h2>
      <div className="space-y-4 text-[13.5px] text-ink-dim leading-relaxed">{children}</div>
    </section>
  );
}
