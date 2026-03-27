"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type HomeTab = "trending" | "popular" | "genre";

const tabs: Array<{ key: HomeTab; href: string; label: string }> = [
  { key: "trending", href: "/trending", label: "Trending" },
  { key: "popular", href: "/popular", label: "Popular" }
];

export function Navbar() {
  const pathname = usePathname();

  const getActiveTab = (): HomeTab | null => {
    if (pathname === "/trending") return "trending";
    if (pathname === "/popular") return "popular";
    return null;
  };

  const activeTab = getActiveTab();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="rounded-full bg-highlight px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white">
            Reel
          </span>
          <div>
            <p className="text-sm font-semibold text-white sm:text-base">Movie Suggestion</p>
            <p className="text-xs text-white/55">Discover what to watch next</p>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center gap-2 sm:gap-3 lg:justify-end">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <Link
                key={tab.key}
                href={tab.href}
                className={`relative rounded-full px-4 py-2 text-sm transition duration-300 ${
                  isActive
                    ? "bg-white/10 text-white shadow-[0_0_24px_rgba(229,9,20,0.25)]"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                {tab.label}
                <span
                  className={`absolute inset-x-4 -bottom-1 h-0.5 rounded-full bg-highlight transition-all duration-300 ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                />
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}