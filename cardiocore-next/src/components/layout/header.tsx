"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const Header: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Features", href: "/#features" },
    { name: "Clinical", href: "/#clinical" },
    { name: "Specialists", href: "/#specialists" },
    { name: "Privacy", href: "/#security" },
    { name: "FAQ", href: "/faq" },
  ];

  return (
    <header
      className={`sticky top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? "bg-[var(--surface)]/95 backdrop-blur-md shadow-sm border-b border-[var(--border)] py-3"
          : "bg-[var(--bg)]/90 backdrop-blur-sm border-b border-[var(--border)]/60 py-4"
      }`}
    >
      <Container>
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-[var(--teal-600)] to-[var(--cyan)] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg leading-tight tracking-tight text-[var(--hi)]">
                CardioCore<span className="text-[var(--teal)]">.</span>
              </span>
              <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--muted)] -mt-0.5">
                Clinical Telemetry
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 bg-[var(--tint)]/70 p-1.5 rounded-full border border-[var(--border)]">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="px-4 py-1.5 text-sm font-medium text-[var(--mid)] hover:text-[var(--hi)] hover:bg-[var(--surface)] rounded-full transition-all duration-150"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link href="/doctor">
              <Button variant="ghost" size="sm">
                Clinician Portal
              </Button>
            </Link>
            <Link href="/patient">
              <Button variant="primary" size="sm" className="shadow-md shadow-[var(--teal)]/20">
                Patient Portal
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[var(--mid)] hover:text-[var(--hi)] rounded-lg focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {mobileMenuOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 12h16M4 6h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden mt-3 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl space-y-3">
            <nav className="flex flex-col space-y-1.5">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-sm font-medium text-[var(--mid)] hover:text-[var(--hi)] hover:bg-[var(--tint)] rounded-lg transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </nav>
            <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-2">
              <Link href="/doctor" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-center">
                  Clinician Portal
                </Button>
              </Link>
              <Link href="/patient" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" className="w-full justify-center">
                  Patient Portal
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Container>
    </header>
  );
};
