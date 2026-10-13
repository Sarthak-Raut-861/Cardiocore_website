"""
CardioCoreEdge Telemetry Binary Frame Protocol (v1)
Fixed 28-byte binary header with CRC-32 integrity validation.
Designed for low-overhead, deterministic edge WebSocket streaming and buffered recovery.
"""

import struct
import zlib
from dataclasses import dataclass
from typing import Tuple, Optional, Union, List

# Protocol Constants
MAGIC_BYTE = 0xCC
PROTOCOL_VERSION_V1 = 0x01
PROTOCOL_VERSION_V2 = 0x02

# Message Types
MSG_TYPE_ECG_DATA = 0x01
MSG_TYPE_HEARTBEAT = 0x02
MSG_TYPE_ACK = 0x03
MSG_TYPE_BACKPRESSURE = 0x04
MSG_TYPE_ERROR = 0x05

VALID_MSG_TYPES = {
    MSG_TYPE_ECG_DATA,
    MSG_TYPE_HEARTBEAT,
    MSG_TYPE_ACK,
    MSG_TYPE_BACKPRESSURE,
    MSG_TYPE_ERROR,
}

# Status Flags (Bitmask)
FLAG_DELTA_ZLIB = 0x01    # Bit 0: payload is delta-difference + zlib compressed
FLAG_LEAD_OFF = 0x02      # Bit 1: physical lead disconnected / high impedance
FLAG_CLIPPED = 0x04       # Bit 2: ADC rail saturation / clipping detected
FLAG_CLOCK_UNSYNC = 0x08  # Bit 3: edge RTC unsynchronized

VALID_FLAGS_MASK = FLAG_DELTA_ZLIB | FLAG_LEAD_OFF | FLAG_CLIPPED | FLAG_CLOCK_UNSYNC  # 0x0F

HEADER_SIZE = 28
HEADER_SIZE_V2 = 32
MAX_FRAME_SIZE = 65536     # 64 KiB maximum frame ceiling (rejects oversized packets)
MAX_PAYLOAD_SIZE = MAX_FRAME_SIZE - HEADER_SIZE       # 65,508 bytes
MAX_PAYLOAD_SIZE_V2 = MAX_FRAME_SIZE - HEADER_SIZE_V2  # 65,504 bytes
MAX_SAMPLE_COUNT = 5000    # Up to 20 seconds at 250 Hz

# Standard 12-lead bitmask constants (bits 0..11)
LEAD_I_MASK = 0x0001
LEAD_II_MASK = 0x0002
LEAD_III_MASK = 0x0004
LEAD_AVR_MASK = 0x0008
LEAD_AVL_MASK = 0x0010
LEAD_AVF_MASK = 0x0020
LEAD_V1_MASK = 0x0040
LEAD_V2_MASK = 0x0080
LEAD_V3_MASK = 0x0100
LEAD_V4_MASK = 0x0200
LEAD_V5_MASK = 0x0400
LEAD_V6_MASK = 0x0800
ALL_12_LEADS_MASK = 0x0FFF
ALL_6_LIMB_LEADS_MASK = 0x003F
ALL_3_LEADS_MASK = 0x0007
SINGLE_LEAD_II_MASK = 0x0002

LEAD_NAMES_ORDER: List[str] = [
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
]

SUPPORTED_CHANNEL_CONFIGS = {
    "12-lead": ALL_12_LEADS_MASK,
    "6-lead": ALL_6_LIMB_LEADS_MASK,
    "3-lead": ALL_3_LEADS_MASK,
    "single-lead": SINGLE_LEAD_II_MASK,
}

# Struct Formats: ! (network/big-endian)
HEADER_STRUCT_FMT = "!BBBB I Q H H H H I"
HEADER_STRUCT_FMT_V2 = "!BBBB I Q H H H H H H I"
HEADER_PRE_CRC_FMT_V2 = "!BBBB I Q H H H H H H"


class ProtocolParseError(Exception):
    """Raised when incoming binary packet violates format or integrity rules."""
    def __init__(self, message: str, code: int = 4000):
        super().__init__(message)
        self.code = code


@dataclass
class BinaryFrameHeader:
    magic: int
    version: int
    msg_type: int
    flags: int
    sequence_number: int
    base_timestamp_ms: int
    sampling_rate_hz: int
    channel_id: int
    sample_count: int
    payload_length: int
    checksum_crc32: int

    @property
    def is_compressed(self) -> bool:
        return bool(self.flags & FLAG_DELTA_ZLIB)

    @property
    def is_lead_off(self) -> bool:
        return bool(self.flags & FLAG_LEAD_OFF)

    @property
    def is_clipped(self) -> bool:
        return bool(self.flags & FLAG_CLIPPED)


