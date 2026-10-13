"""
CardioCoreEdge 250 Hz Telemetry Chunk Specification & Codecs
Handles serialization, delta encoding, compression, and signal-integrity validation.
"""

import struct
import zlib
import hashlib
from typing import List, Tuple, Dict, Any, Optional
from datetime import datetime, timedelta

SAMPLE_RATE_DEFAULT = 250  # Hz
BYTES_PER_SAMPLE = 2       # int16 (2 bytes per lead sample)
SENTINEL_MISSING_SAMPLE = -32768  # 0x8000 represents dropped/missing ADC sample


def encode_raw_samples(samples: List[int]) -> bytes:
    """Pack list of 16-bit signed integers into little-endian bytes."""
    fmt = f"<{len(samples)}h"
    return struct.pack(fmt, *samples)


def decode_raw_samples(payload: bytes) -> List[int]:
    """Unpack little-endian bytes into list of 16-bit signed integers."""
    count = len(payload) // BYTES_PER_SAMPLE
    fmt = f"<{count}h"
    return list(struct.unpack(fmt, payload))


def encode_delta_samples(samples: List[int]) -> bytes:
    """
    First-order difference delta encoding for smooth physiological signals.
    d[0] = s[0], d[i] = s[i] - s[i-1]. Followed by zlib compression.
    """
    if not samples:
        return b""
    
    deltas = [samples[0]]
    for i in range(1, len(samples)):
        # Handle sentinel preservation
        if samples[i] == SENTINEL_MISSING_SAMPLE or samples[i-1] == SENTINEL_MISSING_SAMPLE:
            deltas.append(samples[i])
        else:
            diff = samples[i] - samples[i-1]
            # Clamp to int16 range
            diff = max(-32767, min(32767, diff))
            deltas.append(diff)
            
    raw_deltas = encode_raw_samples(deltas)
    return zlib.compress(raw_deltas, level=6)


MAX_DECOMPRESSED_BYTES = 65536  # 64 KiB maximum safe expansion ceiling


def decode_delta_samples(compressed_payload: bytes, max_uncompressed_bytes: int = MAX_DECOMPRESSED_BYTES) -> List[int]:
    """Decompress and reconstruct samples from delta encoding with decompression bomb protection."""
    if not compressed_payload:
        return []

    decompressor = zlib.decompressobj()
    raw_deltas = decompressor.decompress(compressed_payload, max_uncompressed_bytes)
    # Check if stream has uncompressed data exceeding the ceiling
    if decompressor.unconsumed_tail or len(raw_deltas) >= max_uncompressed_bytes:
        more = decompressor.decompress(b"", 1)
        if more:
            raise ValueError(f"Decompression exceeded safe limit of {max_uncompressed_bytes} bytes (decompression bomb protection)")

    deltas = decode_raw_samples(raw_deltas)
    if not deltas:
        return []

    samples = [deltas[0]]
    for i in range(1, len(deltas)):
        if deltas[i] == SENTINEL_MISSING_SAMPLE:
            samples.append(SENTINEL_MISSING_SAMPLE)
        elif samples[i-1] == SENTINEL_MISSING_SAMPLE:
            samples.append(deltas[i])
        else:
            samples.append(samples[i-1] + deltas[i])

    return samples


def compute_signal_quality(samples: List[int]) -> Tuple[float, int]:
    """
    Calculate Signal Quality Index (SQI 0.0 to 1.0) and missing sample count.
    Penalizes clipped amplitudes (> 32000 or < -32000) and missing sentinels.
    """
    if not samples:
        return 0.0, 0

    missing = sum(1 for s in samples if s == SENTINEL_MISSING_SAMPLE)
    clipped = sum(1 for s in samples if abs(s) >= 32000 and s != SENTINEL_MISSING_SAMPLE)
    
    total = len(samples)
    bad_ratio = (missing + (clipped * 0.5)) / total
    sqi = max(0.0, min(1.0, 1.0 - bad_ratio))
    return round(sqi, 3), missing


def validate_chunk_metadata(
    start_time: datetime,
    end_time: datetime,
    sampling_rate_hz: int,
    sample_count: int,
    payload_bytes: bytes,
    expected_checksum: str,
) -> Tuple[bool, Optional[str]]:
    """Validate telemetry chunk integrity and sampling consistency."""
    if end_time <= start_time:
        return False, "End timestamp must be strictly greater than start timestamp."
        
    duration_sec = (end_time - start_time).total_seconds()
    expected_samples = int(duration_sec * sampling_rate_hz)
    
    # Allow ±2 samples tolerance for clock drift / boundary rounding
    if abs(sample_count - expected_samples) > 2:
        return False, f"Sample count {sample_count} does not match expected {expected_samples} for duration {duration_sec}s."
        
    # Checksum validation
    computed_checksum = hashlib.sha256(payload_bytes).hexdigest()
    if computed_checksum != expected_checksum:
        return False, f"Checksum mismatch: expected {expected_checksum}, got {computed_checksum}."
        
    return True, None


