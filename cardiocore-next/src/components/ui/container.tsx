import React from "react";
import { cn } from "@/lib/utils";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "default" | "sm";
}

export const Container: React.FC<ContainerProps> = ({
  className,
  size = "default",
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        size === "sm" ? "wrap-sm" : "wrap",
        "px-4 sm:px-6 md:px-8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
