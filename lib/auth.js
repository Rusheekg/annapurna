import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { database } from './db';
import { errorResponse } from './api-errors';
import { capSessionCookie, sessionCookieOptions, supabaseConfig } from './supabase-config';

export const accountTables = { donor: 'donors', receiver: 'receivers', volunteer: 'volunteers' };
export const signInRequired = { code: 'UNAUTHENTICATED', message: 'Sign in to continue.' };
export const profileRequired = { code: 'ONBOARDING_REQUIRED', message: 'Complete your account setup to continue.' };
export const roleForbidden = { code: 'FORBIDDEN', message: 'This action is unavailable for your account role.' };

export async function authClient() {
  const config = supabaseConfig();
  if (!config) return null;
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions: sessionCookieOptions,
    cookies: {
      getAll: () => jar.getAll(),
      setAll(items) {
        try {
          for (const { name, value, options } of items) jar.set(name, value, capSessionCookie(options));
        } catch {
          // Server Components rely on the proxy to persist refreshed cookies.
        }
      },
    },
  });
}

export const getUser = cache(async () => {
  const client = await authClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error && (error.status >= 500 || error.name === 'AuthRetryableFetchError')) throw error;
  return data.user ?? null;
});

export const getProfile = cache(async (userId) => {
  const { rows: [profile] } = await database().query(
    'SELECT role, account_id AS id FROM public.profiles WHERE user_id = $1', [userId],
  );
  return profile ?? null;
});

export const getIdentity = cache(async () => {
  const user = await getUser();
  const profile = user ? await getProfile(user.id) : null;
  return { user, profile };
});

export function isAdmin(user) {
  const email = user?.email?.trim().toLowerCase();
  return Boolean(user?.email_confirmed_at && email &&
    process.env.ADMIN_EMAILS?.split(',').some((value) => value.trim().toLowerCase() === email));
}

export async function workspaceIdentity() {
  const { user, profile } = await getIdentity();
  if (!user) return { response: errorResponse(401, signInRequired), error: signInRequired };
  if (!profile) return { response: errorResponse(403, profileRequired), error: profileRequired };
  return { user, profile };
}

export async function writeIdentity({ needsProfile = true } = {}) {
  const user = await getUser();
  if (!user) return { response: errorResponse(401, signInRequired) };
  const { rowCount } = await database().query(
    `INSERT INTO public.auth_write_limits AS limits (user_id, attempts)
     VALUES ($1, ARRAY[statement_timestamp()])
     ON CONFLICT (user_id) DO UPDATE
     SET attempts = ARRAY(SELECT t FROM unnest(limits.attempts) AS t
                          WHERE t > statement_timestamp() - interval '1 minute') || statement_timestamp()
     WHERE (SELECT count(*) FROM unnest(limits.attempts) AS t
            WHERE t > statement_timestamp() - interval '1 minute') < 30`,
    [user.id],
  );
  if (!rowCount) {
    return { response: Response.json(
      { error: { code: 'RATE_LIMITED', message: 'You’ve made a lot of changes. Wait a minute and try again.' } },
      { status: 429, headers: { 'Retry-After': '60' } },
    ) };
  }
  const profile = needsProfile ? await getProfile(user.id) : null;
  if (needsProfile && !profile) return { response: errorResponse(403, profileRequired) };
  return { user, profile };
}
