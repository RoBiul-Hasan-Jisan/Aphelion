import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-line mt-24">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <p className="text-[13px] text-ink-faint font-mono">
          Aphelion Lab — numerical mechanics, simulated in the browser.
        </p>
        <div className="flex gap-5 text-[13px] text-ink-dim">
          <Link href="/documentation" className="hover:text-ink transition-colors">Documentation</Link>
          <Link href="/comparison" className="hover:text-ink transition-colors">Comparison</Link>
          <Link href="/about" className="hover:text-ink transition-colors">About</Link>
        </div>
      </div>
    </footer>
  );
}
