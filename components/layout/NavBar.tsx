"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Orbit, Menu, X } from "lucide-react";
import Image from "next/image";

const LINKS = [
  { href: "/simulations/two-body", label: "Two-Body" },
  { href: "/simulations/projectile", label: "Projectile" },
  { href: "/comparison", label: "Comparison" },
  { href: "/documentation", label: "Documentation" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
];

export default function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-void/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-3 group">
  <Image
    src="/logo.png"
    alt="Aphelion Logo"
    width={42}
    height={42}
    priority
    className="h-10 w-10 object-contain transition-transform duration-300 group-hover:scale-110"
  />

  <span className="font-display text-[17px] font-semibold tracking-tight text-ink">
    Aphelion
  </span>
</Link>

        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-2 text-[13px] font-medium rounded-full transition-colors ${
                  active ? "text-ink bg-panel-raised border border-line-bright" : "text-ink-dim hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <button
          className="md:hidden text-ink-dim"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="md:hidden border-t border-line px-5 py-3 flex flex-col gap-1 bg-void">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="px-2 py-2.5 text-sm text-ink-dim hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
