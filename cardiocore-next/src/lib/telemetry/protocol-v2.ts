/**
 * CardioCoreEdge Telemetry Binary Protocol (v2) Decoder
 * 
 * - 32-Byte Fixed Synchronized Multi-Channel Header
 * - Big-endian network byte order for header fields
 * - IEEE 802.3 CRC-32 integrity validation (covering header bytes 0..27 + payload)
 * - Planar channel layout (channel-by-channel sequential sample arrays)
 * - 16-bit signed integer (int16) physiological sample parsing
 * - Planar delta-zlib decompression with decompression bomb protection
 * - Standard 12-lead bitmask constants and channel ordering
 * 
 * Research prototype for synchronized multi-lead ECG research.
 * Not clinically validated or intended for diagnosis.
 */

export const MAGIC_BYTE = 0xCC;
export const PROTOCOL_VERSION_V2 = 0x02;
export const HEADER_SIZE_V2 = 32;
export const HEADER_PRE_CRC_SIZE = 28;
export const MAX_FRAME_SIZE = 65536; // 64 KiB ceiling
export const MAX_PAYLOAD_SIZE_V2 = MAX_FRAME_SIZE - HEADER_SIZE_V2; // 65,504 bytes
export const MAX_SAMPLE_COUNT = 5000; // Max samples per lead per frame
export const SENTINEL_MISSING_SAMPLE = -32768; // 0x8000 dropped/missing ADC sentinel
export const MAX_DECOMPRESSED_BYTES = 65536; // 64 KiB decompression expansion limit

// Message Types
export const MSG_TYPE_ECG_DATA = 0x01;
export const MSG_TYPE_HEARTBEAT = 0x02;
export const MSG_TYPE_ACK = 0x03;
export const MSG_TYPE_BACKPRESSURE = 0x04;
export const MSG_TYPE_ERROR = 0x05;

export const VALID_MSG_TYPES = new Set([
  MSG_TYPE_ECG_DATA,
  MSG_TYPE_HEARTBEAT,
  MSG_TYPE_ACK,
  MSG_TYPE_BACKPRESSURE,
  MSG_TYPE_ERROR,
]);

// Status and Control Flags
export const FLAG_DELTA_ZLIB = 0x01;   // Bit 0: planar delta + zlib compression
export const FLAG_LEAD_OFF = 0x02;     // Bit 1: physical lead disconnection
export const FLAG_CLIPPED = 0x04;      // Bit 2: ADC rail saturation / clipping
export const FLAG_CLOCK_UNSYNC = 0x08; // Bit 3: edge RTC unsynchronized
export const VALID_FLAGS_MASK = 0x0F;

// Standard 12-lead bitmask constants (bits 0..11)
export const LEAD_I_MASK = 0x0001;
export const LEAD_II_MASK = 0x0002;
export const LEAD_III_MASK = 0x0004;
export const LEAD_AVR_MASK = 0x0008;
export const LEAD_AVL_MASK = 0x0010;
export const LEAD_AVF_MASK = 0x0020;
export const LEAD_V1_MASK = 0x0040;
export const LEAD_V2_MASK = 0x0080;
export const LEAD_V3_MASK = 0x0100;
export const LEAD_V4_MASK = 0x0200;
export const LEAD_V5_MASK = 0x0400;
export const LEAD_V6_MASK = 0x0800;

export const ALL_12_LEADS_MASK = 0x0FFF;
export const ALL_6_LIMB_LEADS_MASK = 0x003F;
export const ALL_3_LEADS_MASK = 0x0007;
export const SINGLE_LEAD_II_MASK = 0x0002;

export const LEAD_NAMES_ORDER: readonly string[] = [
  "Lead-I",
  "Lead-II",
  "Lead-III",
  "Lead-aVR",
  "Lead-aVL",
  "Lead-aVF",
  "Lead-V1",
  "Lead-V2",
  "Lead-V3",
  "Lead-V4",
  "Lead-V5",
  "Lead-V6",
];

export const SUPPORTED_CHANNEL_CONFIGS: Record<string, number> = {
  "12-lead": ALL_12_LEADS_MASK,
  "6-lead": ALL_6_LIMB_LEADS_MASK,
  "3-lead": ALL_3_LEADS_MASK,
  "single-lead": SINGLE_LEAD_II_MASK,
};

export class ProtocolV2Error extends Error {
  code: number;
  constructor(message: string, code: number = 4000) {
    super(message);
    this.name = "ProtocolV2Error";
    this.code = code;
  }
}

// Precomputed CRC-32 IEEE 802.3 Table
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC32_TABLE[i] = c >>> 0;
}

