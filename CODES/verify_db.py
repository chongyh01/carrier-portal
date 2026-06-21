import psycopg2
DB = 'postgresql://postgres.linlnqrroavcutfpmkiz:Cyh96690138cyh!!@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
conn = psycopg2.connect(DB, connect_timeout=30)
cur = conn.cursor()
cur.execute('SET statement_timeout = 0')
for table, min_rows in [('carriers',4000000),('inspections',7000000),('violations',7000000),('crashes',3000000),('insurance',5000000),('authority_history',4000000)]:
    cur.execute(f'SELECT reltuples::bigint FROM pg_class WHERE relname=%s', (table,))
    row = cur.fetchone()
    count = row[0] if row else 0
    status = 'OK' if count >= min_rows else 'LOW'
    print(f'{table}: ~{count:,} [{status}]')
cur.close()
conn.close()
