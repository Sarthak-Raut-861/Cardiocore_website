"""
Pytest configuration and test isolation fixtures for CardioCoreEdge backend test suite.
Ensures seeded test users have an isolated authentication state and deterministic TOTP behavior
across tests regardless of test execution order.
"""

import os
import sqlite3
import pytest


@pytest.fixture(autouse=True)
def isolate_totp_replay_state():
    """
    Test isolation fixture: ensures seeded test users have a clean TOTP replay state
    before and after every test, preventing cross-test ordering dependencies.
    Does not weaken production code or authentication checks.
    """
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "cardiocore_dev.db"))

    def _reset_replay_timesteps():
        if os.path.exists(db_path):
            try:
                conn = sqlite3.connect(db_path, timeout=10.0)
                conn.execute("UPDATE users SET last_totp_timestep = NULL")
                conn.commit()
                conn.close()
            except Exception:
                pass

    _reset_replay_timesteps()
    yield
    _reset_replay_timesteps()
