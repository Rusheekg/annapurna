'use server';

import { database } from '../lib/db';
import { validId } from '../lib/listings';
import { distanceKm } from '../lib/matching';
import { runEscalation } from '../lib/escalation';

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
  if (!validId(accountId)) return null;

  const query = role === 'receiver' ? `
    SELECT l.*, d.name AS donor_name, n.match_reason
    FROM public.listings l
    LEFT JOIN public.notifications n ON n.listing_id = l.id AND n.receiver_id = $1
    JOIN public.donors d ON d.id = l.donor_id
    WHERE l.receiver_id = $1 OR
      (n.id IS NOT NULL AND l.status = 'posted' AND l.pickup_by > now())
    ORDER BY COALESCE(n.created_at, l.created_at) DESC, l.id DESC
  ` : role === 'volunteer' ? `
    SELECT l.*, d.name AS donor_name, r.name AS receiver_name, ${distanceKm('v', 'd')} AS pickup_distance_km,
      l.status = 'claimed' AND l.volunteer_id IS NULL
      AND COALESCE(l.volunteer_requested_at, l.claimed_at) <= now() - interval '10 minutes'
      AND v.id IN (
        SELECT nearby.id FROM public.volunteers nearby WHERE nearby.available
        ORDER BY ${distanceKm('nearby', 'd')}, nearby.id LIMIT 3
      ) AS priority_pickup
    FROM public.listings l JOIN public.donors d ON d.id = l.donor_id
    JOIN public.receivers r ON r.id = l.receiver_id
    JOIN public.volunteers v ON v.id = $1
    WHERE l.volunteer_id = v.id OR (v.available AND l.volunteer_id IS NULL
      AND l.status = 'claimed' AND l.pickup_method = 'volunteer' AND l.pickup_by > now())
    ORDER BY priority_pickup DESC NULLS LAST, CASE WHEN l.volunteer_id IS NULL THEN 0
      WHEN l.status IN ('claimed', 'collected') THEN 1 ELSE 2 END,
      pickup_distance_km, l.created_at DESC, l.id DESC
  ` : null;
  if (!query) return null;

  try {
    await runEscalation();
    const { rows } = await database().query(query, [accountId]);
    return rows;
  } catch (error) {
    console.error('Could not load workspace listings:', error.message);
    return null;
  }
}

export async function readMapData(volunteerId) {
  if (volunteerId !== null && !validId(volunteerId)) return null;

  try {
    const { rows: [data] } = await database().query(`
      SELECT
        ARRAY(SELECT json_build_object('id', id, 'name', name, 'lat', lat, 'lng', lng)
          FROM public.donors ORDER BY id) AS donors,
        ARRAY(SELECT json_build_object('id', id, 'name', name, 'lat', lat, 'lng', lng)
          FROM public.receivers ORDER BY id) AS receivers,
        ARRAY(SELECT row_to_json(open) FROM (
          SELECT id, donor_id, food_items, portions, veg, allergens, storage, cooked_at, pickup_by
          FROM public.listings
          WHERE status IN ('posted', 'claimed') AND pickup_by > now()
          ORDER BY pickup_by, id
        ) open) AS listings,
        ARRAY(SELECT row_to_json(job) FROM (
          SELECT l.id, l.donor_id, l.receiver_id, l.food_items, d.name AS donor_name, r.name AS receiver_name
          FROM public.listings l
          JOIN public.donors d ON d.id = l.donor_id
          JOIN public.receivers r ON r.id = l.receiver_id
          JOIN public.volunteers v ON v.id = $1
          WHERE (l.status = 'collected' AND l.volunteer_id = v.id)
             OR (l.status = 'claimed' AND l.pickup_by > now() AND (
               l.volunteer_id = v.id OR
               (l.volunteer_id IS NULL AND v.available AND l.pickup_method = 'volunteer')
             ))
          ORDER BY (l.volunteer_id IS NULL), l.pickup_by, l.id
        ) job) AS routes
    `, [volunteerId]);
    return data;
  } catch (error) {
    console.error('Could not load neighbourhood map:', error.message);
    return null;
  }
}
