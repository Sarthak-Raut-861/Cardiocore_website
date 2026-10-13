"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/auth";

export const ForgotPasswordForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your account email address");
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword({ email: email.trim() });
      setSubmitted(true);
    } catch {
      // Per architectural specification: generic confirmation prevents user enumeration
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="w-12 h-12 rounded-full bg-[var(--green-soft)] border border-[var(--green)]/30 flex items-center justify-center text-[var(--green)] mx-auto">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h3 className="font-display font-bold text-lg text-[var(--hi)]">
          Recovery request received
        </h3>
        <p className="text-xs text-[var(--mid)] leading-relaxed max-w-sm mx-auto">
          If an account exists for <span className="font-semibold text-[var(--hi)]">{email}</span>, a secure recovery link has been dispatched. Check your inbox and follow the clinical identity verification steps.
        </p>
        <div className="pt-2">
          <Link href="/login">
            <Button variant="outline" size="sm">
              Return to sign in
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-[var(--mid)] leading-relaxed mb-2">
        Enter the email address registered with your CardioCore record to receive password recovery instructions.
      </p>

      <Input
        label="Account email"
        id="recoverEmail"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error ?? undefined}
        placeholder="aarav.menon@example.com"
        disabled={loading}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={loading}
        className="w-full mt-2 justify-center"
      >
        {loading ? "Dispatching link..." : "Send recovery link"}
      </Button>

      <div className="text-center pt-2">
        <Link
          href="/login"
          className="text-xs text-[var(--teal-700)] dark:text-[var(--teal)] font-bold hover:underline"
        >
          &larr; Back to sign in
        </Link>
      </div>
    </form>
  );
};
