"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { PatientLoginForm } from "@/features/auth/components/patient-login-form";
import { DoctorLoginForm } from "@/features/auth/components/doctor-login-form";
import { AuthBackendAlert } from "@/features/auth/components/auth-backend-alert";

function LoginContent() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role") === "doctor" ? "doctor" : "patient";
  const [selectedRole, setSelectedRole] = useState<"patient" | "doctor" | null>(null);
  const activeRole = selectedRole ?? roleParam;
  const [authError, setAuthError] = useState<string | null>(null);

  return (
    <AuthLayout
      activeRole={activeRole}
      onRoleChange={(role) => {
        setSelectedRole(role);
        setAuthError(null);
      }}
    >
      <div className="mb-6">
        <h1 className="h1 text-[var(--hi)] mb-2">
          {activeRole === "doctor" ? "Clinician portal." : "Welcome back."}
        </h1>
        <p className="text-sm text-[var(--mid)]">
          {activeRole === "doctor"
            ? "Access consented patient records, validated ECG strips and your triage roster."
            : "Sign in to see your cardiovascular state, trends and care plan."}
        </p>
      </div>

      {/* Backend Integration Status Alert */}
      <AuthBackendAlert error={authError} />

      {/* Role-Specific Form */}
      <div className="p-6 sm:p-7 rounded-[22px] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--sh-2)]">
        {activeRole === "patient" ? (
          <PatientLoginForm onAuthError={setAuthError} />
        ) : (
          <DoctorLoginForm onAuthError={setAuthError} />
        )}
      </div>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-xs text-[var(--mid)]">
          Loading authentication portal...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
