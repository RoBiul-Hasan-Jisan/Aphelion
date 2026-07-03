import { ReactNode } from "react";
import clsx from "clsx";

export function Panel({
  children,
  className,
  title,
  eyebrow,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className={clsx("panel panel-glow rounded-2xl", className)}>
      {(title || eyebrow) && (
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
          <div>
            {eyebrow && (
              <div className="text-[10px] uppercase tracking-[0.14em] text-ink-faint font-mono mb-0.5">
                {eyebrow}
              </div>
            )}
            {title && <h3 className="text-[14px] font-semibold text-ink font-display">{title}</h3>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Readout({
  label,
  value,
  unit,
  accent = "ink",
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: "ink" | "gravity" | "kinetic" | "energy" | "danger";
}) {
  const colorMap: Record<string, string> = {
    ink: "text-ink",
    gravity: "text-gravity",
    kinetic: "text-kinetic",
    energy: "text-energy",
    danger: "text-danger",
  };
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-line/60 last:border-0">
      <span className="text-[11.5px] text-ink-dim">{label}</span>
      <span className={clsx("tabular text-[13px] font-medium", colorMap[accent])}>
        {value}
        {unit && <span className="text-ink-faint ml-1 text-[11px]">{unit}</span>}
      </span>
    </div>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "gravity" | "kinetic" | "energy" | "danger" }) {
  const toneMap: Record<string, string> = {
    default: "bg-panel-raised text-ink-dim border-line-bright",
    gravity: "bg-[var(--gravity-dim)] text-gravity border-gravity/30",
    kinetic: "bg-[var(--kinetic-dim)] text-kinetic border-kinetic/30",
    energy: "bg-[var(--energy-dim)] text-energy border-energy/30",
    danger: "bg-[var(--danger-dim)] text-danger border-danger/30",
  };
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full border text-[10.5px] font-mono uppercase tracking-wide", toneMap[tone])}>
      {children}
    </span>
  );
}