def encode_multichannel_raw(channels_samples: List[List[int]]) -> bytes:
    """Pack planar channels of 16-bit signed integers into bytes."""
    parts = []
    for samples in channels_samples:
        parts.append(encode_raw_samples(samples))
    return b"".join(parts)


def decode_multichannel_raw(payload: bytes, channel_count: int, sample_count: int) -> List[List[int]]:
    """Unpack planar channels from little-endian bytes."""
    expected_bytes_per_channel = sample_count * BYTES_PER_SAMPLE
    expected_total = channel_count * expected_bytes_per_channel
    if len(payload) != expected_total:
        raise ValueError(f"Payload length {len(payload)} does not match expected {expected_total} bytes")

    channels = []
    for i in range(channel_count):
        start = i * expected_bytes_per_channel
        end = start + expected_bytes_per_channel
        channel_bytes = payload[start:end]
        channels.append(decode_raw_samples(channel_bytes))
    return channels


def encode_multichannel_delta(channels_samples: List[List[int]]) -> bytes:
    """
    Planar first-order difference delta encoding for each channel independently,
    followed by joint zlib compression.
    """
    if not channels_samples:
        return b""

    raw_delta_parts = []
    for samples in channels_samples:
        if not samples:
            continue
        deltas = [samples[0]]
        for i in range(1, len(samples)):
            if samples[i] == SENTINEL_MISSING_SAMPLE or samples[i-1] == SENTINEL_MISSING_SAMPLE:
                deltas.append(samples[i])
            else:
                diff = samples[i] - samples[i-1]
                diff = max(-32767, min(32767, diff))
                deltas.append(diff)
        raw_delta_parts.append(encode_raw_samples(deltas))

    raw_deltas = b"".join(raw_delta_parts)
    return zlib.compress(raw_deltas, level=6)


def decode_multichannel_delta(
    compressed_payload: bytes,
    channel_count: int,
    sample_count: int,
    max_uncompressed_bytes: int = MAX_DECOMPRESSED_BYTES,
) -> List[List[int]]:
    """Decompress planar delta samples with decompression bomb protection."""
    if not compressed_payload:
        return [[] for _ in range(channel_count)]

    decompressor = zlib.decompressobj()
    raw_deltas = decompressor.decompress(compressed_payload, max_uncompressed_bytes)
    if decompressor.unconsumed_tail or len(raw_deltas) >= max_uncompressed_bytes:
        more = decompressor.decompress(b"", 1)
        if more:
            raise ValueError(f"Decompression exceeded safe limit of {max_uncompressed_bytes} bytes (decompression bomb protection)")

    expected_bytes_per_channel = sample_count * BYTES_PER_SAMPLE
    expected_total = channel_count * expected_bytes_per_channel
    if len(raw_deltas) != expected_total:
        raise ValueError(f"Decompressed length {len(raw_deltas)} does not match expected {expected_total} bytes")

    channels = []
    for i in range(channel_count):
        start = i * expected_bytes_per_channel
        end = start + expected_bytes_per_channel
        channel_delta_bytes = raw_deltas[start:end]
        deltas = decode_raw_samples(channel_delta_bytes)

        samples = [deltas[0]]
        for j in range(1, len(deltas)):
            if deltas[j] == SENTINEL_MISSING_SAMPLE:
                samples.append(SENTINEL_MISSING_SAMPLE)
            elif samples[j-1] == SENTINEL_MISSING_SAMPLE:
                samples.append(deltas[j])
            else:
                samples.append(samples[j-1] + deltas[j])
        channels.append(samples)
    return channels


def compute_multichannel_signal_quality(channels_samples: List[List[int]]) -> Tuple[float, int, int]:
    """Calculate aggregate Signal Quality Index (SQI 0.0 to 1.0), missing count, and clipped count."""
    if not channels_samples:
        return 0.0, 0, 0

    sqi_list = []
    total_missing = 0
    total_clipped = 0
    for samples in channels_samples:
        sqi, missing = compute_signal_quality(samples)
        sqi_list.append(sqi)
        total_missing += missing
        total_clipped += sum(1 for s in samples if abs(s) >= 32000 and s != SENTINEL_MISSING_SAMPLE)

    avg_sqi = sum(sqi_list) / len(sqi_list) if sqi_list else 0.0
    return round(avg_sqi, 3), total_missing, total_clipped

