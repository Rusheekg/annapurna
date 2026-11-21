import 'server-only';
import { Pool } from 'pg';

export function database() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing.');
  }

  if (!globalThis.annapurnaPool) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    pool.on('error', (error) => {
      console.error('Idle database connection failed:', error.message);
    });
    globalThis.annapurnaPool = pool;
  }

  return globalThis.annapurnaPool;
}
