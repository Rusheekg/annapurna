import { hasOnlyFields, invalidBody, readBody } from '@/lib/json-body';
import { database } from '../../../lib/db';
import { allergens, maxPortions, storageLabels } from '../../../lib/listings';
import { insertListingAndOffers } from '../../../lib/matching';
import { runEscalation } from '../../../lib/escalation';
import { errorResponse, serverFailure } from '@/lib/api-errors';
import { expiredMessage, invalidField, missingAccount } from '@/lib/request-errors';
import { workspaceIdentity, writeIdentity } from '@/lib/auth';
import { withTransaction } from '@/lib/transaction';

const hour = 60 * 60 * 1000;
const noMatchMessage = "Posted. No receiver can reach it in time yet; we'll keep offering it.";

function invalid(field, message) {
  return errorResponse(400, invalidField(field, message));
}

export async function GET() {
  try {
    const { accounts, response } = await workspaceIdentity();
    if (response) return response;
    const donorId = accounts.donor;
    await runEscalation();
    if (!(await database().query('SELECT 1 FROM public.donors WHERE id = $1', [donorId])).rows.length) {
      return errorResponse(404, missingAccount);
    }
    const { rows } = await database().query(
      'SELECT * FROM public.listings WHERE donor_id = $1 ORDER BY created_at DESC, id DESC',
      [donorId],
    );
    return Response.json(rows);
  } catch (error) {
    return errorResponse(503, serverFailure('Load donor listings', error));
  }
}

async function post(request, donorId) {
  const body = await readBody(request);
  if (!hasOnlyFields(body, ['foodItems', 'veg', 'portions', 'storage', 'allergens', 'cookedAt', 'pickupBy'])) return invalidBody();

  const { veg, portions, storage, cookedAt, pickupBy } = body;
  const foodItems = typeof body.foodItems === 'string' ? body.foodItems.trim() : '';
  const cookedTime = typeof cookedAt === 'string' && cookedAt.length <= 40 ? Date.parse(cookedAt) : NaN;
  const pickupTime = typeof pickupBy === 'string' && pickupBy.length <= 40 ? Date.parse(pickupBy) : NaN;
  if (!foodItems || foodItems.length > 500 || foodItems.includes('\0')) return invalid('foodItems', 'Choose a food item or enter up to 500 characters.');
  if (!Number.isInteger(portions) || portions < 1 || portions > maxPortions) {
    return invalid('portions', 'Portions must be between 1 and 5,000. Enter a whole number.');
  }
  if (typeof veg !== 'boolean') return invalid('veg', 'Choose a food type.');
  if (typeof storage !== 'string' || !Object.hasOwn(storageLabels, storage)) return invalid('storage', 'Choose a storage method.');
  if (!Array.isArray(body.allergens) || body.allergens.length > allergens.length || !body.allergens.every((item) => allergens.includes(item))) {
    return invalid('allergens', 'Choose recognized allergens.');
  }
  const now = Date.now();
  if (!Number.isFinite(cookedTime) || cookedTime > now || cookedTime < now - 12 * hour) {
    return invalid('cookedAt', 'Choose a cooking time within the past 12 hours.');
  }
  if (pickupTime <= now) return invalid('pickupBy', expiredMessage);
  if (!Number.isFinite(pickupTime) || pickupTime > now + 24 * hour) {
    return invalid('pickupBy', 'Choose a pickup time within the next 24 hours.');
  }
  if (pickupTime <= cookedTime) return invalid('pickupBy', 'Choose a pickup time after cooking.');

  return withTransaction(async (client) => {
    // Serialize competing submissions for this donor across application instances.
    await client.query('SELECT pg_advisory_xact_lock(450833, $1)', [donorId]);
    const { rows: [recent] } = await client.query(
      `SELECT count(*)::int AS count, max(created_at) FILTER (
         WHERE created_at >= now() - interval '30 minutes'
           AND cooked_at < $4::timestamptz AND pickup_by > $3::timestamptz
           AND ARRAY(SELECT trim(regexp_replace(part, '[[:space:]]+', ' ', 'g'))
                     FROM regexp_split_to_table(lower(food_items), ',') AS part ORDER BY 1)
             = ARRAY(SELECT trim(regexp_replace(part, '[[:space:]]+', ' ', 'g'))
                     FROM regexp_split_to_table(lower($2::text), ',') AS part ORDER BY 1)
       ) AS duplicate_at
       FROM public.listings WHERE donor_id = $1 AND created_at >= now() - interval '1 hour'`,
      [donorId, foodItems, new Date(cookedTime).toISOString(), new Date(pickupTime).toISOString()],
    );
    if (recent.duplicate_at) {
      const time = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
      }).format(recent.duplicate_at);
      return errorResponse(409, { code: 'DUPLICATE_LISTING', message: `This looks like a duplicate of your listing posted at ${time}.` });
    }
    if (recent.count >= 10) {
      return Response.json({ error: { code: 'RATE_LIMITED', message: 'You’ve posted 10 listings in the last hour. Try again later.' } },
        { status: 429, headers: { 'Retry-After': '3600' } });
    }
    const { rows } = await client.query(
      insertListingAndOffers,
      [donorId, foodItems, veg, portions, storage, [...new Set(body.allergens)],
        new Date(cookedTime).toISOString(), new Date(pickupTime).toISOString()],
    );
    if (!rows.length) {
      if (!(await client.query('SELECT 1 FROM public.donors WHERE id = $1', [donorId])).rows.length) {
        return errorResponse(404, missingAccount);
      }
      if (pickupTime <= Date.now()) return errorResponse(409, { code: 'EXPIRED', message: expiredMessage, field: 'pickupBy' });
      throw new Error('Listing insert returned no rows with an active donor and pickup window.');
    }
    const listing = rows[0];
    if (listing.offerCount === 0) listing.message = noMatchMessage;
    return Response.json(listing, { status: 201 });
  });
}

export async function POST(request) {
  try {
    const { accounts, response } = await writeIdentity();
    if (response) return response;
    return await post(request, accounts.donor);
  } catch (error) {
    return errorResponse(503, serverFailure('Post surplus', error, true));
  }
}
