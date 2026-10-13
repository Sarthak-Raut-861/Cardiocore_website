/**
 * CardioCoreEdge Multi-Lead Telemetry Recording API Client
 * 
 * Provides typed access to:
 * - Recording metadata: GET /api/v1/telemetry/recordings/{id}
 * - Recording chunk list: GET /api/v1/telemetry/recordings/{id}/chunks
 * - Read-only chunk samples: GET /api/v1/telemetry/recordings/{id}/chunks/{chunk_id}/samples
 * - Recording creation & status updates (mutation endpoints with CSRF)
 * 
 * Enforces session credentials, CSRF tokens on mutations, and explicit error states.
 */

import { API_BASE_URL } from "./backend-config";
import { getCsrfHeaders, assertCsrfToken } from "./csrf";

export class RecordingApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "RecordingApiError";
    this.status = status;
    this.code = code;
  }
}

export interface TelemetryRecordingMetadata {
  id: string;
  patientId: string;
  deviceId: string;
  leadConfig: "12-lead" | "6-lead" | "3-lead" | "single-lead";
  activeLeadsMask: number;
  samplingRateHz: number;
  status: "active" | "paused" | "completed" | "archived";
  startedAt: string;
  endedAt?: string | null;
  notes?: string | null;
  chunkCount: number;
  totalSamplesPerLead: number;
}

export interface TelemetryRecordingChunkItem {
  id: string;
  sequenceNumber: number;
  startTimestamp: string;
  endTimestamp: string;
  sampleCount: number;
  channelCount: number;
  activeLeadsMask: number;
  leadOffMask: number;
  clippingMask: number;
  averageSqi: number;
  compressionCodec: string;
  uncompressedBytes: number;
  compressedBytes: number;
  checksumSha256: string;
}

export interface TelemetryRecordingChunkListResponse {
  recordingId: string;
  offset: number;
  limit: number;
  chunks: TelemetryRecordingChunkItem[];
}

export interface TelemetryChunkSamplesResponse {
  recordingId: string;
  chunkId: string;
  sequenceNumber: number;
  startTimestamp?: string | null;
  endTimestamp?: string | null;
  samplingRateHz: number;
  activeLeadsMask: number;
  channelOrder: string[];
  channelCount: number;
  sampleCount: number;
  compressionCodec: string;
  uncompressedBytes: number;
  compressedBytes: number;
  payloadBase64: string;
  payloadChecksumSha256: string;
  averageSqi: number;
  leadOffMask: number;
  clippingMask: number;
}

export interface CreateRecordingParams {
  patientId: string;
  deviceId: string;
  leadConfig: "12-lead" | "6-lead" | "3-lead" | "single-lead";
  activeLeadsMask: number;
  samplingRateHz: number;
  notes?: string;
}

export interface UpdateRecordingStatusParams {
  status: "active" | "paused" | "completed" | "archived";
}

async function handleApiResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Server error ${res.status}: ${res.statusText}`;
    try {
      const err = await res.json();
      detail = err.detail || err.message || detail;
    } catch {
      // Non-JSON response
    }
    throw new RecordingApiError(detail, res.status);
  }
  return (await res.json()) as T;
}

/**
 * Retrieves recording metadata and aggregate stats.
 * Read-only endpoint. Requires authenticated session.
 */
export async function getRecordingMetadata(
  recordingId: string
): Promise<TelemetryRecordingMetadata> {
  const url = `${API_BASE_URL}/telemetry/recordings/${encodeURIComponent(recordingId)}`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });
  return handleApiResponse<TelemetryRecordingMetadata>(res);
}

/**
 * Lists persisted multi-channel chunks for a recording with pagination.
 * Read-only endpoint. Requires authenticated session.
 */
export async function listRecordingChunks(
  recordingId: string,
  options: { offset?: number; limit?: number } = {}
): Promise<TelemetryRecordingChunkListResponse> {
  const params = new URLSearchParams();
  if (options.offset !== undefined) params.set("offset", String(options.offset));
  if (options.limit !== undefined) params.set("limit", String(options.limit));

  const query = params.toString() ? `?${params.toString()}` : "";
  const url = `${API_BASE_URL}/telemetry/recordings/${encodeURIComponent(recordingId)}/chunks${query}`;

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });
  return handleApiResponse<TelemetryRecordingChunkListResponse>(res);
}

/**
 * Retrieves the base64-encoded binary waveform payload and metadata of a persisted multi-lead chunk.
 * Read-only endpoint. Requires authenticated session and patient ownership / clinician consent.
 */
export async function getChunkSamples(
  recordingId: string,
  chunkId: string
): Promise<TelemetryChunkSamplesResponse> {
  const url = `${API_BASE_URL}/telemetry/recordings/${encodeURIComponent(
    recordingId
  )}/chunks/${encodeURIComponent(chunkId)}/samples`;

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });
  return handleApiResponse<TelemetryChunkSamplesResponse>(res);
}

/**
 * Creates a new multi-lead ECG recording.
 * Mutating endpoint. Requires CSRF verification and clinician/patient authorization.
 */
export async function createRecording(
  params: CreateRecordingParams
): Promise<TelemetryRecordingMetadata> {
  assertCsrfToken();
  const url = `${API_BASE_URL}/telemetry/recordings`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...getCsrfHeaders(),
    },
    body: JSON.stringify({
      patient_id: params.patientId,
      device_id: params.deviceId,
      lead_config: params.leadConfig,
      active_leads_mask: params.activeLeadsMask,
      sampling_rate_hz: params.samplingRateHz,
      notes: params.notes,
    }),
  });
  return handleApiResponse<TelemetryRecordingMetadata>(res);
}

/**
 * Updates recording status (e.g. mark completed).
 * Mutating endpoint. Requires CSRF verification.
 */
export async function updateRecordingStatus(
  recordingId: string,
  status: "active" | "paused" | "completed" | "archived"
): Promise<{ id: string; status: string; endedAt?: string | null }> {
  assertCsrfToken();
  const url = `${API_BASE_URL}/telemetry/recordings/${encodeURIComponent(recordingId)}/status`;
  const res = await fetch(url, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...getCsrfHeaders(),
    },
    body: JSON.stringify({ status }),
  });
  return handleApiResponse<{ id: string; status: string; endedAt?: string | null }>(res);
}
