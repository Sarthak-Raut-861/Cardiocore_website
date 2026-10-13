"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  unpackTelemetryFrame,
  TelemetryHeader,
  TelemetryFrame,
  MSG_TYPE_ECG_DATA,
  MSG_TYPE_ERROR,
} from "./protocol";

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "unavailable";

export interface StreamStats {
  framesReceived: number;
  missingGaps: number;
  duplicates: number;
  lastSequence: number;
  samplingRateHz: number;
  leadName: string;
  isStale: boolean;
  lastFrameTimeMs: number;
}

export interface UseTelemetryStreamOptions {
  wsUrl?: string;
  enabled?: boolean;
  bufferCapacity?: number; // Maximum samples to retain in memory (default: 1250 = 5 sec @ 250Hz)
  maxReconnectAttempts?: number;
}

export function useTelemetryStream({
  wsUrl,
  enabled = true,
  bufferCapacity = 1250,
  maxReconnectAttempts = 5,
}: UseTelemetryStreamOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(() =>
    enabled && wsUrl ? "connecting" : "disconnected"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastHeader, setLastHeader] = useState<TelemetryHeader | null>(null);
  const [samples, setSamples] = useState<number[]>([]);

  const [stats, setStats] = useState<StreamStats>({
    framesReceived: 0,
    missingGaps: 0,
    duplicates: 0,
    lastSequence: 0,
    samplingRateHz: 250,
    leadName: "Lead-II",
    isStale: false,
    lastFrameTimeMs: 0,
  });

  const [qualityFlags, setQualityFlags] = useState({
    isLeadOff: false,
    isClipped: false,
    isClockUnsync: false,
  });

  // Connection management refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const staleCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPacketTimestampRef = useRef<number>(0);
  const isUnmountedRef = useRef(false);
  const connectFnRef = useRef<() => void>(() => {});

  const cleanupSocket = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (staleCheckTimerRef.current) {
      clearInterval(staleCheckTimerRef.current);
      staleCheckTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!wsUrl || !enabled || isUnmountedRef.current) {
      return;
    }

    cleanupSocket();
    setConnectionState(reconnectAttemptRef.current > 0 ? "reconnecting" : "connecting");
    setErrorMessage(null);

    try {
      const ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmountedRef.current) return;
        reconnectAttemptRef.current = 0;
        setConnectionState("connected");
        lastPacketTimestampRef.current = Date.now();
      };

      ws.onmessage = (event: MessageEvent) => {
        if (isUnmountedRef.current) return;
        if (!(event.data instanceof ArrayBuffer)) return;

        try {
          const frame: TelemetryFrame = unpackTelemetryFrame(event.data);
          const hdr = frame.header;

          if (hdr.msgType === MSG_TYPE_ERROR) {
            setErrorMessage(`Server stream error: flags=0x${hdr.flags.toString(16)}`);
            return;
          }

          if (hdr.msgType !== MSG_TYPE_ECG_DATA) {
            return;
          }

          lastPacketTimestampRef.current = Date.now();
          setLastHeader(hdr);

          // Update Quality Flags
          setQualityFlags({
            isLeadOff: hdr.isLeadOff,
            isClipped: hdr.isClipped,
            isClockUnsync: hdr.isClockUnsync,
          });

          // Sequence tracking & Gap detection
          setStats((prev) => {
            let gaps = prev.missingGaps;
            let dups = prev.duplicates;

            if (prev.lastSequence > 0) {
              const diff = (hdr.sequenceNumber - prev.lastSequence) & 0xFFFFFFFF;
              if (diff === 0 || diff >= 0x80000000) {
                dups += 1;
              } else if (diff > 1) {
                gaps += diff - 1;
              }
            }

            return {
              ...prev,
              framesReceived: prev.framesReceived + 1,
              missingGaps: gaps,
              duplicates: dups,
              lastSequence: hdr.sequenceNumber,
              samplingRateHz: hdr.samplingRateHz || 250,
              isStale: false,
              lastFrameTimeMs: hdr.baseTimestampMs,
            };
          });

          // Append samples to bounded circular ring buffer
          if (frame.samples.length > 0) {
            setSamples((prev) => {
              const next = [...prev, ...frame.samples];
              if (next.length > bufferCapacity) {
                return next.slice(-bufferCapacity);
              }
              return next;
            });
          }

        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Frame decode error";
          setErrorMessage(msg);
        }
      };

      ws.onerror = () => {
        if (isUnmountedRef.current) return;
        setErrorMessage("WebSocket connection error");
      };

      ws.onclose = (event: CloseEvent) => {
        if (isUnmountedRef.current) return;
        wsRef.current = null;

        // Code 4401 or 4403: authorization failure -> do not retry blindly
        if (event.code === 4401 || event.code === 4403) {
          setConnectionState("unavailable");
          setErrorMessage(
            event.code === 4401
              ? "Authentication expired or invalid. Please re-authenticate."
              : "Access denied or consent revoked. Live stream disconnected."
          );
          return;
        }

        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          reconnectAttemptRef.current += 1;
          setConnectionState("reconnecting");

          // Exponential backoff with jitter: base * 2^attempt ± 20%
          const baseDelay = Math.min(15000, 1000 * Math.pow(2, reconnectAttemptRef.current - 1));
          const jitter = baseDelay * (0.8 + Math.random() * 0.4);

          reconnectTimerRef.current = setTimeout(() => {
            connectFnRef.current();
          }, jitter);
        } else {
          setConnectionState("unavailable");
          setErrorMessage(
            `Streaming server unavailable after ${maxReconnectAttempts} reconnection attempts. Demonstration fallback disabled per safety policy.`
          );
        }
      };

    } catch (err: unknown) {
      setConnectionState("unavailable");
      setErrorMessage(err instanceof Error ? err.message : "Connection failed");
    }
  }, [wsUrl, enabled, bufferCapacity, maxReconnectAttempts, cleanupSocket]);

  // Keep connect ref current
  useEffect(() => {
    connectFnRef.current = connect;
  }, [connect]);

  // Periodic Stale-Data Checker (every 1 second)
  useEffect(() => {
    staleCheckTimerRef.current = setInterval(() => {
      if (connectionState === "connected" && lastPacketTimestampRef.current > 0) {
        const elapsedSincePacket = Date.now() - lastPacketTimestampRef.current;
        if (elapsedSincePacket > 3000) {
          setStats((prev) => ({ ...prev, isStale: true }));
        }
      }
    }, 1000);

    return () => {
      if (staleCheckTimerRef.current) {
        clearInterval(staleCheckTimerRef.current);
      }
    };
  }, [connectionState]);

  // Mount/Unmount lifecycle
  useEffect(() => {
    isUnmountedRef.current = false;
    if (enabled && wsUrl) {
      connect();
    }

    return () => {
      isUnmountedRef.current = true;
      cleanupSocket();
    };
  }, [enabled, wsUrl, connect, cleanupSocket]);

  const resetBuffer = useCallback(() => {
    setSamples([]);
  }, []);

  const manualReconnect = useCallback(() => {
    reconnectAttemptRef.current = 0;
    connect();
  }, [connect]);

  return {
    connectionState,
    errorMessage,
    lastHeader,
    stats,
    qualityFlags,
    samples,
    reconnect: manualReconnect,
    disconnect: cleanupSocket,
    resetBuffer,
  };
}
