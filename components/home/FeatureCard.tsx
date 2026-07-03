import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ReactNode } from "react";

export default function FeatureCard({
  icon,
  title,
  description,
  href,
  accent,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
  accent: "gravity" | "kinetic" | "energy" | "default";
}) {
  const borderMap: Record<string, string> = {
    gravity: "hover:border-gravity/40",
    kinetic: "hover:border-kinetic/40",
    energy: "hover:border-energy/40",
    default: "hover:border-line-bright",
  };
  return (
    <Link
      href={href}
      className={`group panel rounded-2xl p-6 flex flex-col gap-4 transition-colors ${borderMap[accent]}`}
    >
      <div className="h-10 w-10 rounded-xl bg-panel-raised border border-line flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="font-display text-[16px] font-semibold text-ink mb-1.5">{title}</h3>
        <p className="text-[13px] text-ink-dim leading-relaxed">{description}</p>
      </div>
      <div className="mt-auto flex items-center gap-1.5 text-[12px] font-medium text-ink-dim group-hover:text-ink transition-colors">
        Open <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}
