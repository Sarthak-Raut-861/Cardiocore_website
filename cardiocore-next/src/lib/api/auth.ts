/**
 * CardioCore Authentication Client
 * 
 * Target: FastAPI Authentication Endpoints (/api/v1/auth)
 * Transmits and receives credentials via secure HTTP-Only session cookies.
 * 
 * IMPORTANT: In Phase 3, this client represents proposed contracts.
 * Zero client-side fake logins or hardcoded tokens are implemented.
 */

import {
  AuthSuccessResponse,
  DoctorSignInRequest,
  ForgotPasswordRequest,
  OtpSendRequest,
  OtpVerifyRequest,
  PatientSignInRequest,
  ResetPasswordRequest,
  SessionResponse,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

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
   * Proposed contract: Patient password sign-in
   */
  async signInPatient(credentials: PatientSignInRequest): Promise<AuthSuccessResponse> {
    return this.post<AuthSuccessResponse>("/auth/login/patient", credentials);
  }

  /**
   * Proposed contract: Clinician credential & 2FA sign-in
   */
  async signInDoctor(credentials: DoctorSignInRequest): Promise<AuthSuccessResponse> {
    return this.post<AuthSuccessResponse>("/auth/login/doctor", credentials);
  }

  /**
   * Proposed contract: Request one-time password (OTP)
   */
  async sendOtp(req: OtpSendRequest): Promise<{ success: boolean; message: string }> {
    return this.post<{ success: boolean; message: string }>("/auth/otp/send", req);
  }

  /**
   * Proposed contract: Verify one-time password (OTP)
   */
  async verifyOtp(req: OtpVerifyRequest): Promise<AuthSuccessResponse> {
    return this.post<AuthSuccessResponse>("/auth/otp/verify", req);
  }

  /**
   * Proposed contract: Retrieve current active session
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
   * Proposed contract: Terminate active session
   */
  async signOut(): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>("/auth/logout", {});
  }

  /**
   * Proposed contract: Request password recovery
   */
  async forgotPassword(req: ForgotPasswordRequest): Promise<{ success: boolean; message: string }> {
    return this.post<{ success: boolean; message: string }>("/auth/forgot-password", req);
  }

  /**
   * Proposed contract: Reset password with token
   */
  async resetPassword(req: ResetPasswordRequest): Promise<{ success: boolean; message: string }> {
    return this.post<{ success: boolean; message: string }>("/auth/reset-password", req);
  }
}

export const authApi = new AuthApiClient();
