"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "./password-input";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "../context/auth-context";
import { isFirebaseConfigured, signInWithFirebaseGoogle } from "@/lib/firebase/config";

const DEFAULT_GOOGLE_CLIENT_ID =
  "862041587704-d5mf0jsjghsiu6r7vocrfebu8nhgqfma.apps.googleusercontent.com";

export const PatientLoginForm: React.FC<{
  onAuthError: (msg: string) => void;
}> = ({ onAuthError }) => {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [identifier, setIdentifier] = useState("aarav.menon@example.com");
  const [password, setPassword] = useState("cardiocore");
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [fieldError, setFieldError] = useState<{ identifier?: string; password?: string }>({});

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

  // Ensure Google Identity Services script is preloaded
  useEffect(() => {
    if (typeof window === "undefined") return;

    const existingScript = document.getElementById("google-gsi-client");
    if (existingScript) return;

    const script = document.createElement("script");
    script.id = "google-gsi-client";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    onAuthError("");

    try {
      // 1. If Firebase is configured with apiKey & projectId, use Firebase Auth popup
      if (isFirebaseConfigured()) {
        const fbResult = await signInWithFirebaseGoogle();
        await authApi.signInWithGoogle({
          credential: fbResult.idToken,
          email: fbResult.email,
          name: fbResult.displayName,
          rememberMe,
        });
        await refreshSession();
        router.push("/patient");
        return;
      }

      // 2. Otherwise trigger Google OAuth 2.0 Account Picker Popup via Google Identity Services
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const google = typeof window !== "undefined" ? (window as unknown as { google?: any })?.google : null;

      if (!google || !google.accounts || !google.accounts.oauth2) {
        throw new Error(
          "Google Sign-In is initializing. Please wait a second and click again."
        );
      }

      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "email profile openid",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        callback: async (tokenRes: any) => {
          if (tokenRes.error) {
            setGoogleLoading(false);
            if (tokenRes.error === "popup_closed_by_user") {
              onAuthError("Google sign-in popup was closed.");
              return;
            }
            onAuthError(tokenRes.error_description || `Google sign-in error: ${tokenRes.error}`);
            return;
          }

          try {
            const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${tokenRes.access_token}` },
            });
            const profile = await profileRes.json();

            await authApi.signInWithGoogle({
              email: profile.email,
              name: profile.name,
              credential: tokenRes.access_token,
              rememberMe,
            });
            await refreshSession();
            router.push("/patient");
          } catch (err: unknown) {
            onAuthError(err instanceof Error ? err.message : "Failed to load Google profile.");
          } finally {
            setGoogleLoading(false);
          }
        },
        error_callback: (err: { type: string; message?: string }) => {
          setGoogleLoading(false);
          onAuthError(err.message || `Google sign-in failed (${err.type}).`);
        },
      });

      tokenClient.requestAccessToken({ prompt: "select_account" });
    } catch (err: unknown) {
      setGoogleLoading(false);
      const msg = err instanceof Error ? err.message : "Google authentication failed";
      onAuthError(msg);
    }
  };

  return (
    <div className="w-full">
      {/* Google Sign In Button */}
      <button
        type="button"
        id="google-signin-btn"
        onClick={handleGoogleSignIn}
        disabled={loading || googleLoading}
        className="w-full relative flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[var(--border-2)] bg-[var(--surface-2)] hover:bg-[var(--surface)] hover:border-[var(--teal)]/40 text-[var(--hi)] text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        {googleLoading ? (
          <svg
            className="animate-spin w-5 h-5 text-[var(--teal)]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 transition-transform duration-200 group-hover:scale-110"
            viewBox="0 0 24 24"
          >
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.44 7.35 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.25C.45 8.15 0 9.99 0 12s.45 3.85 1.25 5.43l4.03-3.14z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.56 1.25 6.57l4.03 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
            />
          </svg>
        )}
        <span>{googleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
      </button>

      {/* Styled Divider */}
      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <span className="relative bg-[var(--surface)] px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--mid)]">
          or sign in with password
        </span>
      </div>

      {/* Password Authentication Form */}
      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <Input
          label="Email or mobile number"
          id="pIdent"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          error={fieldError.identifier}
          placeholder="aarav.menon@example.com"
          disabled={loading || googleLoading}
        />

        <PasswordInput
          label="Password"
          id="pPass"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldError.password}
          disabled={loading || googleLoading}
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
          disabled={loading || googleLoading}
          className="w-full mt-4 justify-center"
        >
          {loading ? "Authenticating..." : "Sign in to CardioCore"}
        </Button>
      </form>

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
