"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";

const links = [
  { href: "/home", label: "Overview" },
  { href: "/downloads", label: "Download" },
  { href: "/review", label: "Reviews" },
  { href: "/status", label: "Status" },
];

/**
 * Site navigation. Transparent over the top of the page, and glass with a
 * hairline once content scrolls beneath it — the iOS scroll-edge behaviour.
 */
export function MarketingNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || menuOpen;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
        solid ? "bar-material" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-[1080px] items-center gap-7 px-5">
        <Link href="/home" className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em] text-text-normal">
          <Logo size={30} adaptive className="h-[30px] w-[30px]" priority />
          Disband
        </Link>
        <nav aria-label="Site" className="hidden items-center gap-6 sm:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              className={`text-[13px] transition-colors ${
                pathname === l.href ? "text-text-normal" : "text-text-muted hover:text-text-normal"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/login" className="hidden text-[13px] text-text-muted transition-colors hover:text-text-normal sm:block">
            Sign in
          </Link>
          <Link href="/app" className="btn btn-filled btn-sm ml-3">
            Open Disband
          </Link>
          {/* Phone widths: the link row folds into a menu. */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="tool-btn h-9 w-9 text-text-normal sm:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`transition-transform duration-500 ease-spring ${menuOpen ? "rotate-90" : ""}`}>
              {menuOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav aria-label="Site (mobile)" className="stagger px-5 pb-5 pt-1 sm:hidden">
          {[...links, { href: "/login", label: "Sign in" }].map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              style={{ ["--i" as string]: i }}
              className="block py-2.5 text-[24px] font-semibold tracking-[-0.02em] text-text-normal"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

const footerColumns = [
  {
    title: "Product",
    links: [
      { href: "/home", label: "Overview" },
      { href: "/downloads", label: "Download" },
      { href: "/app", label: "Open in browser" },
      { href: "/status", label: "System status" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/review", label: "Reviews" },
      { href: "/bug-report", label: "Report a bug" },
      { href: "/leaderboards/referrals", label: "Referral leaderboard" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/legal", label: "Legal" },
    ],
  },
];

/** Apple-style footer: small grey type in columns, legal line under a hairline. */
export function MarketingFooter() {
  return (
    <footer className="bg-bg-secondary px-5 pb-10 pt-12 text-[12px] text-text-muted">
      <div className="mx-auto max-w-[1080px]">
        <div className="grid gap-8 sm:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link href="/home" className="flex items-center gap-2 text-[14px] font-semibold text-text-normal">
              <Logo size={22} adaptive className="h-[22px] w-[22px]" />
              Disband
            </Link>
            <p className="mt-2 max-w-[16rem] leading-relaxed">
              Your space to talk, hang out, and belong. On Mac, Windows, Linux, iPhone and the web.
            </p>
          </div>
          {footerColumns.map((col) => (
            <div key={col.title}>
              <p className="font-semibold text-text-normal">{col.title}</p>
              <ul className="mt-2.5 space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition-colors hover:text-text-normal hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-hairline pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright © {new Date().getFullYear()} Disband. All rights reserved.</p>
          <p>Made for people who&rsquo;d rather be talking.</p>
        </div>
      </div>
    </footer>
  );
}
