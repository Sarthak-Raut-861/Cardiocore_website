"use client";

import React from "react";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout activeRole="patient" showRoleTabs={false}>
      <div className="mb-6">
        <h1 className="h1 text-[var(--hi)] mb-2">Reset password.</h1>
        <p className="text-sm text-[var(--mid)]">
          Verify your clinical identity to regain access to your CardioCore account.
        </p>
      </div>

      <div className="p-6 sm:p-7 rounded-[22px] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--sh-2)]">
        <ForgotPasswordForm />
      </div>
    </AuthLayout>
  );
}
