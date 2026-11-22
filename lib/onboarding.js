import 'server-only';
import { database } from './db';

const demoQueries = {
  donor: `SELECT a.id, a.name FROM public.donors a
    WHERE a.is_demo AND NOT EXISTS (
      SELECT 1 FROM public.user_roles p WHERE p.role = $1 AND p.account_id = a.id
    ) ORDER BY a.name, a.id`,
  receiver: `SELECT a.id, a.name FROM public.receivers a
    WHERE a.is_demo AND NOT EXISTS (
      SELECT 1 FROM public.user_roles p WHERE p.role = $1 AND p.account_id = a.id
    ) ORDER BY a.name, a.id`,
  volunteer: `SELECT a.id, a.name FROM public.volunteers a
    WHERE a.is_demo AND NOT EXISTS (
      SELECT 1 FROM public.user_roles p WHERE p.role = $1 AND p.account_id = a.id
    ) ORDER BY a.name, a.id`,
};

export function demoEnabled() {
  return process.env.DEMO_MODE === 'true';
}

export async function availableDemoAccounts(roles = Object.keys(demoQueries)) {
  if (!demoEnabled()) return null;
  return Object.fromEntries(await Promise.all(Object.keys(demoQueries).filter((role) => roles.includes(role)).map(async (role) => {
    const { rows } = await database().query(
      demoQueries[role], [role],
    );
    return [role, rows];
  })));
}
