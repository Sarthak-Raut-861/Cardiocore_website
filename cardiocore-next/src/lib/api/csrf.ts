/**
 * CardioCoreEdge CSRF Protection Helper
 * 
 * Implements double-submit cookie validation matching FastAPI backend.
 * The session sets a non-HttpOnly cookie named `cc_csrf`.
 * For state-mutating requests (POST, PATCH, PUT, DELETE), clients must include
 * the header `X-CSRF-Token: <token>`.
 */

export const CSRF_COOKIE_NAME = "cc_csrf";
export const CSRF_HEADER_NAME = "X-CSRF-Token";

export class CsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsrfError";
  }
}

/**
 * Extracts the CSRF token from document.cookie in browser environments.
 * Returns null if not in browser or cookie is absent.
 */
export function getCsrfToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(`${CSRF_COOKIE_NAME}=`)) {
      const val = trimmed.substring(CSRF_COOKIE_NAME.length + 1);
      return decodeURIComponent(val);
    }
  }

  return null;
}

/**
 * Returns header object containing X-CSRF-Token if available.
 */
export function getCsrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  if (token) {
    return { [CSRF_HEADER_NAME]: token };
  }
  return {};
}

/**
 * Verifies that a CSRF token is available, or throws CsrfError.
 * Used before dispatching mutating requests (POST, PATCH, DELETE).
 */
export function assertCsrfToken(): string {
  const token = getCsrfToken();
  if (!token) {
    throw new CsrfError(
      `CSRF token missing: cookie '${CSRF_COOKIE_NAME}' not found. Cannot safely execute state-mutating request.`
    );
  }
  return token;
}
