import { database } from '../../../lib/db';
import { allergens, storageLabels } from '../../../lib/listings';

function validId(value) {
  return Number.isInteger(value) && value > 0 && value <= 2147483647;
}

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
      `INSERT INTO public.listings
        (donor_id, food_items, veg, portions, quantity_kg, storage, allergens, cooked_at, pickup_by)
       SELECT d.id, $2, $3, $4::int, $4::int * s.value, $5, $6, $7, $8
       FROM public.donors d CROSS JOIN public.settings s
       WHERE d.id = $1 AND s.key = 'kg_per_meal'
       RETURNING *`,
      [donorId, foodItems, veg, portions, storage, [...new Set(body.allergens)],
        new Date(cookedTime).toISOString(), new Date(pickupTime).toISOString()],
    );
    if (!rows.length) {
      return Response.json({ error: 'Donor or meal-weight setting unavailable.' }, { status: 404 });
    }
    return Response.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Could not post surplus:', error.message);
    return Response.json({ error: 'Could not post surplus.' }, { status: 500 });
  }
}
