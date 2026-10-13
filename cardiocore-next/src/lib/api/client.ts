/**
 * CardioCore Base API Client Skeleton
 * 
 * Configured for FastAPI backend integration.
 * In Phase 1, no fake endpoints or simulated network success responses are fabricated.
 * Real endpoints will be connected when backend source code/API contracts are provided.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Prepared typed fetch wrapper.
   * Throws informative error if backend is unavailable.
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`API Request failed with status ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown network error";
      // Explicitly propagate real network status without faking data
      throw new Error(`Backend unavailable at ${url}: ${message}`);
    }
  }
}

export const apiClient = new ApiClient();
