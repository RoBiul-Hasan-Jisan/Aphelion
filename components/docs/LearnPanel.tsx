import Link from "next/link";
import { GraduationCap, ArrowRight } from "lucide-react";
import { FormulaCard } from "./FormulaCard";

export function LearnPanel({
  title,
  formulas,
  docsAnchor,
}: {
  title: string;
  formulas: { label: string; formula: string; note?: string }[];
  docsAnchor: string;
}) {
  return (
    <div className="panel rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <GraduationCap className="h-4 w-4 text-energy" />
        <h3 className="font-display text-[14px] font-semibold text-ink">{title}</h3>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {formulas.map((f) => (
          <FormulaCard key={f.label} {...f} />
        ))}
      </div>
      <Link href={`/documentation#${docsAnchor}`} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-dim hover:text-ink transition-colors">
        Full derivation in Documentation <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