@dataclass
class MultiChannelFrameHeader:
    """Protocol v2 Synchronized Multi-Channel 32-Byte Binary Frame Header."""
    magic: int
    version: int
    msg_type: int
    flags: int
    sequence_number: int
    base_timestamp_ms: int
    sampling_rate_hz: int
    active_leads_mask: int
    sample_count: int
    payload_length: int
    lead_off_mask: int
    clipping_mask: int
    checksum_crc32: int

    @property
    def active_channel_count(self) -> int:
        return bin(self.active_leads_mask).count("1")

    @property
    def active_lead_names(self) -> List[str]:
        return [LEAD_NAMES_ORDER[i] for i in range(12) if (self.active_leads_mask & (1 << i))]

    @property
    def is_compressed(self) -> bool:
        return bool(self.flags & FLAG_DELTA_ZLIB)

    @property
    def is_lead_off(self) -> bool:
        return bool(self.flags & FLAG_LEAD_OFF) or bool(self.lead_off_mask)

    @property
    def is_clipped(self) -> bool:
        return bool(self.flags & FLAG_CLIPPED) or bool(self.clipping_mask)

    @property
    def is_clock_unsync(self) -> bool:
        return bool(self.flags & FLAG_CLOCK_UNSYNC)


def pack_multichannel_frame(
    msg_type: int,
    sequence_number: int,
    base_timestamp_ms: int,
    sampling_rate_hz: int,
    active_leads_mask: int,
    sample_count: int,
    flags: int,
    payload: bytes,
    lead_off_mask: int = 0,
    clipping_mask: int = 0,
) -> bytes:
    """
    Serialize Protocol v2 32-byte header with full-frame CRC-32 protection.
    CRC-32 protects bytes 0..27 (all header fields before CRC) plus the entire payload.
    """
    if msg_type not in VALID_MSG_TYPES:
        raise ProtocolParseError(f"Unsupported message type: 0x{msg_type:02X}", code=4008)

    if flags & ~VALID_FLAGS_MASK:
        raise ProtocolParseError(f"Reserved flag bits set: 0x{flags:02X}", code=4009)

    if active_leads_mask == 0 or (active_leads_mask & ~ALL_12_LEADS_MASK):
        raise ProtocolParseError(f"Invalid or unsupported active leads mask: 0x{active_leads_mask:04X}", code=4010)

    payload_len = len(payload)
    if payload_len > MAX_PAYLOAD_SIZE_V2:
        raise ProtocolParseError(
            f"Payload length {payload_len} exceeds maximum limit ({MAX_PAYLOAD_SIZE_V2} bytes). Frame exceeds maximum allowed size.",
            code=4001,
        )

    # Pack 28 bytes preceding CRC field
    header_pre_crc = struct.pack(
        HEADER_PRE_CRC_FMT_V2,
        MAGIC_BYTE,
        PROTOCOL_VERSION_V2,
        msg_type,
        flags,
        sequence_number,
        base_timestamp_ms,
        sampling_rate_hz,
        active_leads_mask,
        sample_count,
        payload_len,
        lead_off_mask,
        clipping_mask,
    )

    # Compute CRC-32 across all header bytes before CRC plus the entire payload
    crc = zlib.crc32(header_pre_crc + payload) & 0xFFFFFFFF
    return header_pre_crc + struct.pack("!I", crc) + payload


