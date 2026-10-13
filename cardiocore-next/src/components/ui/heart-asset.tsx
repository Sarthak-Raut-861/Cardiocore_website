import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface HeartAssetProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  variant?: "standard" | "high-res";
}

/**
 * Isolated component to render the preserved original CardioCore heart asset.
 * Uses exact original asset from assets/heart-q.png without reinterpretation.
 * Animation loops deferred to Phase 2 per specification.
 */
export const HeartAsset: React.FC<HeartAssetProps> = ({
  className,
  size = "md",
  variant = "standard",
  ...props
}) => {
  const sizeMap = {
    sm: { width: 140, height: 198, className: "max-w-[140px]" },
    md: { width: 240, height: 340, className: "max-w-[240px]" },
    lg: { width: 330, height: 468, className: "max-w-[330px]" },
  };

  const src = variant === "high-res" ? "/assets/heart.png" : "/assets/heart-q.png";
  const currentSize = sizeMap[size];

  return (
    <div
      className={cn(
        "relative flex items-center justify-center p-4 select-none",
        className
      )}
      {...props}
    >
      <div className="relative">
        <Image
          src={src}
          alt="Anatomical heart rendered in CardioCore teal palette"
          width={currentSize.width}
          height={currentSize.height}
          priority
          className={cn(
            "object-contain filter drop-shadow-[0_20px_35px_rgba(9,95,99,0.25)] dark:drop-shadow-[0_24px_45px_rgba(0,0,0,0.65)]",
            currentSize.className
          )}
        />
      </div>
    </div>
  );
};
