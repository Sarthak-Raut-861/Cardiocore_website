"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label = "Password", error, id = "password", ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="w-full flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={id}
              className="text-xs font-semibold uppercase tracking-wider text-[var(--mid)]"
            >
              {label}
            </label>
          )}
        </div>
        <div className="relative w-full">
          <input
            id={id}
            type={showPassword ? "text" : "password"}
            ref={ref}
            className={cn(
              "w-full px-4 py-2.5 pr-10 rounded-[12px] bg-[var(--surface-2)] text-[var(--hi)] text-sm font-medium border border-[var(--border)] placeholder:text-[var(--muted)] outline-none transition-all duration-200 focus:border-[var(--teal)] focus:ring-4 focus:ring-[var(--teal)]/15 disabled:opacity-50",
              error && "border-[var(--red)] focus:border-[var(--red)] focus:ring-[var(--red)]/15",
              className
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--hi)] transition-colors p-1"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        {error && <span className="text-xs text-[var(--red)] font-medium">{error}</span>}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
