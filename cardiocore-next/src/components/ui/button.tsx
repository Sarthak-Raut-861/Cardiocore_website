import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "dark" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-bold tracking-tight rounded-full transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:translate-y-0";

    const variantStyles = {
      primary:
        "bg-[var(--teal)] text-white hover:bg-[var(--teal-600)] shadow-[0_2px_0_rgba(7,60,64,0.06)] hover:-translate-y-0.5 hover:shadow-[var(--sh-2)]",
      dark:
        "bg-[var(--teal-ink)] text-white hover:opacity-90 shadow-[0_2px_0_rgba(7,60,64,0.06)] hover:-translate-y-0.5 hover:shadow-[var(--sh-2)]",
      outline:
        "bg-transparent border border-[var(--border-2)] text-[var(--hi)] hover:bg-[var(--tint)] hover:border-[var(--teal)]",
      ghost:
        "bg-transparent text-[var(--mid)] hover:text-[var(--hi)] hover:bg-[var(--tint)]",
      danger:
        "bg-[var(--red)] text-white hover:opacity-90 shadow-[var(--sh-1)] hover:-translate-y-0.5",
    };

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-sm px-5 py-2.5 gap-2",
      lg: "text-base px-6 py-3.5 gap-2.5",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
