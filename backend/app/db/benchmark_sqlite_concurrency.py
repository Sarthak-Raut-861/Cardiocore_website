"""
CardioCoreEdge SQLite Concurrency & Write Contention Benchmark (v2 - Normalized Workload)
Fixes methodological issue from Phase 8 by maintaining an identical total workload
across all concurrency levels. Reports median, p95, max latency, throughput, and error rates.
Normalizes metrics to distinguish decimal (MB/s = 10^6) from binary (MiB/s = 2^20).
"""

import time
import asyncio
import statistics
from datetime import datetime, timedelta
from typing import Dict, Any, List

from app.db.session import async_session_factory
from app.db.seed import init_tables, seed_synthetic_fixtures
from app.models.profile import PatientProfile
from app.telemetry.benchmark import generate_synthetic_ecg
from app.telemetry.storage import telemetry_storage
from sqlalchemy import select

# Fixed constant total workload per concurrency level
TOTAL_FIXED_WORKLOAD_CHUNKS = 60


async def run_sqlite_normalized_benchmark(
    concurrency_levels: List[int] = [1, 2, 5, 10, 20],
    total_workload: int = TOTAL_FIXED_WORKLOAD_CHUNKS,
    iterations: int = 2,
) -> Dict[str, Any]:
    """
    Execute normalized concurrency benchmark where EVERY concurrency level
    processes precisely the same total workload.
    """
    await init_tables()
    async with async_session_factory() as session:
        await seed_synthetic_fixtures(session)
        stmt = select(PatientProfile).where(PatientProfile.mrn == "44821")
        patient = (await session.execute(stmt)).scalar_one()
        patient_id = patient.id

    synthetic_samples = generate_synthetic_ecg(duration_seconds=5, sampling_rate_hz=250)
    bytes_per_chunk = 250 * 2 * 5  # 2500 bytes uncompressed
    total_bytes = total_workload * bytes_per_chunk

    results_by_concurrency = {
        "_metadata": {
            "environment": "Single Local Development Node (Windows, SQLite WAL Mode, Local NVMe SSD)",
            "fixed_total_chunks": total_workload,
            "total_uncompressed_bytes": total_bytes,
            "iterations_per_level": iterations,
            "chunk_duration_sec": 5,
            "sampling_rate_hz": 250,
        }
    }

    for workers in concurrency_levels:
        chunks_per_worker = total_workload // workers
        actual_total = chunks_per_worker * workers

        iteration_throughputs = []
        all_latencies_ms: List[float] = []
        total_errors = 0

        for it in range(iterations):
            latencies_ms: List[float] = []
            now = datetime.utcnow()

            async def worker_task(worker_id: int):
                nonlocal total_errors
                for i in range(chunks_per_worker):
                    t0 = time.perf_counter()
                    try:
                        async with async_session_factory() as db:
                            start_time = now + timedelta(seconds=(worker_id * 1000) + (it * 100) + (i * 5))
                            end_time = start_time + timedelta(seconds=5)
                            await telemetry_storage.store_chunk(
                                db=db,
                                patient_id=patient_id,
                                lead_name="Lead-II",
                                sampling_rate_hz=250,
                                start_timestamp=start_time,
                                end_timestamp=end_time,
                                samples=synthetic_samples,
                                codec="delta_zlib",
                            )
                        t1 = time.perf_counter()
                        lat = (t1 - t0) * 1000
                        latencies_ms.append(lat)
                        all_latencies_ms.append(lat)
                    except Exception:
                        total_errors += 1

            t_start = time.perf_counter()
            tasks = [worker_task(w) for w in range(workers)]
            await asyncio.gather(*tasks)
            t_end = time.perf_counter()

            elapsed = t_end - t_start
            if elapsed > 0:
                iteration_throughputs.append(actual_total / elapsed)

        median_lat = statistics.median(all_latencies_ms) if all_latencies_ms else 0
        mean_lat = statistics.mean(all_latencies_ms) if all_latencies_ms else 0
        p95_lat = (
            statistics.quantiles(all_latencies_ms, n=20)[18]
            if len(all_latencies_ms) >= 20
            else max(all_latencies_ms or [0])
        )
        max_lat = max(all_latencies_ms or [0])
        median_throughput = statistics.median(iteration_throughputs) if iteration_throughputs else 0

        th_decimal_mb_s = (total_bytes / (10**6)) * (median_throughput / actual_total) if actual_total > 0 else 0
        th_binary_mib_s = (total_bytes / (2**20)) * (median_throughput / actual_total) if actual_total > 0 else 0

        results_by_concurrency[f"{workers}_workers"] = {
            "workers": workers,
            "chunks_per_worker": chunks_per_worker,
            "total_chunks_processed": actual_total,
            "median_throughput_chunks_per_sec": round(median_throughput, 2),
            "throughput_decimal_mb_s": round(th_decimal_mb_s, 3),
            "throughput_binary_mib_s": round(th_binary_mib_s, 3),
            "median_latency_ms": round(median_lat, 2),
            "mean_latency_ms": round(mean_lat, 2),
            "p95_latency_ms": round(p95_lat, 2),
            "max_latency_ms": round(max_lat, 2),
            "transaction_failures": total_errors,
        }

    return results_by_concurrency


if __name__ == "__main__":
    print("=== CardioCoreEdge Normalized SQLite Workload Benchmark ===")
    res = asyncio.run(run_sqlite_normalized_benchmark())
    for k, v in res.items():
        if k == "_metadata":
            print(f"\nMetadata: {v}\n")
        else:
            print(f"[{k}]")
            for sub_k, sub_v in v.items():
                print(f"  {sub_k}: {sub_v}")
