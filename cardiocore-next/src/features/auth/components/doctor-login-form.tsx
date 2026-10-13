"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "./password-input";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "../context/auth-context";

export const DoctorLoginForm: React.FC<{
  onAuthError: (msg: string) => void;
}> = ({ onAuthError }) => {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [email, setEmail] = useState("neha.raghavan@meridianheart.in");
  const [password, setPassword] = useState("clinician");
  const [council, setCouncil] = useState("Maharashtra Medical Council");
  const [regNo, setRegNo] = useState("MMC-2010-44821");
  const [institution, setInstitution] = useState("Meridian Heart Institute");
  const [totpCode, setTotpCode] = useState("482 001");
  const [consentAgreement, setConsentAgreement] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorFields, setErrorFields] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorFields({});

    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = "Work email is required";
    if (!password) errors.password = "Password is required";
    if (!regNo.trim()) errors.regNo = "Registration number is required";
    if (!totpCode.trim()) errors.totpCode = "Second factor code is required";
    if (!consentAgreement) {
      onAuthError("You must accept the clinical data-handling policy to enter");
      return;
    }

    if (Object.keys(errors).length > 0) {
      setErrorFields(errors);
      return;
    }

    setLoading(true);
    onAuthError("");
    try {
      await authApi.signInDoctor({
        email: email.trim(),
        password,
        medicalCouncil: council,
        registrationNumber: regNo.trim(),
        institution,
        totpCode: totpCode.trim(),
        consentAgreement,
      });
      await refreshSession();
      router.push("/doctor");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      onAuthError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Work email"
        id="dEmail"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errorFields.email}
        placeholder="neha.raghavan@meridianheart.in"
        disabled={loading}
      />

      <PasswordInput
        label="Password"
        id="dPass"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errorFields.password}
        disabled={loading}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="dCouncil"
            className="text-xs font-semibold uppercase tracking-wider text-[var(--mid)]"
          >
            Medical council
          </label>
          <select
            id="dCouncil"
            value={council}
            onChange={(e) => setCouncil(e.target.value)}
            disabled={loading}
            className="w-full px-3.5 py-2.5 rounded-[12px] bg-[var(--surface-2)] text-[var(--hi)] text-xs sm:text-sm font-medium border border-[var(--border)] outline-none focus:border-[var(--teal)] focus:ring-4 focus:ring-[var(--teal)]/15 transition-all"
          >
            <option>Maharashtra Medical Council</option>
            <option>Delhi Medical Council</option>
            <option>Karnataka Medical Council</option>
            <option>General Medical Council (UK)</option>
          </select>
        </div>

        <Input
          label="Registration no."
          id="dRegNo"
          value={regNo}
          onChange={(e) => setRegNo(e.target.value)}
          error={errorFields.regNo}
          placeholder="MMC-2010-44821"
          disabled={loading}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="dInstitution"
          className="text-xs font-semibold uppercase tracking-wider text-[var(--mid)]"
        >
          Affiliated institution
        </label>
        <select
          id="dInstitution"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          disabled={loading}
          className="w-full px-3.5 py-2.5 rounded-[12px] bg-[var(--surface-2)] text-[var(--hi)] text-xs sm:text-sm font-medium border border-[var(--border)] outline-none focus:border-[var(--teal)] focus:ring-4 focus:ring-[var(--teal)]/15 transition-all"
        >
          <option>Meridian Heart Institute</option>
          <option>Northbridge Clinic</option>
          <option>City Care Hospital</option>
          <option>Riverside Medical</option>
        </select>
      </div>

      <Input
        label="Second factor (TOTP 6-digit)"
        id="dTotp"
        value={totpCode}
        onChange={(e) => setTotpCode(e.target.value)}
        error={errorFields.totpCode}
        placeholder="482 001"
        disabled={loading}
      />

      <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-[var(--mid)] leading-relaxed pt-1">
        <input
          type="checkbox"
          checked={consentAgreement}
          onChange={(e) => setConsentAgreement(e.target.checked)}
          className="w-4 h-4 mt-0.5 rounded border-[var(--border)] text-[var(--teal)] accent-[var(--teal)] shrink-0"
        />
        <span>
          I will only access records with documented patient consent, and I accept the
          clinical data-handling policy.
        </span>
      </label>

      <Button
        type="submit"
        variant="dark"
        size="lg"
        disabled={loading}
        className="w-full mt-4 justify-center gap-2"
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          className="shrink-0"
        >
          <path d="M9 3v4a3 3 0 0 0 3 3 3 3 0 0 0 3-3V3" />
          <path d="M12 10v3a5 5 0 0 0 5 5h1" />
          <circle cx="19" cy="18" r="3" />
        </svg>
        {loading ? "Verifying credentials..." : "Enter clinician portal"}
      </Button>

      {/* Demonstration Portal Link */}
      <div className="mt-6 pt-4 border-t border-[var(--border)] text-center">
        <Link
          href="/doctor"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--tint)] px-4 py-2.5 text-xs font-semibold text-[var(--teal-700)] hover:bg-[var(--tint-2)] transition-colors border border-[var(--border)]"
        >
          <span>Explore Reconstructed Clinician Dashboard (Demo) →</span>
        </Link>
      </div>
    </form>
  );
};
