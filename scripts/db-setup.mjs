import { readFile } from 'node:fs/promises';
import nextEnv from '@next/env';
import pg from 'pg';

nextEnv.loadEnvConfig(process.cwd(), true);

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL in .env.local before running db:setup.');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

try {
  const [schema, seed] = await Promise.all([
    readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'),
    readFile(new URL('../db/seed.sql', import.meta.url), 'utf8'),
  ]);
  await client.connect();
  await client.query('BEGIN');
  try {
    await client.query(schema);
    await client.query(seed);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
  console.log('Created and seeded the six Annapurna tables.');
} catch (error) {
  console.error('Database setup failed:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