def unpack_multichannel_frame(data: bytes) -> Tuple[MultiChannelFrameHeader, bytes]:
    """Parse and validate Protocol v2 32-byte binary frame header and payload."""
    total_len = len(data)
    if total_len < HEADER_SIZE_V2:
        raise ProtocolParseError(
            f"Multi-channel frame underflow: received {total_len} bytes, minimum required {HEADER_SIZE_V2} bytes",
            code=4002,
        )

    if total_len > MAX_FRAME_SIZE:
        raise ProtocolParseError(
            f"Frame overflow: received {total_len} bytes, maximum allowed {MAX_FRAME_SIZE} bytes",
            code=4001,
        )

    header_raw = data[:HEADER_SIZE_V2]
    payload = data[HEADER_SIZE_V2:]

    (
        magic,
        version,
        msg_type,
        flags,
        seq_num,
        ts_ms,
        rate_hz,
        active_leads_mask,
        samples,
        payload_len,
        lead_off_mask,
        clipping_mask,
        crc,
    ) = struct.unpack(HEADER_STRUCT_FMT_V2, header_raw)

    if magic != MAGIC_BYTE:
        raise ProtocolParseError(
            f"Invalid protocol magic: 0x{magic:02X} (expected 0x{MAGIC_BYTE:02X})",
            code=4003,
        )

    if version != PROTOCOL_VERSION_V2:
        raise ProtocolParseError(
            f"Unsupported protocol version: {version} (expected {PROTOCOL_VERSION_V2})",
            code=4004,
        )

    if msg_type not in VALID_MSG_TYPES:
        raise ProtocolParseError(
            f"Unsupported message type: 0x{msg_type:02X}",
            code=4008,
        )

    if flags & ~VALID_FLAGS_MASK:
        raise ProtocolParseError(
            f"Reserved flag bits set: 0x{flags:02X}",
            code=4009,
        )

    if active_leads_mask == 0 or (active_leads_mask & ~ALL_12_LEADS_MASK):
        raise ProtocolParseError(
            f"Invalid active leads mask: 0x{active_leads_mask:04X}",
            code=4010,
        )

    if samples > MAX_SAMPLE_COUNT:
        raise ProtocolParseError(
            f"Sample count {samples} exceeds limit {MAX_SAMPLE_COUNT}",
            code=4007,
        )

    if payload_len > MAX_PAYLOAD_SIZE_V2:
        raise ProtocolParseError(
            f"Declared payload length {payload_len} exceeds maximum payload limit {MAX_PAYLOAD_SIZE_V2} bytes",
            code=4001,
        )

    if len(payload) != payload_len or total_len != HEADER_SIZE_V2 + payload_len:
        raise ProtocolParseError(
            f"Payload length mismatch: declared {payload_len} bytes, got {len(payload)} bytes",
            code=4005,
        )

    # Validate CRC-32 (covering header bytes 0..27 + payload)
    header_pre_crc = data[:28]
    computed_crc = zlib.crc32(header_pre_crc + payload) & 0xFFFFFFFF
    if computed_crc != crc:
        raise ProtocolParseError(
            f"Checksum mismatch: header CRC 0x{crc:08X} != computed 0x{computed_crc:08X}",
            code=4006,
        )

    # For uncompressed physiological samples, check popcount alignment
    if not (flags & FLAG_DELTA_ZLIB) and msg_type == MSG_TYPE_ECG_DATA:
        channel_count = bin(active_leads_mask).count("1")
        expected_len = channel_count * samples * 2
        if payload_len != expected_len:
            raise ProtocolParseError(
                f"Payload length mismatch for {channel_count} channels: declared {payload_len} bytes, expected {expected_len} bytes",
                code=4005,
            )

    header = MultiChannelFrameHeader(
        magic=magic,
        version=version,
        msg_type=msg_type,
        flags=flags,
        sequence_number=seq_num,
        base_timestamp_ms=ts_ms,
        sampling_rate_hz=rate_hz,
        active_leads_mask=active_leads_mask,
        sample_count=samples,
        payload_length=payload_len,
        lead_off_mask=lead_off_mask,
        clipping_mask=clipping_mask,
        checksum_crc32=crc,
    )

    return header, payload


def pack_frame(
    msg_type: int,
    sequence_number: int,
    base_timestamp_ms: int,
    sampling_rate_hz: int,
    channel_id: int,
    sample_count: int,
    flags: int,
    payload: bytes,
) -> bytes:
    """Serialize telemetry message header and append payload (Protocol v1 single-lead)."""
    if msg_type not in VALID_MSG_TYPES:
        raise ProtocolParseError(f"Unsupported message type: 0x{msg_type:02X}", code=4008)

    if flags & ~VALID_FLAGS_MASK:
        raise ProtocolParseError(f"Reserved flag bits set: 0x{flags:02X}", code=4009)

    payload_len = len(payload)
    if payload_len > MAX_PAYLOAD_SIZE:
        raise ProtocolParseError(
            f"Payload length {payload_len} exceeds maximum limit ({MAX_PAYLOAD_SIZE} bytes). Frame exceeds maximum allowed size.",
            code=4001,
        )

    crc = zlib.crc32(payload) & 0xFFFFFFFF
    header_bytes = struct.pack(
        HEADER_STRUCT_FMT,
        MAGIC_BYTE,
        PROTOCOL_VERSION_V1,
        msg_type,
        flags,
        sequence_number,
        base_timestamp_ms,
        sampling_rate_hz,
        channel_id,
        sample_count,
        payload_len,
        crc,
    )
    return header_bytes + payload


