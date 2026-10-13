"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 24) {
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
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div
      className={`sticky top-0 z-50 w-full flex justify-center pointer-events-none transition-all duration-300 ease-in-out ${
        isScrolled ? "pt-3 sm:pt-4 px-4 sm:px-6" : "pt-0 px-0"
      }`}
    >
      <header
        className={`pointer-events-auto transition-all duration-300 ease-in-out flex items-center justify-between ${
          isScrolled
            ? "w-full max-w-2xl sm:max-w-3xl rounded-full border border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-xl shadow-lg shadow-black/5 dark:shadow-black/35 px-4 sm:px-6 h-12 sm:h-13"
            : "w-full border-b border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur-md px-4 sm:px-8 lg:px-12 h-16"
        }`}
      >
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group select-none cursor-pointer shrink-0"
        >
          <span
            className={`rounded-lg bg-[var(--teal)] flex items-center justify-center text-white shadow-[0_2px_8px_rgba(14,158,158,0.3)] transition-all duration-200 ${
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
              className={isScrolled ? "w-4 h-4" : "w-5 h-5"}
            >
              <path d="M12 20.5S3.8 15 3.8 9.2A4.4 4.4 0 0 1 12 6.6a4.4 4.4 0 0 1 8.2 2.6c0 5.8-8.2 11.3-8.2 11.3Z" />
              <path
                d="M4.6 11.6h3.2l1.3-2.4 1.9 4.6 1.6-3.2 1 1h5.8"
                stroke="#C9FBEF"
              />
            </svg>
          </span>
          <span
            className={`font-bold tracking-tight font-display text-[var(--hi)] group-hover:text-[var(--teal-700)] dark:group-hover:text-[var(--teal)] transition-colors ${
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
            className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold font-display text-[var(--mid)] hover:text-[var(--hi)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
          >
            Features
          </button>
          <button
            onClick={() => scrollTo("clinical")}
            className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold font-display text-[var(--mid)] hover:text-[var(--hi)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
          >
            Clinical
          </button>
          <button
            onClick={() => scrollTo("doctors")}
            className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold font-display text-[var(--mid)] hover:text-[var(--hi)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
          >
            Specialists
          </button>
          <button
            onClick={() => scrollTo("security")}
            className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold font-display text-[var(--mid)] hover:text-[var(--hi)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
          >
            Privacy
          </button>
        </nav>

        {/* Right Action Bar (Dark Mode Icon Only + Mobile Hamburger) */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 rounded-full border border-[var(--border)] text-[var(--hi)] hover:bg-[var(--tint)] flex items-center justify-center transition-colors"
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
        <div className="pointer-events-auto md:hidden absolute top-full mt-2 w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-xl px-4 py-5 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col space-y-2 font-semibold text-sm font-display text-[var(--hi)]">
            <button
              onClick={() => scrollTo("features")}
              className="text-left py-2 px-3 rounded-lg hover:bg-[var(--tint)] transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollTo("clinical")}
              className="text-left py-2 px-3 rounded-lg hover:bg-[var(--tint)] transition-colors"
            >
              Clinical pathway
            </button>
            <button
              onClick={() => scrollTo("doctors")}
              className="text-left py-2 px-3 rounded-lg hover:bg-[var(--tint)] transition-colors"
            >
              Specialists &amp; Care network
            </button>
            <button
              onClick={() => scrollTo("security")}
              className="text-left py-2 px-3 rounded-lg hover:bg-[var(--tint)] transition-colors"
            >
              Privacy &amp; Consent
            </button>
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