export function computeCrc32(bytes: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ bytes[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

export function getActiveChannelCount(mask: number): number {
  let count = 0;
  for (let i = 0; i < 12; i++) {
    if ((mask & (1 << i)) !== 0) count++;
  }
  return count;
}

export function getActiveLeadNames(mask: number): string[] {
  const names: string[] = [];
  for (let i = 0; i < 12; i++) {
    if ((mask & (1 << i)) !== 0) {
      names.push(LEAD_NAMES_ORDER[i]);
    }
  }
  return names;
}

export interface MultiChannelHeader {
  magic: number;
  version: number;
  msgType: number;
  flags: number;
  sequenceNumber: number;
  baseTimestampMs: number;
  samplingRateHz: number;
  activeLeadsMask: number;
  sampleCount: number;
  payloadLength: number;
  leadOffMask: number;
  clippingMask: number;
  checksumCrc32: number;
  // Computed helpers
  activeChannelCount: number;
  activeLeadNames: string[];
  isCompressed: boolean;
  isLeadOff: boolean;
  isClipped: boolean;
  isClockUnsync: boolean;
}

export interface MultiChannelFrame {
  header: MultiChannelHeader;
  channels: Record<string, number[]>;
  channelList: Array<{ lead: string; samples: number[] }>;
  rawPayload: Uint8Array;
}

/**
 * Validates and unpacks the 32-byte binary header of a Protocol v2 frame.
 * Does not decompress or decode physiological sample payloads.
 */
export function unpackMultiChannelHeader(data: Uint8Array | ArrayBuffer): {
  header: MultiChannelHeader;
  payload: Uint8Array;
} {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const totalLen = bytes.byteLength;

  if (totalLen < HEADER_SIZE_V2) {
    throw new ProtocolV2Error(
      `Multi-channel frame underflow: received ${totalLen} bytes, minimum required ${HEADER_SIZE_V2} bytes`,
      4002
    );
  }

  if (totalLen > MAX_FRAME_SIZE) {
    throw new ProtocolV2Error(
      `Frame overflow: received ${totalLen} bytes, maximum allowed ${MAX_FRAME_SIZE} bytes`,
      4001
    );
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const magic = view.getUint8(0);
  if (magic !== MAGIC_BYTE) {
    throw new ProtocolV2Error(
      `Invalid protocol magic: 0x${magic.toString(16).toUpperCase().padStart(2, "0")} (expected 0x${MAGIC_BYTE.toString(16).toUpperCase()})`,
      4003
    );
  }

  const version = view.getUint8(1);
  if (version !== PROTOCOL_VERSION_V2) {
    throw new ProtocolV2Error(
      `Unsupported protocol version: ${version} (expected ${PROTOCOL_VERSION_V2})`,
      4004
    );
  }

  const msgType = view.getUint8(2);
  if (!VALID_MSG_TYPES.has(msgType)) {
    throw new ProtocolV2Error(
      `Unsupported message type: 0x${msgType.toString(16).toUpperCase().padStart(2, "0")}`,
      4008
    );
  }

  const flags = view.getUint8(3);
  if ((flags & ~VALID_FLAGS_MASK) !== 0) {
    throw new ProtocolV2Error(
      `Reserved flag bits set: 0x${flags.toString(16).toUpperCase().padStart(2, "0")}`,
      4009
    );
  }

  const sequenceNumber = view.getUint32(4, false); // Big-Endian
  const baseTimestampMs = Number(view.getBigUint64(8, false));
  const samplingRateHz = view.getUint16(16, false);
  const activeLeadsMask = view.getUint16(18, false);
  const sampleCount = view.getUint16(20, false);
  const payloadLength = view.getUint16(22, false);
  const leadOffMask = view.getUint16(24, false);
  const clippingMask = view.getUint16(26, false);
  const checksumCrc32 = view.getUint32(28, false);

  if (activeLeadsMask === 0 || (activeLeadsMask & ~ALL_12_LEADS_MASK) !== 0) {
    throw new ProtocolV2Error(
      `Invalid active leads mask: 0x${activeLeadsMask.toString(16).toUpperCase().padStart(4, "0")}`,
      4010
    );
  }

  if (sampleCount > MAX_SAMPLE_COUNT) {
    throw new ProtocolV2Error(
      `Sample count ${sampleCount} exceeds limit ${MAX_SAMPLE_COUNT}`,
      4007
    );
  }

  if (payloadLength > MAX_PAYLOAD_SIZE_V2) {
    throw new ProtocolV2Error(
      `Declared payload length ${payloadLength} exceeds maximum payload limit ${MAX_PAYLOAD_SIZE_V2} bytes`,
      4001
    );
  }

  if (totalLen !== HEADER_SIZE_V2 + payloadLength) {
    throw new ProtocolV2Error(
      `Payload length mismatch: declared ${payloadLength} bytes, got ${totalLen - HEADER_SIZE_V2} bytes`,
      4005
    );
  }

  const payload = bytes.subarray(HEADER_SIZE_V2, HEADER_SIZE_V2 + payloadLength);

  // CRC-32 validation: covers bytes 0..27 (pre-CRC header) concatenated with payload
  const preCrcHeader = bytes.subarray(0, HEADER_PRE_CRC_SIZE);
  const crcInput = new Uint8Array(HEADER_PRE_CRC_SIZE + payloadLength);
  crcInput.set(preCrcHeader, 0);
  crcInput.set(payload, HEADER_PRE_CRC_SIZE);

  const computedCrc = computeCrc32(crcInput);
  if (computedCrc !== checksumCrc32) {
    throw new ProtocolV2Error(
      `Checksum mismatch: header CRC 0x${checksumCrc32.toString(16).toUpperCase().padStart(8, "0")} != computed 0x${computedCrc.toString(16).toUpperCase().padStart(8, "0")}`,
      4006
    );
  }

  const channelCount = getActiveChannelCount(activeLeadsMask);

  // For uncompressed physiological samples, check popcount alignment
  const isCompressed = Boolean(flags & FLAG_DELTA_ZLIB);
  if (!isCompressed && msgType === MSG_TYPE_ECG_DATA) {
    const expectedLen = channelCount * sampleCount * 2;
    if (payloadLength !== expectedLen) {
      throw new ProtocolV2Error(
        `Payload length mismatch for ${channelCount} channels: declared ${payloadLength} bytes, expected ${expectedLen} bytes`,
        4005
      );
    }
  }

  const header: MultiChannelHeader = {
    magic,
    version,
    msgType,
    flags,
    sequenceNumber,
    baseTimestampMs,
    samplingRateHz,
    activeLeadsMask,
    sampleCount,
    payloadLength,
    leadOffMask,
    clippingMask,
    checksumCrc32,
    activeChannelCount: channelCount,
    activeLeadNames: getActiveLeadNames(activeLeadsMask),
    isCompressed,
    isLeadOff: Boolean(flags & FLAG_LEAD_OFF) || leadOffMask !== 0,
    isClipped: Boolean(flags & FLAG_CLIPPED) || clippingMask !== 0,
    isClockUnsync: Boolean(flags & FLAG_CLOCK_UNSYNC),
  };

  return { header, payload };
}

/**
 * Decodes uncompressed planar channels of signed 16-bit integers.
 * Backend stores samples in little-endian (<h) by default, but supports big-endian if specified.
 */
export function decodeMultichannelRaw(
  payload: Uint8Array,
  channelCount: number,
  sampleCount: number,
  littleEndian: boolean = true
): number[][] {
  const bytesPerChannel = sampleCount * 2;
  const expectedTotal = channelCount * bytesPerChannel;
  if (payload.byteLength !== expectedTotal) {
    throw new ProtocolV2Error(
      `Payload length ${payload.byteLength} does not match expected planar size ${expectedTotal} bytes`,
      4005
    );
  }

  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  const channels: number[][] = [];

  for (let c = 0; c < channelCount; c++) {
    const channelOffset = c * bytesPerChannel;
    const samples: number[] = new Array(sampleCount);
    for (let s = 0; s < sampleCount; s++) {
      samples[s] = view.getInt16(channelOffset + s * 2, littleEndian);
    }
    channels.push(samples);
  }

  return channels;
}

/**
 * Reconstructs original samples from planar first-order deltas:
 * d[0] = s[0], d[i] = s[i] - s[i-1] -> s[i] = s[i-1] + d[i]
 * Preserves sentinel dropped sample (-32768).
 */
export function decodeMultichannelDelta(
  decompressedDeltas: Uint8Array,
  channelCount: number,
  sampleCount: number,
  littleEndian: boolean = true
): number[][] {
  const bytesPerChannel = sampleCount * 2;
  const expectedTotal = channelCount * bytesPerChannel;
  if (decompressedDeltas.byteLength !== expectedTotal) {
    throw new ProtocolV2Error(
      `Decompressed deltas length ${decompressedDeltas.byteLength} does not match expected ${expectedTotal} bytes`,
      4005
    );
  }

  const view = new DataView(
    decompressedDeltas.buffer,
    decompressedDeltas.byteOffset,
    decompressedDeltas.byteLength
  );
  const channels: number[][] = [];

  for (let c = 0; c < channelCount; c++) {
    const channelOffset = c * bytesPerChannel;
    const samples: number[] = new Array(sampleCount);
    if (sampleCount > 0) {
      const firstDelta = view.getInt16(channelOffset, littleEndian);
      samples[0] = firstDelta;
      for (let s = 1; s < sampleCount; s++) {
        const delta = view.getInt16(channelOffset + s * 2, littleEndian);
        if (delta === SENTINEL_MISSING_SAMPLE) {
          samples[s] = SENTINEL_MISSING_SAMPLE;
        } else {
          const prev = samples[s - 1];
          samples[s] = prev === SENTINEL_MISSING_SAMPLE ? delta : prev + delta;
        }
      }
    }
    channels.push(samples);
  }

  return channels;
}

/**
 * Asynchronously decompresses RFC 1950 zlib deflate stream using standard browser DecompressionStream.
 * Includes strict decompression bomb protection (caps expansion at maxBytes).
 */
export async function decompressZlib(
  compressedPayload: Uint8Array,
  maxBytes: number = MAX_DECOMPRESSED_BYTES
): Promise<Uint8Array> {
  if (compressedPayload.byteLength === 0) {
    return new Uint8Array(0);
  }

  if (typeof DecompressionStream === "undefined") {
    throw new ProtocolV2Error(
      "DecompressionStream is not supported in this runtime environment. Delta-zlib decompression requires modern browser or Node 18+.",
      4012
    );
  }

  try {
    const ds = new DecompressionStream("deflate");
    const writer = ds.writable.getWriter();
    // Copy to a fresh ArrayBuffer to ensure plain ArrayBuffer type compatibility
    const buffer = new ArrayBuffer(compressedPayload.byteLength);
    const inputChunk = new Uint8Array(buffer);
    inputChunk.set(compressedPayload);

    // Write data asynchronously and safely handle cancellation aborts
    const writePromise = writer
      .write(inputChunk)
      .then(() => writer.close())
      .catch(() => {
        // Stream aborted due to decompression limit cancellation
      });

    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel();
          throw new ProtocolV2Error(
            `Decompression exceeded safe limit of ${maxBytes} bytes (decompression bomb protection)`,
            4011
          );
        }
        chunks.push(value);
      }
    }

    await writePromise;

    // Concatenate chunks
    const result = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  } catch (err: unknown) {
    if (err instanceof ProtocolV2Error) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new ProtocolV2Error(`Decompression failed: ${msg}`, 4013);
  }
}

