import { accountTables, roleForbidden, writeIdentity } from '@/lib/auth';
import { errorResponse, serverFailure } from '@/lib/api-errors';
import { validId } from '@/lib/listings';
import { demoEnabled } from '@/lib/onboarding';
import { invalidField } from '@/lib/request-errors';
import { withTransaction } from '@/lib/transaction';

const accountInserts = {
  donor: "INSERT INTO public.donors (name, lat, lng, type) VALUES ($1, $2, $3, 'canteen') RETURNING id",
  receiver: "INSERT INTO public.receivers (name, lat, lng, daily_need_meals, type, can_store_chilled) VALUES ($1, $2, $3, $4, 'community_kitchen', $5) RETURNING id",
  volunteer: 'INSERT INTO public.volunteers (name, lat, lng, available) VALUES ($1, $2, $3, true) RETURNING id',
};

export async function POST(request) {
  try {
    const { user, response } = await writeIdentity({ needsProfile: false });
    if (response) return response;
    const body = await request.json().catch(() => null);
    const role = body?.role;
    if (typeof role !== 'string' || !Object.hasOwn(accountTables, role)) {
      return errorResponse(400, invalidField('role', 'Choose a role to continue.'));
    }
    const demoId = body.demoId;
    const linking = demoId != null;
    if (linking && !demoEnabled()) return errorResponse(403, roleForbidden);
    if (linking && !validId(demoId)) return errorResponse(400, invalidField('demoId', 'Choose an available demo organisation.'));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const { lat, lng, dailyNeed, canStoreChilled } = body;
    if (!linking) {
      if (!name || name.length > 100) return errorResponse(400, invalidField('name', 'Enter a name of up to 100 characters.'));
      if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) {
        return errorResponse(400, invalidField('location', 'Choose a location on the map.'));
      }
      if (role === 'receiver' && (!Number.isInteger(dailyNeed) || dailyNeed < 1 || dailyNeed > 2147483647)) {
        return errorResponse(400, invalidField('dailyNeed', 'Enter a positive whole number of meals.'));
      }
    }

    return await withTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(450832, hashtext($1))', [user.id]);
      if ((await client.query('SELECT 1 FROM public.profiles WHERE user_id = $1', [user.id])).rowCount) {
        return errorResponse(409, { code: 'ALREADY_ONBOARDED', message: 'Your account is already set up. Open your workspace.' });
      }
      let id = demoId;
      if (linking) {
        const { rowCount } = await client.query(
          `SELECT id FROM public.${accountTables[role]} WHERE id = $1 AND is_demo FOR UPDATE`, [demoId],
        );
        const linked = rowCount && (await client.query(
          'SELECT 1 FROM public.profiles WHERE role = $1 AND account_id = $2', [role, demoId],
        )).rowCount;
        if (!rowCount || linked) return errorResponse(409, {
          code: 'DEMO_UNAVAILABLE', field: 'demoId', message: 'That demo organisation is unavailable. Choose another or create your own.',
        });
      } else {
        const args = role === 'receiver' ? [name, lat, lng, dailyNeed, canStoreChilled === true] : [name, lat, lng];
        const { rows: [account] } = await client.query(accountInserts[role], args);
        id = account.id;
      }
      await client.query('INSERT INTO public.profiles (user_id, role, account_id) VALUES ($1, $2, $3)', [user.id, role, id]);
      return Response.json({ ok: true }, { status: 201 });
    });
  } catch (error) {
    return errorResponse(503, serverFailure('Set up account', error, true));
  }
}
