"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "./password-input";
import { OtpInput } from "./otp-input";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "../context/auth-context";

export const PatientLoginForm: React.FC<{
  onAuthError: (msg: string) => void;
}> = ({ onAuthError }) => {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");
  const [identifier, setIdentifier] = useState("aarav.menon@example.com");
  const [password, setPassword] = useState("cardiocore");
  const [rememberMe, setRememberMe] = useState(true);

  // OTP State
  const [phoneNumber, setPhoneNumber] = useState("+91 98200 00000");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpNotice, setOtpNotice] = useState("");

  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<{ identifier?: string; password?: string }>({});

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError({});

    if (!identifier.trim()) {
      setFieldError((prev) => ({ ...prev, identifier: "Email or mobile number is required" }));
      return;
    }
    if (!password) {
      setFieldError((prev) => ({ ...prev, password: "Password is required" }));
      return;
    }

    setLoading(true);
    onAuthError("");
    try {
      await authApi.signInPatient({
        identifier: identifier.trim(),
        password,
        rememberMe,
      });
      await refreshSession();
      router.push("/patient");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      onAuthError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) {
      onAuthError("Please enter a valid mobile number");
      return;
    }
    setLoading(true);
    try {
      await authApi.sendOtp({ phoneNumber: phoneNumber.trim() });
      setOtpSent(true);
      setOtpNotice("Demo code dispatched. Use demo code: 481200.");
    } catch {
      // In test/demo when backend is offline, still enable the input so user can test the UI flow
      setOtpSent(true);
      setOtpNotice("Simulated dispatch (backend offline). Enter code: 4 8 1 2 0 0.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) {
      onAuthError("Please enter the complete 6-digit code");
      return;
    }
    setLoading(true);
    onAuthError("");
    try {
      await authApi.verifyOtp({
        phoneNumber: phoneNumber.trim(),
        code: otpCode,
      });
      await refreshSession();
      router.push("/patient");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      onAuthError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Mode Segmented Switch */}
      <div className="grid grid-cols-2 p-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)] mb-6">
        <button
          type="button"
          onClick={() => setAuthMode("password")}
          className={`py-2 rounded-full text-xs font-bold transition-all ${
            authMode === "password"
              ? "bg-[var(--surface)] text-[var(--hi)] shadow-[var(--sh-1)]"
              : "text-[var(--mid)] hover:text-[var(--hi)]"
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => setAuthMode("otp")}
          className={`py-2 rounded-full text-xs font-bold transition-all ${
            authMode === "otp"
              ? "bg-[var(--surface)] text-[var(--hi)] shadow-[var(--sh-1)]"
              : "text-[var(--mid)] hover:text-[var(--hi)]"
          }`}
        >
          One-time code
        </button>
      </div>

      {authMode === "password" ? (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <Input
            label="Email or mobile number"
            id="pIdent"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            error={fieldError.identifier}
            placeholder="aarav.menon@example.com"
            disabled={loading}
          />

          <PasswordInput
            label="Password"
            id="pPass"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldError.password}
            disabled={loading}
          />

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[var(--mid)]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] text-[var(--teal)] accent-[var(--teal)]"
              />
              Keep me signed in
            </label>
            <Link
              href="/forgot-password"
              className="text-[var(--teal-700)] dark:text-[var(--teal)] font-bold hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            className="w-full mt-4 justify-center"
          >
            {loading ? "Authenticating..." : "Sign in to CardioCore"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <Input
            label="Mobile number"
            id="pPhone"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+91 98200 00000"
            disabled={loading || otpSent}
          />

          {!otpSent ? (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full justify-center"
            >
              {loading ? "Sending..." : "Send 6-digit code"}
            </Button>
          ) : (
            <div className="pt-2">
              <span className="text-xs font-semibold text-[var(--mid)] block mb-1">
                Enter 6-digit verification code
              </span>
              {otpNotice && (
                <span className="text-xs font-mono text-[var(--teal-700)] dark:text-[var(--teal)] block mb-2">
                  {otpNotice}
                </span>
              )}
              <OtpInput value={otpCode} onChange={setOtpCode} disabled={loading} />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading || otpCode.length < 6}
                className="w-full mt-4 justify-center"
              >
                {loading ? "Verifying..." : "Verify & continue"}
              </Button>
            </div>
          )}
        </form>
      )}

      {/* Demonstration Portal Link */}
      <div className="mt-6 pt-4 border-t border-[var(--border)] text-center">
        <Link
          href="/patient"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--tint)] px-4 py-2.5 text-xs font-semibold text-[var(--teal-700)] hover:bg-[var(--tint-2)] transition-colors border border-[var(--border)]"
        >
          <span>Explore Reconstructed Patient Dashboard (Demo) →</span>
        </Link>
      </div>
    </div>
  );
};

