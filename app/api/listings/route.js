import { database } from '../../../lib/db';
import { allergens, storageLabels, validId } from '../../../lib/listings';
import { insertListingAndOffers } from '../../../lib/matching';

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
  if (!validId(portions)) return invalid('Enter a positive whole number of portions.');
  if (typeof veg !== 'boolean' || !Object.hasOwn(storageLabels, storage)) {
    return invalid('Choose a food type and storage method.');
  }
  if (!Array.isArray(body.allergens) || !body.allergens.every((item) => allergens.includes(item))) {
    return invalid('Choose recognized allergens.');
  }
  if (!Number.isFinite(cookedTime) || !Number.isFinite(pickupTime) ||
      pickupTime <= cookedTime || pickupTime <= Date.now()) {
    return invalid('Pickup must be in the future and after cooking.');
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
    return Response.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Could not post surplus:', error.message);
    return Response.json({ error: 'Could not post surplus.' }, { status: 500 });
  }
}