/**
 * Asynchronous full unpacker for Protocol v2 frames.
 * Validates header, CRC-32, decodes raw or planar delta-zlib sample payloads,
 * and organizes samples by channel name according to LEAD_NAMES_ORDER.
 */
export async function unpackMultiChannelFrame(
  buffer: ArrayBuffer | Uint8Array,
  options: { littleEndian?: boolean; maxDecompressedBytes?: number } = {}
): Promise<MultiChannelFrame> {
  const { header, payload } = unpackMultiChannelHeader(buffer);
  const littleEndian = options.littleEndian ?? true;
  const maxBytes = options.maxDecompressedBytes ?? MAX_DECOMPRESSED_BYTES;

  let rawChannels: number[][] = [];

  if (header.msgType === MSG_TYPE_ECG_DATA && header.sampleCount > 0) {
    if (header.isCompressed) {
      const decompressed = await decompressZlib(payload, maxBytes);
      rawChannels = decodeMultichannelDelta(
        decompressed,
        header.activeChannelCount,
        header.sampleCount,
        littleEndian
      );
    } else {
      rawChannels = decodeMultichannelRaw(
        payload,
        header.activeChannelCount,
        header.sampleCount,
        littleEndian
      );
    }
  }

  const channels: Record<string, number[]> = {};
  const channelList: Array<{ lead: string; samples: number[] }> = [];

  header.activeLeadNames.forEach((name, idx) => {
    const samples = rawChannels[idx] || [];
    channels[name] = samples;
    channelList.push({ lead: name, samples });
  });

  return {
    header,
    channels,
    channelList,
    rawPayload: payload,
  };
}

