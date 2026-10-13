import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "stable" | "attention" | "urgent" | "twin" | "data" | "neutral";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "neutral",
  size = "md",
  children,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center font-semibold rounded-full border border-transparent tracking-wide uppercase transition-colors";

  const variantStyles = {
    stable:
      "bg-[var(--green-soft)] text-[var(--green)] border-[var(--green)]/20",
    attention:
      "bg-[var(--amber-soft)] text-[var(--amber)] border-[var(--amber)]/20",
    urgent:
      "bg-[var(--red-soft)] text-[var(--red)] border-[var(--red)]/20",
    twin:
      "bg-[var(--violet-soft)] text-[var(--violet)] border-[var(--violet)]/20",
    data:
      "bg-[var(--cyan-soft)] text-[var(--cyan)] border-[var(--cyan)]/20",
    neutral:
      "bg-[var(--tint)] text-[var(--mid)] border-[var(--border)]",
  };

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 gap-1",
    md: "text-[12px] px-2.5 py-1 gap-1.5",
  };

  return (
    <span
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    >
      {children}
    </span>
  );
};