def unpack_frame(data: bytes) -> Tuple[Union[BinaryFrameHeader, MultiChannelFrameHeader], bytes]:
    """Parse and validate binary frame header and payload (v1 single-lead or v2 multi-channel)."""
    total_len = len(data)

    # Route Protocol v2 frames
    if total_len >= 2 and data[1] == PROTOCOL_VERSION_V2:
        return unpack_multichannel_frame(data)
    if total_len < HEADER_SIZE:
        raise ProtocolParseError(
            f"Frame underflow: received {total_len} bytes, minimum required {HEADER_SIZE} bytes",
            code=4002,
        )

    if total_len > MAX_FRAME_SIZE:
        raise ProtocolParseError(
            f"Frame overflow: received {total_len} bytes, maximum allowed {MAX_FRAME_SIZE} bytes",
            code=4001,
        )

    header_raw = data[:HEADER_SIZE]
    payload = data[HEADER_SIZE:]

    (
        magic,
        version,
        msg_type,
        flags,
        seq_num,
        ts_ms,
        rate_hz,
        channel_id,
        samples,
        payload_len,
        crc,
    ) = struct.unpack(HEADER_STRUCT_FMT, header_raw)

    # Magic byte validation
    if magic != MAGIC_BYTE:
        raise ProtocolParseError(
            f"Invalid protocol magic: 0x{magic:02X} (expected 0x{MAGIC_BYTE:02X})",
            code=4003,
        )

    # Protocol version check
    if version != PROTOCOL_VERSION_V1:
        raise ProtocolParseError(
            f"Unsupported protocol version: {version} (expected {PROTOCOL_VERSION_V1})",
            code=4004,
        )

    # Message type validation
    if msg_type not in VALID_MSG_TYPES:
        raise ProtocolParseError(
            f"Unsupported message type: 0x{msg_type:02X}",
            code=4008,
        )

    # Reserved flags validation
    if flags & ~VALID_FLAGS_MASK:
        raise ProtocolParseError(
            f"Reserved flag bits set: 0x{flags:02X}",
            code=4009,
        )

    # Payload length validation
    if payload_len > MAX_PAYLOAD_SIZE:
        raise ProtocolParseError(
            f"Declared payload length {payload_len} exceeds maximum payload limit {MAX_PAYLOAD_SIZE} bytes",
            code=4001,
        )

    if len(payload) != payload_len or total_len != HEADER_SIZE + payload_len:
        raise ProtocolParseError(
            f"Payload length mismatch: declared {payload_len} bytes, got {len(payload)} bytes",
            code=4005,
        )

    # CRC-32 integrity validation (network big-endian uint32 over payload)
    computed_crc = zlib.crc32(payload) & 0xFFFFFFFF
    if computed_crc != crc:
        raise ProtocolParseError(
            f"Checksum mismatch: header CRC 0x{crc:08X} != computed 0x{computed_crc:08X}",
            code=4006,
        )

    # Sample bounds validation
    if samples > MAX_SAMPLE_COUNT:
        raise ProtocolParseError(
            f"Sample count {samples} exceeds limit {MAX_SAMPLE_COUNT}",
            code=4007,
        )

    header = BinaryFrameHeader(
        magic=magic,
        version=version,
        msg_type=msg_type,
        flags=flags,
        sequence_number=seq_num,
        base_timestamp_ms=ts_ms,
        sampling_rate_hz=rate_hz,
        channel_id=channel_id,
        sample_count=samples,
        payload_length=payload_len,
        checksum_crc32=crc,
    )

    return header, payload


def make_ack_frame(sequence_number: int, timestamp_ms: int) -> bytes:
    """Generate lightweight acknowledgment frame."""
    return pack_frame(
        msg_type=MSG_TYPE_ACK,
        sequence_number=sequence_number,
        base_timestamp_ms=timestamp_ms,
        sampling_rate_hz=0,
        channel_id=0,
        sample_count=0,
        flags=0,
        payload=b"",
    )


def make_backpressure_frame(sequence_number: int, queue_depth: int) -> bytes:
    """Generate backpressure signal frame informing edge to throttle or buffer."""
    payload = struct.pack("!H", queue_depth)
    return pack_frame(
        msg_type=MSG_TYPE_BACKPRESSURE,
        sequence_number=sequence_number,
        base_timestamp_ms=0,
        sampling_rate_hz=0,
        channel_id=0,
        sample_count=0,
        flags=0,
        payload=payload,
    )


def make_error_frame(sequence_number: int, error_code: int, message: str) -> bytes:
    """Generate error diagnostic frame."""
    payload = struct.pack("!H", error_code) + message.encode("utf-8")[:256]
    return pack_frame(
        msg_type=MSG_TYPE_ERROR,
        sequence_number=sequence_number,
        base_timestamp_ms=0,
        sampling_rate_hz=0,
        channel_id=0,
        sample_count=0,
        flags=0,
        payload=payload,
    )
