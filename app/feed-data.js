'use server';

import { database } from '../lib/db';
import { validId } from '../lib/listings';
import { distanceKm } from '../lib/matching';

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
    SELECT l.*, d.name AS donor_name, r.name AS receiver_name, ${distanceKm('v', 'd')} AS pickup_distance_km
    FROM public.listings l JOIN public.donors d ON d.id = l.donor_id
    JOIN public.receivers r ON r.id = l.receiver_id
    JOIN public.volunteers v ON v.id = $1
    WHERE l.volunteer_id = v.id OR (v.available AND l.volunteer_id IS NULL
      AND l.status = 'claimed' AND l.pickup_method = 'volunteer' AND l.pickup_by > now())
    ORDER BY CASE WHEN l.volunteer_id IS NULL THEN 0
      WHEN l.status IN ('claimed', 'collected') THEN 1 ELSE 2 END,
      pickup_distance_km, l.created_at DESC, l.id DESC
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
