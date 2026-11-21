import { readFile } from 'node:fs/promises';
import nextEnv from '@next/env';
import pg from 'pg';

nextEnv.loadEnvConfig(process.cwd(), true);

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL in .env.local before running db:setup.');
  process.exit(1);
}

let client;
try {
  client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
} catch {
  console.error('DATABASE_URL is invalid. Check the connection string in .env.local.');
  process.exit(1);
}

const target = JSON.stringify(client.host);
if (!process.argv.slice(2).includes('--force')) {
  console.error(`Refusing to replace the Annapurna tables on database host ${target}. Run npm run db:setup -- --force to proceed.`);
  process.exit(1);
}
console.log(`Replacing the six Annapurna tables and their data on database host ${target}.`);

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
