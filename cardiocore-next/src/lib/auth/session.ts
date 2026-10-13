import { AuthUser } from "@/lib/api/types";

export interface SessionPayload extends AuthUser {
  expiresAt: number;
}

const SESSION_SECRET = process.env.SESSION_SECRET || "cardiocore_session_secret_edge_2026";
export const COOKIE_NAME = "cc_session";
export const SESSION_MAX_AGE_SECONDS = 28800; // 8 hours

/**
 * Encodes session user into a portable secure base64 token.
 */
export function createSessionToken(user: AuthUser, hours: number = 8): string {
  const expiresAt = Date.now() + hours * 3600 * 1000;
  const payload: SessionPayload = {
    ...user,
    expiresAt,
  };

  const jsonStr = JSON.stringify(payload);
  const base64 = Buffer.from(jsonStr, "utf-8").toString("base64url");
  return `${base64}.${simpleHash(base64 + SESSION_SECRET)}`;
}

/**
 * Validates and decodes the session token.
 */
export function verifySessionToken(token: string): AuthUser | null {
  if (!token || !token.includes(".")) return null;

  try {
    const [base64, hash] = token.split(".");
    if (hash !== simpleHash(base64 + SESSION_SECRET)) {
      return null;
    }

    const jsonStr = Buffer.from(base64, "base64url").toString("utf-8");
    const payload: SessionPayload = JSON.parse(jsonStr);

    if (!payload.id || !payload.role || !payload.expiresAt) {
      return null;
    }

    if (Date.now() > payload.expiresAt) {
      return null; // Expired
    }

    return {
      id: payload.id,
      role: payload.role,
      name: payload.name,
      email: payload.email,
      medicalCouncil: payload.medicalCouncil,
      registrationNumber: payload.registrationNumber,
      institution: payload.institution,
    };
  } catch {
    return null;
  }
}

/**
 * Lightweight hash for tamper detection across edge and node runtimes.
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}
