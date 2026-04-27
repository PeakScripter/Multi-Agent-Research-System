import sqlite3
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_PATH = "research_history.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id TEXT PRIMARY KEY,
            topic TEXT NOT NULL,
            created_at TEXT NOT NULL,
            result_json TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def save_to_history(id: str, topic: str, result: Dict[str, Any]):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Serialize dict to JSON string, handling potential non-serializable objects
    result_json = json.dumps(result, default=str)
    cursor.execute(
        "INSERT OR REPLACE INTO history (id, topic, created_at, result_json) VALUES (?, ?, ?, ?)",
        (id, topic, datetime.utcnow().isoformat(), result_json)
    )
    conn.commit()
    conn.close()

def get_all_history() -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, topic, created_at FROM history ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_history_by_id(id: str) -> Optional[Dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, topic, created_at, result_json FROM history WHERE id = ?", (id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        data = dict(row)
        data["result"] = json.loads(data["result_json"])
        del data["result_json"]
        return data
    return None

def delete_history(id: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM history WHERE id = ?", (id,))
    conn.commit()
    conn.close()

# Initialize on import
init_db()
