import { hasOnlyFields, invalidBody, readBody } from '@/lib/json-body';
import { roleForbidden, writeIdentity } from '@/lib/auth';
import { errorResponse, serverFailure } from '@/lib/api-errors';
import { demoEnabled } from '@/lib/onboarding';
import { invalidField } from '@/lib/request-errors';
import { withTransaction } from '@/lib/transaction';

const inserts = {
  donor: "INSERT INTO public.donors (name, lat, lng, type) VALUES ($1, $2, $3, 'canteen') RETURNING id",
  volunteer: 'INSERT INTO public.volunteers (name, lat, lng, available) VALUES ($1, $2, $3, true) RETURNING id',
};
const freeAccounts = {
  donor: `SELECT a.id FROM public.donors a
    WHERE a.is_demo AND NOT EXISTS (SELECT 1 FROM public.user_roles u WHERE u.role = $1 AND u.account_id = a.id)
    ORDER BY a.id LIMIT 1 FOR UPDATE SKIP LOCKED`,
  volunteer: `SELECT a.id FROM public.volunteers a
    WHERE a.is_demo AND NOT EXISTS (SELECT 1 FROM public.user_roles u WHERE u.role = $1 AND u.account_id = a.id)
    ORDER BY a.id LIMIT 1 FOR UPDATE SKIP LOCKED`,
};

// First sign-in: a display name and an area create the user's donor and volunteer records.
export async function POST(request) {
  try {
    const { user, response } = await writeIdentity({ needsProfile: false });
    if (response) return response;
    const body = await readBody(request);
    const demo = body?.demo === true;
    if (!hasOnlyFields(body, demo ? ['demo'] : ['name', 'lat', 'lng'])) return invalidBody();
    if (demo && !demoEnabled()) return errorResponse(403, roleForbidden);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const { lat, lng } = body ?? {};
    if (!demo) {
      if (!name || name.length > 100 || name.includes('\0')) return errorResponse(400, invalidField('name', 'Enter a display name of up to 100 characters.'));
      if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) {
        return errorResponse(400, invalidField('location', 'Choose your area on the map.'));
      }
    }

    return await withTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(450832, hashtext($1))', [user.id]);
      const { rows: held } = await client.query('SELECT role FROM public.user_roles WHERE user_id = $1', [user.id]);
      const missing = Object.keys(inserts).filter((role) => !held.some((item) => item.role === role));
      if (!missing.length) {
        return errorResponse(409, { code: 'ALREADY_ONBOARDED', message: 'Your account is already set up.' });
      }
      for (const role of missing) {
        let id;
        if (demo) {
          // Link the first demo record nobody has taken yet.
          const { rows: [free] } = await client.query(
            freeAccounts[role], [role],
          );
          if (!free) return errorResponse(409, {
            code: 'DEMO_UNAVAILABLE', message: 'No demo identity is free right now. Create your own instead.',
          });
          id = free.id;
        } else {
          id = (await client.query(inserts[role], [name, lat, lng])).rows[0].id;
        }
        await client.query('INSERT INTO public.user_roles (user_id, role, account_id) VALUES ($1, $2, $3)', [user.id, role, id]);
      }
      return Response.json({ ok: true }, { status: 201 });
    });
  } catch (error) {
    return errorResponse(503, serverFailure('Set up account', error, true));
  }
}
