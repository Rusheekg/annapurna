import { roleForbidden, writeIdentity } from '@/lib/auth';
import { errorResponse, serverFailure } from '@/lib/api-errors';
import { validId } from '@/lib/listings';
import { demoEnabled } from '@/lib/onboarding';
import { invalidField } from '@/lib/request-errors';
import { withTransaction } from '@/lib/transaction';

// First visit to Receive: "Who are you receiving for?" creates (or links, in demo mode) the user's receiver record.
export async function POST(request) {
  try {
    const { user, accounts, response } = await writeIdentity();
    if (response) return response;
    const body = await request.json().catch(() => null);
    const demoId = body?.demoId;
    const linking = demoId != null;
    if (linking && !demoEnabled()) return errorResponse(403, roleForbidden);
    if (linking && !validId(demoId)) return errorResponse(400, invalidField('demoId', 'Choose an available demo organisation.'));
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const { dailyNeed } = body ?? {};
    if (!linking) {
      if (!name || name.length > 100) return errorResponse(400, invalidField('name', 'Enter an organisation name of up to 100 characters.'));
      if (!Number.isInteger(dailyNeed) || dailyNeed < 1 || dailyNeed > 2147483647) {
        return errorResponse(400, invalidField('dailyNeed', 'Enter a positive whole number of people.'));
      }
      if (body.lat != null && (!Number.isFinite(body.lat) || Math.abs(body.lat) > 90 || !Number.isFinite(body.lng) || Math.abs(body.lng) > 180)) {
        return errorResponse(400, invalidField('location', 'Choose a location on the map.'));
      }
    }

    return await withTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(450832, hashtext($1))', [user.id]);
      if ((await client.query("SELECT 1 FROM public.user_roles WHERE user_id = $1 AND role = 'receiver'", [user.id])).rowCount) {
        return errorResponse(409, { code: 'ALREADY_RECEIVING', message: 'Receiving is already set up for your account.' });
      }
      let id = demoId;
      if (linking) {
        const { rowCount } = await client.query('SELECT id FROM public.receivers WHERE id = $1 AND is_demo FOR UPDATE', [demoId]);
        const linked = rowCount && (await client.query(
          "SELECT 1 FROM public.user_roles WHERE role = 'receiver' AND account_id = $1", [demoId],
        )).rowCount;
        if (!rowCount || linked) return errorResponse(409, {
          code: 'DEMO_UNAVAILABLE', field: 'demoId', message: 'That demo organisation is unavailable. Choose another or create your own.',
        });
      } else {
        // The location defaults to the area saved during sign-up, read from the user's own donor record.
        const { rows: [area] } = await client.query('SELECT lat, lng FROM public.donors WHERE id = $1', [accounts.donor]);
        const { rows: [created] } = await client.query(
          `INSERT INTO public.receivers (name, lat, lng, daily_need_meals, type, can_store_chilled)
           VALUES ($1, $2, $3, $4, 'community_kitchen', $5) RETURNING id`,
          [name, body.lat ?? area.lat, body.lng ?? area.lng, dailyNeed, body.canStoreChilled === true],
        );
        id = created.id;
      }
      await client.query("INSERT INTO public.user_roles (user_id, role, account_id) VALUES ($1, 'receiver', $2)", [user.id, id]);
      return Response.json({ ok: true }, { status: 201 });
    });
  } catch (error) {
    return errorResponse(503, serverFailure('Set up receiving', error, true));
  }
}
