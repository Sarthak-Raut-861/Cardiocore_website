"use client";

import React, { useRef } from "react";

export interface OtpInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({ value, onChange, disabled }) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.padEnd(6, "").slice(0, 6).split("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) {
      const next = digits.slice();
      next[index] = "";
      onChange(next.join("").trim());
      return;
    }

    const next = digits.slice();
    next[index] = val[val.length - 1];
    onChange(next.join("").trim());

    if (index < 5 && val) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      onChange(pasted);
      const targetIndex = Math.min(pasted.length, 5);
      inputsRef.current[targetIndex]?.focus();
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3 w-full my-2">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ""}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-11 sm:w-12 h-13 sm:h-14 text-center font-display font-bold text-lg sm:text-xl rounded-[12px] bg-[var(--surface-2)] text-[var(--hi)] border border-[var(--border)] outline-none focus:border-[var(--teal)] focus:ring-4 focus:ring-[var(--teal)]/15 transition-all disabled:opacity-50"
          aria-label={`Digit ${i + 1} of 6-digit verification code`}
        />
      ))}
    </div>
  );
};
