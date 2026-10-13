"use client";

/**
 * CardioCoreEdge Synchronized Multi-Lead Recording Hook
 * 
 * Manages bounded, synchronized multi-channel physiological sample buffers
 * for persisted or active recordings.
 * 
 * Features:
 * - Bounded sliding memory window (default 1,250 samples/channel = 5s at 250 Hz).
 * - Tracks sequence numbers, deduplicates chunks, detects sequence gaps.
 * - Decodes Protocol v2 binary payloads (raw or delta-zlib) in browser.
 * - Distinguishes dropped/sentinel samples (-32768) from true zero values.
 * - Handles loading, polling, error isolation, authorization failures, and unmount cleanup.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  getRecordingMetadata,
  listRecordingChunks,
  getChunkSamples,
  TelemetryRecordingMetadata,
} from "@/lib/api/recordings";
import {
  unpackMultiChannelFrame,
  decodeMultichannelRaw,
  decodeMultichannelDelta,
  decompressZlib,
  MAGIC_BYTE,
  PROTOCOL_VERSION_V2,
  SENTINEL_MISSING_SAMPLE,
  getActiveLeadNames,
} from "@/lib/telemetry/protocol-v2";

export interface MultiLeadRecordingOptions {
  maxSamplesPerLead?: number; // Maximum buffer capacity per active lead (default: 1,250)
  autoPoll?: boolean; // Whether to poll for newly ingested chunks
  pollIntervalMs?: number; // Polling cadence (default: 3000ms)
  enabled?: boolean; // Feature flag guard (default: true)
}

export interface MultiLeadRecordingState {
  metadata: TelemetryRecordingMetadata | null;
  channels: Record<string, number[]>;
  activeLeads: string[];
  samplingRateHz: number;
  latestSequenceNumber: number | null;
  sequenceGaps: number;
  averageSqi: number | null;
  leadOffMask: number;
  clippingMask: number;
  processedChunkCount: number;
  isLoading: boolean;
  isStale: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof window !== "undefined" && typeof window.atob === "function") {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  // Fallback for Node.js environments
  const buf = Buffer.from(base64, "base64");
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

export function useMultiLeadRecording(
  recordingId: string | null,
  options: MultiLeadRecordingOptions = {}
): MultiLeadRecordingState {
  const {
    maxSamplesPerLead = 1250, // 5 seconds at 250 Hz
    autoPoll = false,
    pollIntervalMs = 3000,
    enabled = true,
  } = options;

  const [metadata, setMetadata] = useState<TelemetryRecordingMetadata | null>(null);
  const [channels, setChannels] = useState<Record<string, number[]>>({});
  const [activeLeads, setActiveLeads] = useState<string[]>([]);
  const [samplingRateHz, setSamplingRateHz] = useState<number>(250);
  const [latestSequenceNumber, setLatestSequenceNumber] = useState<number | null>(null);
  const [sequenceGaps, setSequenceGaps] = useState<number>(0);
  const [averageSqi, setAverageSqi] = useState<number | null>(null);
  const [leadOffMask, setLeadOffMask] = useState<number>(0);
  const [clippingMask, setClippingMask] = useState<number>(0);
  const [processedChunkCount, setProcessedChunkCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Mutable tracking references to avoid unnecessary state re-renders
  const processedChunkIdsRef = useRef<Set<string>>(new Set());
  const channelBuffersRef = useRef<Record<string, number[]>>({});
  const lastSeqRef = useRef<number | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const activeRecordingIdRef = useRef<string | null>(recordingId);

  const resetInternalState = useCallback(() => {
    processedChunkIdsRef.current.clear();
    channelBuffersRef.current = {};
    lastSeqRef.current = null;
    setMetadata(null);
    setChannels({});
    setActiveLeads([]);
    setLatestSequenceNumber(null);
    setSequenceGaps(0);
    setAverageSqi(null);
    setLeadOffMask(0);
    setClippingMask(0);
    setProcessedChunkCount(0);
    setError(null);
    setIsStale(false);
  }, []);

  const loadRecordingData = useCallback(async () => {
    if (!enabled || !recordingId || isFetchingRef.current) return;

    if (activeRecordingIdRef.current !== recordingId) {
      activeRecordingIdRef.current = recordingId;
      resetInternalState();
    }

    isFetchingRef.current = true;
    if (processedChunkIdsRef.current.size === 0) {
      setIsLoading(true);
    }

    try {
      // 1. Fetch metadata
      const meta = await getRecordingMetadata(recordingId);
      if (!isMountedRef.current) return;
      setMetadata(meta);
      setSamplingRateHz(meta.samplingRateHz);

      const leads = getActiveLeadNames(meta.activeLeadsMask);
      setActiveLeads(leads);

      // Initialize empty buffers if not yet present
      leads.forEach((lead) => {
        if (!channelBuffersRef.current[lead]) {
          channelBuffersRef.current[lead] = [];
        }
      });

      // 2. Fetch chunk list
      const chunkList = await listRecordingChunks(recordingId, { limit: 100 });
      if (!isMountedRef.current) return;

      // Sort by sequence number ascending
      const sortedChunks = [...chunkList.chunks].sort(
        (a, b) => a.sequenceNumber - b.sequenceNumber
      );

      let newChunksProcessed = 0;
      let latestSqi: number | null = null;
      let latestLeadOff = 0;
      let latestClipping = 0;
      let gapsDetected = 0;

      for (const chunk of sortedChunks) {
        if (processedChunkIdsRef.current.has(chunk.id)) {
          continue; // Deduplicate
        }

        // Sequence monotonicity and gap tracking
        if (lastSeqRef.current !== null) {
          const expectedSeq = lastSeqRef.current + 1;
          if (chunk.sequenceNumber > expectedSeq) {
            gapsDetected += chunk.sequenceNumber - expectedSeq;
          }
        }
        lastSeqRef.current = chunk.sequenceNumber;

        // Fetch chunk sample payload
        const samplePayload = await getChunkSamples(recordingId, chunk.id);
        if (!isMountedRef.current) return;

        const payloadBytes = base64ToUint8Array(samplePayload.payloadBase64);

        let newSamplesByLead: Record<string, number[]> = {};

        // 1. If payload begins with a 32-byte Protocol v2 binary header, decode full wire frame
        if (
          payloadBytes.length >= 32 &&
          payloadBytes[0] === MAGIC_BYTE &&
          payloadBytes[1] === PROTOCOL_VERSION_V2
        ) {
          const decodedFrame = await unpackMultiChannelFrame(payloadBytes);
          newSamplesByLead = decodedFrame.channels;
        } else {
          // 2. Decode inner payload according to backend API contract and compressionCodec
          const channelCount = samplePayload.channelCount;
          const sampleCount = samplePayload.sampleCount;
          const codec = samplePayload.compressionCodec;
          const channelOrder = samplePayload.channelOrder || leads;

          if (channelCount <= 0 || sampleCount <= 0) {
            throw new Error(
              `Invalid chunk dimensions: ${channelCount} channels, ${sampleCount} samples.`
            );
          }

          let channelArrays: number[][];

          if (codec === "raw") {
            channelArrays = decodeMultichannelRaw(payloadBytes, channelCount, sampleCount, true);
          } else if (codec === "delta_zlib_planar") {
            const decompressed = await decompressZlib(payloadBytes);
            channelArrays = decodeMultichannelDelta(
              decompressed,
              channelCount,
              sampleCount,
              true
            );
          } else {
            throw new Error(`Unsupported chunk compression codec: '${codec}'.`);
          }

          channelOrder.forEach((leadName, idx) => {
            if (idx < channelArrays.length) {
              newSamplesByLead[leadName] = channelArrays[idx];
            }
          });
        }

        // Append to synchronized channel buffers
        for (const lead of leads) {
          const newSamples = newSamplesByLead[lead] || [];
          const currentBuf = channelBuffersRef.current[lead] || [];
          const combined = currentBuf.concat(newSamples);

          // Bounded sliding window enforcement
          channelBuffersRef.current[lead] =
            combined.length > maxSamplesPerLead
              ? combined.slice(combined.length - maxSamplesPerLead)
              : combined;
        }

        processedChunkIdsRef.current.add(chunk.id);
        newChunksProcessed++;
        latestSqi = chunk.averageSqi;
        latestLeadOff = chunk.leadOffMask;
        latestClipping = chunk.clippingMask;
      }

      if (isMountedRef.current) {
        if (newChunksProcessed > 0) {
          // Clone buffers to update React state in a single batch
          const updatedChannels: Record<string, number[]> = {};
          for (const lead of leads) {
            updatedChannels[lead] = [...(channelBuffersRef.current[lead] || [])];
          }
          setChannels(updatedChannels);
          setLatestSequenceNumber(lastSeqRef.current);
          setProcessedChunkCount(processedChunkIdsRef.current.size);
          if (latestSqi !== null) setAverageSqi(latestSqi);
          setLeadOffMask(latestLeadOff);
          setClippingMask(latestClipping);
          if (gapsDetected > 0) {
            setSequenceGaps((prev) => prev + gapsDetected);
          }
          setIsStale(false);
        } else if (processedChunkIdsRef.current.size > 0 && meta.status === "completed") {
          setIsStale(false);
        }
        setError(null);
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const msg = err instanceof Error ? err.message : "Failed to load telemetry recording";
      setError(msg);
      setIsStale(true);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    }
  }, [enabled, recordingId, maxSamplesPerLead, resetInternalState]);

  useEffect(() => {
    isMountedRef.current = true;
    let isCancelled = false;

    if (enabled && recordingId) {
      void (async () => {
        if (!isCancelled) {
          await loadRecordingData();
        }
      })();
    }

    return () => {
      isCancelled = true;
      isMountedRef.current = false;
    };
  }, [enabled, recordingId, loadRecordingData]);

  // Polling support for active recordings
  useEffect(() => {
    if (!enabled || !autoPoll || !recordingId) return;

    const interval = setInterval(() => {
      if (metadata && metadata.status === "completed") {
        clearInterval(interval);
        return;
      }
      void loadRecordingData();
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [enabled, autoPoll, recordingId, metadata, pollIntervalMs, loadRecordingData]);

  return {
    metadata,
    channels,
    activeLeads,
    samplingRateHz,
    latestSequenceNumber,
    sequenceGaps,
    averageSqi,
    leadOffMask,
    clippingMask,
    processedChunkCount,
    isLoading,
    isStale,
    error,
    refresh: loadRecordingData,
  };
}
export { SENTINEL_MISSING_SAMPLE };
