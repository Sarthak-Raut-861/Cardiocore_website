"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur-md transition-colors duration-200">
      <Container className="h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group select-none cursor-pointer"
        >
          <span className="w-8 h-8 rounded-lg bg-[var(--teal)] flex items-center justify-center text-white shadow-[0_2px_8px_rgba(14,158,158,0.3)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M12 20.5S3.8 15 3.8 9.2A4.4 4.4 0 0 1 12 6.6a4.4 4.4 0 0 1 8.2 2.6c0 5.8-8.2 11.3-8.2 11.3Z" />
              <path
                d="M4.6 11.6h3.2l1.3-2.4 1.9 4.6 1.6-3.2 1 1h5.8"
                stroke="#C9FBEF"
              />
            </svg>
          </span>
          <span className="font-bold text-lg tracking-tight font-display text-[var(--hi)] group-hover:text-[var(--teal-700)] dark:group-hover:text-[var(--teal)] transition-colors">
            CardioCore
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-[var(--mid)]">
          <button
            onClick={() => scrollTo("features")}
            className="hover:text-[var(--hi)] transition-colors cursor-pointer"
          >
            Features
          </button>
          <button
            onClick={() => scrollTo("clinical")}
            className="hover:text-[var(--hi)] transition-colors cursor-pointer"
          >
            Clinical
          </button>
          <button
            onClick={() => scrollTo("doctors")}
            className="hover:text-[var(--hi)] transition-colors cursor-pointer"
          >
            Specialists
          </button>
          <button
            onClick={() => scrollTo("security")}
            className="hover:text-[var(--hi)] transition-colors cursor-pointer"
          >
            Privacy
          </button>
          <button
            onClick={() => scrollTo("faq")}
            className="hover:text-[var(--hi)] transition-colors cursor-pointer"
          >
            FAQ
          </button>
        </nav>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2">
            <Link href="/login?role=patient">
              <Button variant="ghost" size="sm" className="text-xs">
                Patient sign in
              </Button>
            </Link>
            <Link href="/login?role=doctor">
              <Button variant="primary" size="sm" className="text-xs">
                Doctor portal
              </Button>
            </Link>
          </div>

          <ThemeToggle />

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border border-[var(--border)] text-[var(--hi)] hover:bg-[var(--tint)] transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg
              width="20"
              height="20"
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
      </Container>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--surface)] px-4 py-5 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col space-y-3 font-semibold text-sm text-[var(--hi)]">
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
            <button
              onClick={() => scrollTo("faq")}
              className="text-left py-2 px-3 rounded-lg hover:bg-[var(--tint)] transition-colors"
            >
              FAQ
            </button>
            <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-2">
              <Link href="/login?role=patient" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="ghost"
                  size="md"
                  className="w-full justify-center"
                >
                  Patient sign in
                </Button>
              </Link>
              <Link href="/login?role=doctor" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full justify-center"
                >
                  Doctor portal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
