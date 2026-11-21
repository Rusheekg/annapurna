'use server';

import { database } from '../lib/db';

export async function readImpact() {
  try {
    const { rows } = await database().query(
      `SELECT COALESCE(SUM(portions), 0) AS meals, COALESCE(SUM(quantity_kg), 0) AS kg
       FROM public.listings WHERE status = 'delivered'`,
    );
    return rows[0];
  } catch (error) {
    console.error('Could not load impact:', error.message);
    return null;
  }
}

export async function readWorkspaceListings(role, accountId) {
  if (!Number.isInteger(accountId) || accountId < 1 || accountId > 2147483647) return null;

  const query = role === 'receiver' ? `
    SELECT l.id, l.food_items, l.portions, l.quantity_kg, l.veg, l.storage, l.allergens,
      l.pickup_by, l.status, d.name AS donor_name, r.daily_need_meals
    FROM public.notifications n
    JOIN public.receivers r ON r.id = n.receiver_id
    JOIN public.listings l ON l.id = n.listing_id
    JOIN public.donors d ON d.id = l.donor_id
    WHERE n.receiver_id = $1 AND (l.receiver_id = $1 OR
      (l.status = 'posted' AND l.pickup_by > now()))
    ORDER BY n.created_at DESC, l.id DESC
  ` : role === 'volunteer' ? `
    SELECT l.id, l.food_items, l.portions, l.quantity_kg, l.veg, l.storage, l.allergens,
      l.pickup_by, l.status, d.name AS donor_name
    FROM public.listings l JOIN public.donors d ON d.id = l.donor_id
    WHERE l.volunteer_id = $1
    ORDER BY l.created_at DESC, l.id DESC
  ` : null;
  if (!query) return null;

  try {
    const { rows } = await database().query(query, [accountId]);
    return rows;
  } catch (error) {
    console.error('Could not load workspace listings:', error.message);
    return null;
  }
}
