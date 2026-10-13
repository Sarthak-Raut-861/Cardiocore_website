"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    if (pathname !== "/") {
      router.push(`/#${id}`);
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
      <header
        className={`pointer-events-auto flex items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu ${
          isScrolled
            ? "mt-3 sm:mt-4 w-[calc(100%-2rem)] max-w-3xl rounded-full border border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] px-4 sm:px-6 h-12 sm:h-13"
            : "mt-0 w-full max-w-full rounded-none border-b border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur-md px-6 sm:px-10 lg:px-14 h-16 shadow-none"
        }`}
      >
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group select-none cursor-pointer shrink-0"
        >
          <span
            className={`rounded-lg bg-[var(--teal)] flex items-center justify-center text-white shadow-[0_2px_8px_rgba(14,158,158,0.3)] transition-all duration-300 group-hover:scale-105 ${
              isScrolled ? "w-7 h-7" : "w-8 h-8"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-all duration-300 ${
                isScrolled ? "w-4 h-4" : "w-5 h-5"
              }`}
            >
              <path d="M12 20.5S3.8 15 3.8 9.2A4.4 4.4 0 0 1 12 6.6a4.4 4.4 0 0 1 8.2 2.6c0 5.8-8.2 11.3-8.2 11.3Z" />
              <path
                d="M4.6 11.6h3.2l1.3-2.4 1.9 4.6 1.6-3.2 1 1h5.8"
                stroke="#C9FBEF"
              />
            </svg>
          </span>
          <span
            className={`font-bold tracking-tight font-display text-[var(--hi)] group-hover:text-[var(--teal-700)] dark:group-hover:text-[var(--teal)] transition-all duration-300 ${
              isScrolled ? "text-base" : "text-lg"
            }`}
          >
            CardioCore
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => scrollTo("features")}
            className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold font-display text-[var(--mid)] hover:text-[var(--hi)] hover:bg-[var(--surface-2)] transition-all duration-200 cursor-pointer"
          >
            Features
          </button>
          <button
            onClick={() => scrollTo("clinical")}
            className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold font-display text-[var(--mid)] hover:text-[var(--hi)] hover:bg-[var(--surface-2)] transition-all duration-200 cursor-pointer"
          >
            Clinical
          </button>
          <button
            onClick={() => scrollTo("doctors")}
            className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold font-display text-[var(--mid)] hover:text-[var(--hi)] hover:bg-[var(--surface-2)] transition-all duration-200 cursor-pointer"
          >
            Specialists
          </button>
          <button
            onClick={() => scrollTo("security")}
            className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold font-display text-[var(--mid)] hover:text-[var(--hi)] hover:bg-[var(--surface-2)] transition-all duration-200 cursor-pointer"
          >
            Privacy
          </button>
          {/* FAQ Redirect Link */}
          <Link
            href="/faq"
            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold font-display transition-all duration-200 ${
              pathname === "/faq"
                ? "text-[var(--teal-700)] dark:text-[var(--teal)] bg-[var(--tint)]"
                : "text-[var(--mid)] hover:text-[var(--hi)] hover:bg-[var(--surface-2)]"
            }`}
          >
            FAQ
          </Link>
        </nav>

        {/* Right Action Bar (Dark Mode Icon Only + Mobile Hamburger) */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 rounded-full border border-[var(--border)] text-[var(--hi)] hover:bg-[var(--tint)] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              {mobileMenuOpen ? (
                <path d="M18 6 6 18M6 6l12 12" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="pointer-events-auto md:hidden absolute top-full mt-2 w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-xl px-4 py-5 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col space-y-2 font-semibold text-sm font-display text-[var(--hi)]">
            <button
              onClick={() => scrollTo("features")}
              className="text-left py-2 px-3 rounded-lg hover:bg-[var(--tint)] transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => scrollTo("clinical")}
              className="text-left py-2 px-3 rounded-lg hover:bg-[var(--tint)] transition-colors cursor-pointer"
            >
              Clinical pathway
            </button>
            <button
              onClick={() => scrollTo("doctors")}
              className="text-left py-2 px-3 rounded-lg hover:bg-[var(--tint)] transition-colors cursor-pointer"
            >
              Specialists &amp; Care network
            </button>
            <button
              onClick={() => scrollTo("security")}
              className="text-left py-2 px-3 rounded-lg hover:bg-[var(--tint)] transition-colors cursor-pointer"
            >
              Privacy &amp; Consent
            </button>
            <Link
              href="/faq"
              onClick={() => setMobileMenuOpen(false)}
              className={`text-left py-2 px-3 rounded-lg transition-colors ${
                pathname === "/faq"
                  ? "bg-[var(--tint)] text-[var(--teal-700)] dark:text-[var(--teal)] font-bold"
                  : "hover:bg-[var(--tint)]"
              }`}
            >
              FAQ
            </Link>
            <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-2">
              <Link
                href="/login?role=patient"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs text-center py-2 px-3 rounded-lg bg-[var(--surface-2)] text-[var(--hi)] hover:bg-[var(--tint)] transition-colors font-medium"
              >
                Patient sign in
              </Link>
              <Link
                href="/login?role=doctor"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs text-center py-2 px-3 rounded-lg bg-[var(--teal)] text-white hover:bg-[var(--teal-700)] transition-colors font-medium shadow-sm"
              >
                Doctor portal
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
