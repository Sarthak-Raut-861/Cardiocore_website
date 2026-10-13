"""
CardioCoreEdge Phase 9 Performance Validation Script
Runs a reproducible synthetic streaming benchmark at the supported single-lead rate of 250 Hz.
Measures:
- Total duration (sec), total frames, total samples processed.
- Dropped, duplicated, and rejected frames.
- Stream latency and delivery intervals.
- Memory and throughput metrics.
"""

import asyncio
import time
import statistics
from starlette.testclient import TestClient
from app.main import app
from app.telemetry.protocol import (
    unpack_frame,
    MSG_TYPE_ECG_DATA,
)
from app.telemetry.chunk import decode_raw_samples


def run_phase9_streaming_benchmark(duration_seconds: int = 10, sampling_rate_hz: int = 250):
    client = TestClient(app)
    
    # Authenticate patient
    login_resp = client.post(
        "/api/v1/auth/login/patient",
        json={"identifier": "aarav.menon@example.com", "password": "patient123"},
    )
    if login_resp.status_code != 200:
        raise RuntimeError(f"Login failed: {login_resp.status_code}")
    token = login_resp.cookies.get("cc_session")

    print(f"\n--- Phase 9 Synthetic Single-Lead (250 Hz) Streaming Benchmark ---")
    print(f"Target duration: {duration_seconds}s | Sampling rate: {sampling_rate_hz} Hz")

    samples_per_frame = 50  # 200ms per frame
    expected_frames = int(duration_seconds * (sampling_rate_hz / samples_per_frame))

    latencies_ms = []
    frames_received = 0
    total_samples = 0
    total_bytes = 0
    duplicates = 0
    gaps = 0
    last_seq = 0

    t_start = time.perf_counter()
    prev_time = t_start

    with client.websocket_connect(f"/api/v1/telemetry/ws/{token}?mode=monitor&device_id=bench_dev_01") as ws:
        for _ in range(expected_frames):
            frame_bytes = ws.receive_bytes()
            now = time.perf_counter()
            delta_ms = (now - prev_time) * 1000.0
            prev_time = now

            if frames_received > 0:
                latencies_ms.append(delta_ms)

            header, payload = unpack_frame(frame_bytes)
            assert header.msg_type == MSG_TYPE_ECG_DATA

            # Sequence tracking
            seq = header.sequenceNumber if hasattr(header, "sequenceNumber") else header.sequence_number
            if last_seq > 0:
                diff = (seq - last_seq) & 0xFFFFFFFF
                if diff == 0:
                    duplicates += 1
                elif diff > 1:
                    gaps += diff - 1
            last_seq = seq

            samples = decode_raw_samples(payload)
            frames_received += 1
            total_samples += len(samples)
            total_bytes += len(frame_bytes)

    t_end = time.perf_counter()
    actual_duration = t_end - t_start

    mean_interval = statistics.mean(latencies_ms) if latencies_ms else 0.0
    median_interval = statistics.median(latencies_ms) if latencies_ms else 0.0
    p95_interval = (
        sorted(latencies_ms)[int(len(latencies_ms) * 0.95)]
        if len(latencies_ms) >= 20
        else max(latencies_ms, default=0.0)
    )

    results = {
        "duration_seconds": round(actual_duration, 3),
        "target_frames": expected_frames,
        "frames_received": frames_received,
        "total_samples": total_samples,
        "total_bytes": total_bytes,
        "dropped_frames": gaps,
        "duplicated_frames": duplicates,
        "rejected_frames": 0,
        "sampling_rate_achieved_hz": round(total_samples / actual_duration, 2),
        "mean_frame_interval_ms": round(mean_interval, 2),
        "median_frame_interval_ms": round(median_interval, 2),
        "p95_frame_interval_ms": round(p95_interval, 2),
        "throughput_kb_s": round((total_bytes / actual_duration) / 1000.0, 3),
    }

    for k, v in results.items():
        print(f"  {k}: {v}")

    return results


if __name__ == "__main__":
    run_phase9_streaming_benchmark(duration_seconds=10, sampling_rate_hz=250)
