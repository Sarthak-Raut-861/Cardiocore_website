"""
CardioCoreEdge 250 Hz Telemetry Compression Benchmark
Compares Raw vs Deflate (zlib) vs Delta-Deflate on synthetic physiological ECG data.
Validates operational capacity projections and CPU overhead.
"""

import math
import time
import zlib
from typing import List, Dict, Any
from app.telemetry.chunk import (
    encode_raw_samples,
    decode_raw_samples,
    encode_delta_samples,
    decode_delta_samples,
)


def generate_synthetic_ecg(duration_seconds: int = 60, sampling_rate_hz: int = 250) -> List[int]:
    """Generate realistic synthetic ECG samples with P-QRS-T complexes and respiratory baseline wander."""
    total_samples = duration_seconds * sampling_rate_hz
    samples: List[int] = []
    
    heart_rate_bpm = 72
    rr_interval = sampling_rate_hz * 60 / heart_rate_bpm  # ~208 samples per beat
    
    for i in range(total_samples):
        # Respiratory baseline wander (~0.2 Hz)
        wander = 80 * math.sin(2 * math.pi * 0.2 * i / sampling_rate_hz)
        
        # Position within cardiac cycle (0.0 to 1.0)
        phase = (i % rr_interval) / rr_interval
        
        ecg_val = 0.0
        # P-wave
        if 0.1 <= phase <= 0.2:
            ecg_val += 150 * math.sin(math.pi * (phase - 0.1) / 0.1)
        # Q-wave
        elif 0.28 <= phase <= 0.30:
            ecg_val -= 200 * math.sin(math.pi * (phase - 0.28) / 0.02)
        # R-wave (sharp spike)
        elif 0.30 <= phase <= 0.34:
            ecg_val += 1600 * math.sin(math.pi * (phase - 0.30) / 0.04)
        # S-wave
        elif 0.34 <= phase <= 0.37:
            ecg_val -= 350 * math.sin(math.pi * (phase - 0.34) / 0.03)
        # T-wave
        elif 0.50 <= phase <= 0.65:
            ecg_val += 300 * math.sin(math.pi * (phase - 0.50) / 0.15)
            
        sample = int(ecg_val + wander)
        # Clamp to int16 range
        samples.append(max(-32767, min(32767, sample)))
        
    return samples


def run_compression_benchmark() -> Dict[str, Any]:
    """Run comparative benchmark on 10 minutes of continuous 250 Hz ECG telemetry."""
    duration_sec = 600  # 10 minutes
    samples = generate_synthetic_ecg(duration_sec, 250)
    chunk_size = 1250   # 5-second chunks (250 Hz * 5s)
    chunks = [samples[i:i + chunk_size] for i in range(0, len(samples), chunk_size)]
    
    total_uncompressed = 0
    total_zlib = 0
    total_delta_zlib = 0
    
    t0_enc_raw = time.perf_counter()
    for ch in chunks:
        raw_b = encode_raw_samples(ch)
        total_uncompressed += len(raw_b)
    t1_enc_raw = time.perf_counter()
    
    t0_enc_zlib = time.perf_counter()
    for ch in chunks:
        raw_b = encode_raw_samples(ch)
        zb = zlib.compress(raw_b, level=6)
        total_zlib += len(zb)
    t1_enc_zlib = time.perf_counter()
    
    t0_enc_delta = time.perf_counter()
    delta_payloads = []
    for ch in chunks:
        db = encode_delta_samples(ch)
        total_delta_zlib += len(db)
        delta_payloads.append(db)
    t1_enc_delta = time.perf_counter()
    
    t0_dec_delta = time.perf_counter()
    for db in delta_payloads:
        reconstructed = decode_delta_samples(db)
    t1_dec_delta = time.perf_counter()
    
    num_chunks = len(chunks)
    avg_enc_delta_ms = ((t1_enc_delta - t0_enc_delta) / num_chunks) * 1000
    avg_dec_delta_ms = ((t1_dec_delta - t0_dec_delta) / num_chunks) * 1000
    
    ratio_zlib = total_uncompressed / total_zlib if total_zlib else 1.0
    ratio_delta = total_uncompressed / total_delta_zlib if total_delta_zlib else 1.0
    
    # 24-hour continuous stream projection
    daily_uncompressed_mb = (250 * 2 * 86400) / (1024 * 1024)  # ~41.19 MB
    daily_compressed_mb = daily_uncompressed_mb / ratio_delta
    monthly_compressed_mb = daily_compressed_mb * 30
    
    results = {
        "duration_seconds": duration_sec,
        "sample_count": len(samples),
        "chunk_count": num_chunks,
        "raw_bytes": total_uncompressed,
        "zlib_bytes": total_zlib,
        "delta_zlib_bytes": total_delta_zlib,
        "zlib_compression_ratio": round(ratio_zlib, 2),
        "delta_zlib_compression_ratio": round(ratio_delta, 2),
        "delta_space_savings_pct": round((1.0 - (total_delta_zlib / total_uncompressed)) * 100, 1),
        "avg_encode_latency_ms": round(avg_enc_delta_ms, 3),
        "avg_decode_latency_ms": round(avg_dec_delta_ms, 3),
        "daily_uncompressed_mb": round(daily_uncompressed_mb, 2),
        "daily_compressed_mb": round(daily_compressed_mb, 2),
        "monthly_compressed_mb": round(monthly_compressed_mb, 2),
    }
    return results


if __name__ == "__main__":
    res = run_compression_benchmark()
    print("=== CardioCoreEdge 250 Hz ECG Compression Benchmark ===")
    for k, v in res.items():
        print(f"  {k}: {v}")
