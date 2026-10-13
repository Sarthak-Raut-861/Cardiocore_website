/**
 * CardioCoreEdge Telemetry Binary Protocol (v1) Decoder
 * - 28-Byte Fixed Binary Header
 * - CRC-32 Payload Verification (IEEE 802.3 standard)
 * - 16-bit Signed Integer (int16) Physiological Sample Parsing
 * - Quality Flags Decoding (Lead-Off, Clipping, Clock Drift)
 */

export const MAGIC_BYTE = 0xCC;
export const PROTOCOL_VERSION = 0x01;
export const HEADER_SIZE = 28;
export const MAX_FRAME_SIZE = 65536;
export const MAX_PAYLOAD_SIZE = 65508;

// Message Types
export const MSG_TYPE_ECG_DATA = 0x01;
export const MSG_TYPE_HEARTBEAT = 0x02;
export const MSG_TYPE_ACK = 0x03;
export const MSG_TYPE_BACKPRESSURE = 0x04;
export const MSG_TYPE_ERROR = 0x05;

// Quality and State Flags
export const FLAG_DELTA_ZLIB = 0x01;
export const FLAG_LEAD_OFF = 0x02;
export const FLAG_CLIPPED = 0x04;
export const FLAG_CLOCK_UNSYNC = 0x08;

export interface TelemetryHeader {
  magic: number;
  version: number;
  msgType: number;
  flags: number;
  sequenceNumber: number;
  baseTimestampMs: number;
  samplingRateHz: number;
  channelId: number;
  sampleCount: number;
  payloadLength: number;
  checksumCrc32: number;
  // Decoded helper flags
  isCompressed: boolean;
  isLeadOff: boolean;
  isClipped: boolean;
  isClockUnsync: boolean;
}

export interface TelemetryFrame {
  header: TelemetryHeader;
  samples: number[];
  rawPayload: Uint8Array;
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

export class ProtocolError extends Error {
  code: number;
  constructor(message: string, code: number = 4000) {
    super(message);
    this.name = "ProtocolError";
    this.code = code;
  }
}

/**
 * Unpacks and validates a 28-byte v1 binary frame.
 */
export function unpackTelemetryFrame(buffer: ArrayBuffer): TelemetryFrame {
  if (buffer.byteLength < HEADER_SIZE) {
    throw new ProtocolError(
      `Frame underflow: received ${buffer.byteLength} bytes, expected at least ${HEADER_SIZE} bytes.`,
      4002
    );
  }

  if (buffer.byteLength > MAX_FRAME_SIZE) {
    throw new ProtocolError(
      `Frame size ${buffer.byteLength} exceeds maximum allowed ceiling (${MAX_FRAME_SIZE} bytes).`,
      4001
    );
  }

  const view = new DataView(buffer);

  const magic = view.getUint8(0);
  if (magic !== MAGIC_BYTE) {
    throw new ProtocolError(`Invalid magic byte 0x${magic.toString(16)}, expected 0xCC.`, 4003);
  }

  const version = view.getUint8(1);
  if (version !== PROTOCOL_VERSION) {
    throw new ProtocolError(`Unsupported protocol version 0x${version.toString(16)}, expected 0x01.`, 4004);
  }

  const msgType = view.getUint8(2);
  const flags = view.getUint8(3);
  const sequenceNumber = view.getUint32(4, false); // Big-Endian
  const baseTimestampMs = Number(view.getBigUint64(8, false));
  const samplingRateHz = view.getUint16(16, false);
  const channelId = view.getUint16(18, false);
  const sampleCount = view.getUint16(20, false);
  const payloadLength = view.getUint16(22, false);
  const checksumCrc32 = view.getUint32(24, false);

  if (buffer.byteLength !== HEADER_SIZE + payloadLength) {
    throw new ProtocolError(
      `Payload length mismatch: declared ${payloadLength} bytes, actual frame payload is ${buffer.byteLength - HEADER_SIZE} bytes.`,
      4005
    );
  }

  const payload = new Uint8Array(buffer, HEADER_SIZE, payloadLength);

  // Validate CRC-32 integrity
  const computedCrc = computeCrc32(payload);
  if (computedCrc !== checksumCrc32) {
    throw new ProtocolError(
      `CRC-32 checksum failure: expected 0x${checksumCrc32.toString(16)}, computed 0x${computedCrc.toString(16)}.`,
      4006
    );
  }

  const header: TelemetryHeader = {
    magic,
    version,
    msgType,
    flags,
    sequenceNumber,
    baseTimestampMs,
    samplingRateHz,
    channelId,
    sampleCount,
    payloadLength,
    checksumCrc32,
    isCompressed: Boolean(flags & FLAG_DELTA_ZLIB),
    isLeadOff: Boolean(flags & FLAG_LEAD_OFF),
    isClipped: Boolean(flags & FLAG_CLIPPED),
    isClockUnsync: Boolean(flags & FLAG_CLOCK_UNSYNC),
  };

  // Decode raw Int16 samples (little-endian)
  const samples: number[] = [];
  if (msgType === MSG_TYPE_ECG_DATA && payloadLength > 0 && !header.isCompressed) {
    const sampleView = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    const count = Math.floor(payloadLength / 2);
    for (let i = 0; i < count; i++) {
      samples.push(sampleView.getInt16(i * 2, true)); // Little-Endian ADC samples
    }
  }

  return {
    header,
    samples,
    rawPayload: payload,
  };
}
