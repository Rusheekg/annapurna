import { database } from '../../../lib/db';
import { allergens, maxPortions, storageLabels, validId } from '../../../lib/listings';
import { insertListingAndOffers } from '../../../lib/matching';

const hour = 60 * 60 * 1000;
const noMatchMessage = "Posted. No receiver can reach it in time yet; we'll keep offering it.";

function invalid(error) {
  return Response.json({ error }, { status: 400 });
}

export async function GET(request) {
  const donorId = Number(new URL(request.url).searchParams.get('donorId'));
  if (!validId(donorId)) return invalid('Choose a donor.');

  try {
    const { rows } = await database().query(
      'SELECT * FROM public.listings WHERE donor_id = $1 ORDER BY created_at DESC, id DESC',
      [donorId],
    );
    return Response.json(rows);
  } catch (error) {
    console.error('Could not load listings:', error.message);
    return Response.json({ error: 'Could not load listings.' }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body) return invalid('Enter listing details.');

  const { donorId, veg, portions, storage, cookedAt, pickupBy } = body;
  const foodItems = typeof body.foodItems === 'string' ? body.foodItems.trim() : '';
  const cookedTime = typeof cookedAt === 'string' ? Date.parse(cookedAt) : NaN;
  const pickupTime = typeof pickupBy === 'string' ? Date.parse(pickupBy) : NaN;
  if (!validId(donorId)) return invalid('Choose a donor.');
  if (!foodItems || foodItems.length > 500) return invalid('Enter food items under 501 characters.');
  if (!Number.isInteger(portions) || portions < 1 || portions > maxPortions) {
    return invalid(`Enter a whole number of portions from 1 to ${maxPortions.toLocaleString('en-US')}.`);
  }
  if (typeof veg !== 'boolean' || !Object.hasOwn(storageLabels, storage)) {
    return invalid('Choose a food type and storage method.');
  }
  if (!Array.isArray(body.allergens) || !body.allergens.every((item) => allergens.includes(item))) {
    return invalid('Choose recognized allergens.');
  }
  const now = Date.now();
  if (!Number.isFinite(cookedTime) || cookedTime > now || cookedTime < now - 12 * hour) {
    return invalid('Cooked at must be a valid time within the past 12 hours and cannot be in the future.');
  }
  if (!Number.isFinite(pickupTime) || pickupTime <= now || pickupTime > now + 24 * hour) {
    return invalid('Pickup by must be a valid future time within the next 24 hours.');
  }

  try {
    const { rows } = await database().query(
      insertListingAndOffers,
      [donorId, foodItems, veg, portions, storage, [...new Set(body.allergens)],
        new Date(cookedTime).toISOString(), new Date(pickupTime).toISOString()],
    );
    if (!rows.length) {
      return Response.json({ error: 'The donor, pickup window or matching settings are unavailable.' }, { status: 409 });
    }
    const listing = rows[0];
    if (listing.offerCount === 0) listing.message = noMatchMessage;
    return Response.json(listing, { status: 201 });
  } catch (error) {
    console.error('Could not post surplus:', error.message);
    return Response.json({ error: 'Could not post surplus.' }, { status: 500 });
  }
}
