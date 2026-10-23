/**
 * CardioCore Authentication Client
 * 
 * Target: FastAPI Backend or Next.js Integrated Authentication Endpoints (/api/v1/auth)
 * Transmits and receives credentials via secure HTTP-Only session cookies.
 */

import {
  AuthSuccessResponse,
  DoctorSignInRequest,
  ForgotPasswordRequest,
  GoogleSignInRequest,
  OtpSendRequest,
  OtpVerifyRequest,
  PatientSignInRequest,
  ResetPasswordRequest,
  SessionResponse,
} from "./types";

function getInitialBaseUrl(): string {
  if (typeof window !== "undefined") {
    // In browser, default to same-origin relative /api/v1 unless an explicit non-localhost URL is provided
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      return envUrl;
    }
    return "/api/v1";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
}

const API_BASE_URL = getInitialBaseUrl();

export class AuthApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Helper for authenticated requests with secure cookie inclusion
   */
  private async post<T>(endpoint: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Required for HTTP-only cookie exchange
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let errorMsg = `Server error ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.detail || errData.message || errorMsg;
        } catch {
          // non-JSON error body
        }
        throw new Error(errorMsg);
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      if (err instanceof Error) {
        // If connection fails (e.g. backend offline), accurately report status
        if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
          throw new Error("FastAPI authentication service is offline. (Backend integration pending)");
        }
        throw err;
      }
      throw new Error("Unknown network error during authentication");
    }
  }

  /**
   * Patient password sign-in
   */
  async signInPatient(credentials: PatientSignInRequest): Promise<AuthSuccessResponse> {
    return this.post<AuthSuccessResponse>("/auth/login/patient", credentials);
  }

  /**
   * Patient Google OAuth / One-tap sign-in
   */
  async signInWithGoogle(payload?: GoogleSignInRequest): Promise<AuthSuccessResponse> {
    return this.post<AuthSuccessResponse>("/auth/login/google", payload || {});
  }

  /**
   * Clinician credential & 2FA sign-in
   */
  async signInDoctor(credentials: DoctorSignInRequest): Promise<AuthSuccessResponse> {
    return this.post<AuthSuccessResponse>("/auth/login/doctor", credentials);
  }

  /**
   * Request one-time password (OTP)
   */
  async sendOtp(req: OtpSendRequest): Promise<{ success: boolean; message: string }> {
    return this.post<{ success: boolean; message: string }>("/auth/otp/send", req);
  }

  /**
   * Verify one-time password (OTP)
   */
  async verifyOtp(req: OtpVerifyRequest): Promise<AuthSuccessResponse> {
    return this.post<AuthSuccessResponse>("/auth/otp/verify", req);
  }

  /**
   * Retrieve current active session
   */
  async getSession(): Promise<SessionResponse> {
    const url = `${this.baseUrl}/auth/session`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (response.status === 401 || !response.ok) {
        return { authenticated: false, user: null };
      }

      return (await response.json()) as SessionResponse;
    } catch {
      // Backend offline or network unreachable
      return { authenticated: false, user: null, error: "Authentication service offline" };
    }
  }

  /**
   * Terminate active session
   */
  async signOut(): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>("/auth/logout", {});
  }

  /**
   * Request password recovery
   */
  async forgotPassword(req: ForgotPasswordRequest): Promise<{ success: boolean; message: string }> {
    return this.post<{ success: boolean; message: string }>("/auth/forgot-password", req);
  }

  /**
   * Reset password with token
   */
  async resetPassword(req: ResetPasswordRequest): Promise<{ success: boolean; message: string }> {
    return this.post<{ success: boolean; message: string }>("/auth/reset-password", req);
  }
}

export const authApi = new AuthApiClient();
