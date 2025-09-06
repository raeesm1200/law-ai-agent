import sqlite3
from datetime import datetime

DB_PATH = 'law_chatbot.db'
ROW_LIMIT = 1000


def get_columns(conn: sqlite3.Connection, table: str):
    cur = conn.cursor()
    cur.execute(f"PRAGMA table_info('{table}');")
    rows = cur.fetchall()
    return [r[1] for r in rows]


def print_table(conn: sqlite3.Connection, table: str):
    print(f"\n=== TABLE: {table} ===")
    try:
        cols = get_columns(conn, table)
        print('Columns:', cols)

        cur = conn.cursor()
        cur.execute(f"SELECT * FROM '{table}' LIMIT {ROW_LIMIT};")
        rows = cur.fetchall()
        if not rows:
            print('(no rows)')
            return

        # header
        header = ' | '.join(cols)
        print(header)
        print('-' * len(header))
        for r in rows:
            print(' | '.join([str(c) if c is not None else 'NULL' for c in r]))

        # total count
        cur.execute(f"SELECT COUNT(*) FROM '{table}';")
        total = cur.fetchone()[0]
        if total > ROW_LIMIT:
            print(f"...printed {ROW_LIMIT} of {total} rows (limit)")
    except Exception as e:
        print(f"Failed to read table {table}: {e}")


def check_database():
    try:
        conn = sqlite3.connect(DB_PATH)
        print(f"Opened DB: {DB_PATH} at {datetime.utcnow().isoformat()}Z")

        target_tables = ['users', 'subscriptions']
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        existing = [r[0] for r in cur.fetchall()]

        for t in target_tables:
            if t in existing:
                print_table(conn, t)
            else:
                print(f"Table '{t}' not found in database.")

        conn.close()
    except Exception as e:
        print(f"Error reading database {DB_PATH}: {e}")


if __name__ == '__main__':
    check_database()
