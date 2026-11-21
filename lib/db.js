import { Pool } from 'pg';

export function database() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing.');
  }

  globalThis.annapurnaPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  return globalThis.annapurnaPool;
}
