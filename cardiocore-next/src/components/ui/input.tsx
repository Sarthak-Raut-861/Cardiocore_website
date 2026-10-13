import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, id, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-xs font-semibold uppercase tracking-wider text-[var(--mid)]"
          >
            {label}
          </label>
        )}
        <input
          id={id}
          type={type}
          ref={ref}
          className={cn(
            "w-full px-4 py-2.5 rounded-[12px] bg-[var(--surface-2)] text-[var(--hi)] text-sm font-medium border border-[var(--border)] placeholder:text-[var(--muted)] outline-none transition-all duration-200 focus:border-[var(--teal)] focus:ring-4 focus:ring-[var(--teal)]/15 disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-[var(--red)] focus:border-[var(--red)] focus:ring-[var(--red)]/15",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-[var(--red)] font-medium">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
