import 'server-only';
import { withTransaction } from './transaction';

const loginAttempts = 5;
const resetRequests = 3;
const wrongCodes = 3;

// Every check and its insert happen under one per-email advisory lock, so parallel requests cannot skip a limit.
// Attempts are recorded before the credential is checked and removed again on success.
function locked(email, run) {
  return withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 450833))', [email]);
    await client.query("DELETE FROM public.auth_login_attempts WHERE email = $1 AND created_at < now() - interval '2 days'", [email]);
    return run(client);
  });
}

const insert = (client, email, kind) => client.query(
  'INSERT INTO public.auth_login_attempts (email, kind) VALUES ($1, $2) RETURNING id', [email, kind],
);

// Returns { blocked: true } while the email is locked out, otherwise records one failed attempt up front.
export function reserveLoginAttempt(email) {
  return locked(email, async (client) => {
    const { rows: [state] } = await client.query(
      `SELECT bool_or(kind = 'login_lock') AS blocked FROM public.auth_login_attempts
       WHERE email = $1 AND kind = 'login_lock' AND created_at > now() - interval '15 minutes'`, [email]);
    if (state?.blocked) return { blocked: true };
    await insert(client, email, 'login_fail');
    const { rows: [{ count }] } = await client.query(
      `SELECT count(*)::int AS count FROM public.auth_login_attempts
       WHERE email = $1 AND kind = 'login_fail' AND created_at > now() - interval '15 minutes'
         AND created_at > coalesce((SELECT max(created_at) FROM public.auth_login_attempts
                                    WHERE email = $1 AND kind = 'login_lock'), '-infinity')`, [email]);
    if (count >= loginAttempts) await insert(client, email, 'login_lock');
    return { blocked: false };
  });
}

export function clearLoginAttempts(email) {
  return locked(email, (client) => client.query(
    "DELETE FROM public.auth_login_attempts WHERE email = $1 AND kind IN ('login_fail', 'login_lock')", [email]));
}

// At most 3 reset requests per email in 24 hours. A refused request is not recorded.
export function takeResetRequest(email) {
  return locked(email, async (client) => {
    const { rows: [{ count }] } = await client.query(
      `SELECT count(*)::int AS count FROM public.auth_login_attempts
       WHERE email = $1 AND kind = 'reset_request' AND created_at > now() - interval '24 hours'`, [email]);
    if (count >= resetRequests) return false;
    await insert(client, email, 'reset_request');
    return true;
  });
}

// Wrong codes count from the latest reset request, so asking for a new code starts a fresh set of 3 tries.
export function reserveResetCodeAttempt(email) {
  return locked(email, async (client) => {
    const { rows: [{ count }] } = await client.query(
      `SELECT count(*)::int AS count FROM public.auth_login_attempts
       WHERE email = $1 AND kind = 'reset_wrong_code'
         AND created_at > coalesce((SELECT max(created_at) FROM public.auth_login_attempts
                                    WHERE email = $1 AND kind = 'reset_request'), '-infinity')`, [email]);
    if (count >= wrongCodes) return { blocked: true };
    const { rows: [{ id }] } = await insert(client, email, 'reset_wrong_code');
    return { blocked: false, id, remaining: wrongCodes - count - 1 };
  });
}

export function releaseResetCodeAttempt(id) {
  return withTransaction((client) => client.query('DELETE FROM public.auth_login_attempts WHERE id = $1', [id]));
}
