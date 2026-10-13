/**
 * CardioCoreEdge Backend Integration Configuration
 * 
 * In accordance with Phase 8 Approved Decisions:
 * - Default mode is DEMONSTRATION MODE.
 * - Live FastAPI integration requires explicit development configuration:
 *   NEXT_PUBLIC_ENABLE_REAL_BACKEND=true
 * - Never mixes demonstration records with real server records without explicit provenance badges.
 * - Handles loading, empty, unavailable, and error states explicitly.
 */

export const IS_REAL_BACKEND_ENABLED: boolean =
  process.env.NEXT_PUBLIC_ENABLE_REAL_BACKEND === "true";

export const IS_MULTILEAD_ENABLED: boolean =
  process.env.NEXT_PUBLIC_ENABLE_MULTILEAD_ECG === "true";

export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export interface BackendHealthStatus {
  status: "online" | "offline" | "disabled";
  service?: string;
  version?: string;
  error?: string;
}

/**
 * Check backend health and readiness without throwing.
 */
export async function checkBackendHealth(): Promise<BackendHealthStatus> {
  if (!IS_REAL_BACKEND_ENABLED) {
    return { status: "disabled" };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        status: "online",
        service: data.service,
        version: data.version,
      };
    }
    return { status: "offline", error: `HTTP ${res.status}: ${res.statusText}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network failure";
    return { status: "offline", error: message };
  }
}

/**
 * Fetch authenticated patient profile from real backend.
 * Explicitly surfaces loading, empty, and error states without silent fallback.
 */
export async function fetchServerPatientProfile() {
  const res = await fetch(`${API_BASE_URL}/patients/me`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    let detail = `Error ${res.status}`;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {
      // non-JSON
    }
    throw new Error(detail);
  }

  return await res.json();
}

/**
 * Fetch clinician roster from real backend.
 */
export async function fetchServerDoctorRoster() {
  const res = await fetch(`${API_BASE_URL}/doctors/roster`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    let detail = `Error ${res.status}`;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {
      // non-JSON
    }
    throw new Error(detail);
  }

  return await res.json();
}

/**
 * Returns formatted WebSocket telemetry stream URL.
 */
export function getWebSocketTelemetryUrl(sessionToken: string = "dev_synthetic_token"): string {
  const wsBase = API_BASE_URL.replace(/^http/, "ws");
  return `${wsBase}/telemetry/ws/${sessionToken}?mode=monitor`;
}
