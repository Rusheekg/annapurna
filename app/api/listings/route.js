import { database } from '../../../lib/db';
import { allergens, maxPortions, storageLabels, validId } from '../../../lib/listings';
import { insertListingAndOffers } from '../../../lib/matching';
import { runEscalation } from '../../../lib/escalation';
import { errorResponse, serverFailure } from '@/lib/api-errors';
import { expiredMessage, invalidField, missingAccount } from '@/lib/request-errors';

const hour = 60 * 60 * 1000;
const noMatchMessage = "Posted. No receiver can reach it in time yet; we'll keep offering it.";

function invalid(field, message) {
  return errorResponse(400, invalidField(field, message));
}

export async function GET(request) {
  const donorId = Number(new URL(request.url).searchParams.get('donorId'));
  if (!validId(donorId)) return invalid('donorId', 'Choose a donor.');

  try {
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

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body) return invalid(null, 'Enter listing details.');

  const { donorId, veg, portions, storage, cookedAt, pickupBy } = body;
  const foodItems = typeof body.foodItems === 'string' ? body.foodItems.trim() : '';
  const cookedTime = typeof cookedAt === 'string' ? Date.parse(cookedAt) : NaN;
  const pickupTime = typeof pickupBy === 'string' ? Date.parse(pickupBy) : NaN;
  if (!validId(donorId)) return invalid('donorId', 'Choose a donor.');
  if (!foodItems || foodItems.length > 500) return invalid('foodItems', 'Choose a food item or enter up to 500 characters.');
  if (!Number.isInteger(portions) || portions < 1 || portions > maxPortions) {
    return invalid('portions', 'Portions must be between 1 and 5,000. Enter a whole number.');
  }
  if (typeof veg !== 'boolean') return invalid('veg', 'Choose a food type.');
  if (typeof storage !== 'string' || !Object.hasOwn(storageLabels, storage)) return invalid('storage', 'Choose a storage method.');
  if (!Array.isArray(body.allergens) || !body.allergens.every((item) => allergens.includes(item))) {
    return invalid('allergens', 'Choose recognized allergens.');
  }
  const now = Date.now();
  if (!Number.isFinite(cookedTime) || cookedTime > now || cookedTime < now - 12 * hour) {
    return invalid('cookedAt', 'Choose a cooking time within the past 12 hours.');
  }
  if (pickupTime <= now) return errorResponse(409, { code: 'EXPIRED', message: expiredMessage, field: 'pickupBy' });
  if (!Number.isFinite(pickupTime) || pickupTime > now + 24 * hour) {
    return invalid('pickupBy', 'Choose a pickup time within the next 24 hours.');
  }
  if (pickupTime <= cookedTime) return invalid('pickupBy', 'Choose a pickup time after cooking.');

  try {
    const { rows } = await database().query(
      insertListingAndOffers,
      [donorId, foodItems, veg, portions, storage, [...new Set(body.allergens)],
        new Date(cookedTime).toISOString(), new Date(pickupTime).toISOString()],
    );
    if (!rows.length) {
      if (!(await database().query('SELECT 1 FROM public.donors WHERE id = $1', [donorId])).rows.length) {
        return errorResponse(404, missingAccount);
      }
      if (pickupTime <= Date.now()) return errorResponse(409, { code: 'EXPIRED', message: expiredMessage, field: 'pickupBy' });
      throw new Error('Listing insert returned no rows with an active donor and pickup window.');
    }
    const listing = rows[0];
    if (listing.offerCount === 0) listing.message = noMatchMessage;
    return Response.json(listing, { status: 201 });
  } catch (error) {
    return errorResponse(503, serverFailure('Post surplus', error, true));
  }
}
