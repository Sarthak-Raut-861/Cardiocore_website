/**
 * CardioCore API Types & Proposed Authentication Contracts
 * 
 * Target: FastAPI Backend (Python)
 * Note: These are proposed contracts, not active backend endpoints.
 * Zero mock users or fake authentication successes are invented.
 */

export type UserRole = "patient" | "doctor";

export interface AuthUser {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  medicalCouncil?: string;
  registrationNumber?: string;
  institution?: string;
}

export interface SessionResponse {
  authenticated: boolean;
  role?: UserRole;
  user?: AuthUser | null;
  sessionExpiresAt?: string;
  error?: string;
}

export interface PatientSignInRequest {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface GoogleSignInRequest {
  credential?: string;
  email?: string;
  name?: string;
  rememberMe?: boolean;
}

export interface DoctorSignInRequest {
  email: string;
  password: string;
  medicalCouncil: string;
  registrationNumber: string;
  institution: string;
  totpCode: string;
  consentAgreement: boolean;
}

export interface OtpSendRequest {
  phoneNumber: string;
}

export interface OtpVerifyRequest {
  phoneNumber: string;
  code: string;
}

export interface ForgotPasswordRequest {
  identifier?: string;
  email?: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface AuthSuccessResponse {
  user: AuthUser;
  sessionExpiresAt?: string;
  success?: boolean;
  message?: string;
}

export interface AuthErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  code?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PatientVitals {
  heartRateBpm: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  spO2Percent: number;
  temperatureCelsius: number;
  timestamp: string;
}

export interface PatientSummary {
  id: string;
  name: string;
  age: number;
  gender: string;
  primaryCondition?: string;
  triageStatus: "stable" | "attention" | "urgent";
}

export interface DoctorProfile {
  id: string;
  name: string;
  registrationNumber: string;
  council: string;
  institution: string;
  department: string;
}
