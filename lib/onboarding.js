import 'server-only';
import { accountTables } from './auth';
import { database } from './db';

export function demoEnabled() {
  return process.env.DEMO_MODE === 'true';
}

export async function availableDemoAccounts() {
  if (!demoEnabled()) return null;
  return Object.fromEntries(await Promise.all(Object.entries(accountTables).map(async ([role, table]) => {
    const { rows } = await database().query(
      `SELECT a.id, a.name FROM public.${table} a
       WHERE a.is_demo AND NOT EXISTS (
         SELECT 1 FROM public.profiles p WHERE p.role = $1 AND p.account_id = a.id
       ) ORDER BY a.name, a.id`, [role],
    );
    return [role, rows];
  })));
}
