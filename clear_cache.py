import sqlite3
conn = sqlite3.connect("data/api_cache.db")
cur = conn.execute("DELETE FROM api_cache")
conn.commit()
print(f"Cleared {cur.rowcount} cache entries")
conn.close()
