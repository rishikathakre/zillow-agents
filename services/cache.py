"""SQLite-backed API response cache with per-entry TTL."""
from __future__ import annotations
import json
import sqlite3
import time
from pathlib import Path
from typing import Any

CACHE_DB = Path(__file__).parent.parent / "data" / "api_cache.db"


def _conn() -> sqlite3.Connection:
    CACHE_DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(CACHE_DB), check_same_thread=False)
    conn.execute(
        """CREATE TABLE IF NOT EXISTS api_cache (
            key TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            expires_at REAL NOT NULL
        )"""
    )
    conn.commit()
    return conn


def get(key: str) -> Any | None:
    try:
        conn = _conn()
        row = conn.execute(
            "SELECT data, expires_at FROM api_cache WHERE key = ?", (key,)
        ).fetchone()
        conn.close()
        if row and time.time() < row[1]:
            return json.loads(row[0])
    except Exception:
        pass
    return None


def set(key: str, data: Any, ttl_seconds: int = 3600) -> None:
    try:
        conn = _conn()
        conn.execute(
            "INSERT OR REPLACE INTO api_cache(key, data, expires_at) VALUES (?,?,?)",
            (key, json.dumps(data), time.time() + ttl_seconds),
        )
        conn.commit()
        conn.close()
    except Exception:
        pass


def invalidate(key: str) -> None:
    try:
        conn = _conn()
        conn.execute("DELETE FROM api_cache WHERE key = ?", (key,))
        conn.commit()
        conn.close()
    except Exception:
        pass
