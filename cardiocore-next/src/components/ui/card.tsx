import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "tint" | "interactive";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const baseStyles =
      "rounded-[20px] p-6 transition-all duration-200 border text-[var(--hi)]";

    const variantStyles = {
      default:
        "bg-[var(--surface)] border-[var(--border)] shadow-[var(--sh-1)]",
      elevated:
        "bg-[var(--elevated)] border-[var(--border-2)] shadow-[var(--sh-2)]",
      tint:
        "bg-[var(--tint)] border-[var(--border)] shadow-[var(--sh-1)]",
      interactive:
        "bg-[var(--surface)] border-[var(--border)] shadow-[var(--sh-1)] hover:border-[var(--teal-700)] hover:shadow-[var(--sh-2)] hover:-translate-y-0.5",
    };

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div className={cn("flex flex-col space-y-1.5 pb-4", className)} {...props} />
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  ...props
}) => (
  <h3
    className={cn(
      "font-bold text-lg text-[var(--hi)] tracking-tight leading-snug",
      className
    )}
    {...props}
  />
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  ...props
}) => (
  <p className={cn("text-sm text-[var(--mid)]", className)} {...props} />
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn("pt-0", className)} {...props} />;

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div className={cn("flex items-center pt-4 border-t border-[var(--border)]", className)} {...props} />
);