/**
 * Synchronous unpacker for uncompressed Protocol v2 frames.
 * Throws ProtocolV2Error if frame payload is compressed.
 */
export function unpackMultiChannelFrameSync(
  buffer: ArrayBuffer | Uint8Array,
  options: { littleEndian?: boolean } = {}
): MultiChannelFrame {
  const { header, payload } = unpackMultiChannelHeader(buffer);
  const littleEndian = options.littleEndian ?? true;

  if (header.isCompressed) {
    throw new ProtocolV2Error(
      "Cannot synchronously unpack compressed delta-zlib frame; use unpackMultiChannelFrame instead.",
      4014
    );
  }

  let rawChannels: number[][] = [];
  if (header.msgType === MSG_TYPE_ECG_DATA && header.sampleCount > 0) {
    rawChannels = decodeMultichannelRaw(
      payload,
      header.activeChannelCount,
      header.sampleCount,
      littleEndian
    );
  }

  const channels: Record<string, number[]> = {};
  const channelList: Array<{ lead: string; samples: number[] }> = [];

  header.activeLeadNames.forEach((name, idx) => {
    const samples = rawChannels[idx] || [];
    channels[name] = samples;
    channelList.push({ lead: name, samples });
  });

  return {
    header,
    channels,
    channelList,
    rawPayload: payload,
  };
}
