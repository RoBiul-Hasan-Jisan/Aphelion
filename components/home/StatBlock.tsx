export default function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-[26px] md:text-[30px] font-semibold text-ink tabular">{value}</div>
      <div className="text-[11.5px] text-ink-faint mt-0.5">{label}</div>
    </div>
  );
}
