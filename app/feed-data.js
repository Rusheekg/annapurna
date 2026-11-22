'use server';

import { database } from '../lib/db';
import { distanceKm, volunteerPickupRadiusKm } from '../lib/matching';
import { runEscalation } from '../lib/escalation';
import { settingKeys, settingsFromRows } from '../lib/settings';
import { serverFailure } from '@/lib/api-errors';
import { missingAccount } from '@/lib/request-errors';
import { workspaceIdentity } from '@/lib/auth';

export async function readImpact() {
  try {
    const { rows } = await database().query(
      `WITH today AS (
         SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date AS day
       ), daily AS (
         SELECT (delivered_at AT TIME ZONE 'Asia/Kolkata')::date AS day, SUM(quantity_kg) AS kg
         FROM public.listings, today
         WHERE status = 'delivered'
           AND delivered_at >= ((today.day - 6)::timestamp AT TIME ZONE 'Asia/Kolkata')
           AND delivered_at < ((today.day + 1)::timestamp AT TIME ZONE 'Asia/Kolkata')
         GROUP BY 1
       ), totals AS (
         SELECT COALESCE(SUM(portions) FILTER (WHERE status = 'delivered'), 0) AS meals,
           COALESCE(SUM(quantity_kg) FILTER (WHERE status = 'delivered'), 0) AS kg,
           COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
           COUNT(*) FILTER (WHERE status = 'expired'
             OR (status IN ('posted', 'claimed') AND pickup_by <= now())) AS expired,
           AVG(EXTRACT(EPOCH FROM delivered_at - created_at) / 60)
             FILTER (WHERE status = 'delivered' AND delivered_at >= created_at) AS "averageMinutes"
         FROM public.listings
       )
       SELECT totals.*,
         totals.kg * (SELECT value FROM public.settings WHERE key = 'co2e_per_kg') AS co2e,
         ARRAY(SELECT row_to_json(s) FROM public.settings s WHERE key = ANY($1::text[])) AS settings,
         ARRAY(SELECT json_build_object('day', (today.day - offsets.days)::text, 'kg', COALESCE(daily.kg, 0))
           FROM today CROSS JOIN generate_series(0, 6) AS offsets(days)
           LEFT JOIN daily ON daily.day = today.day - offsets.days
           ORDER BY offsets.days DESC) AS days
       FROM totals`,
      [settingKeys],
    );
    return { ...rows[0], settings: settingsFromRows(rows[0].settings) };
  } catch (error) {
    return { error: serverFailure('Load impact', error) };
  }
}

export async function readWorkspaceListings() {
  try {
    const { profile, error } = await workspaceIdentity();
    if (error) return { error };
    const { role, id: accountId } = profile;

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
      AND l.status = 'claimed' AND l.pickup_method = 'volunteer' AND l.pickup_by > now()
      AND ${distanceKm('v', 'd')} <= ${volunteerPickupRadiusKm})
    ORDER BY priority_pickup DESC NULLS LAST, CASE WHEN l.volunteer_id IS NULL THEN 0
      WHEN l.status IN ('claimed', 'collected') THEN 1 ELSE 2 END,
      pickup_distance_km, l.created_at DESC, l.id DESC
  ` : null;
  if (!query) return { error: missingAccount };

    await runEscalation();
    const accounts = role === 'receiver' ? 'receivers' : 'volunteers';
    if (!(await database().query(`SELECT 1 FROM public.${accounts} WHERE id = $1`, [accountId])).rows.length) {
      return { error: missingAccount };
    }
    const { rows } = await database().query(query, [accountId]);
    return rows;
  } catch (error) {
    return { error: serverFailure('Load workspace listings', error) };
  }
}

export async function readMapData() {
  try {
    const { profile, error } = await workspaceIdentity();
    if (error) return { error };
    const volunteerId = profile.role === 'volunteer' ? profile.id : null;
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
               (l.volunteer_id IS NULL AND v.available AND l.pickup_method = 'volunteer'
                 AND ${distanceKm('v', 'd')} <= ${volunteerPickupRadiusKm})
             ))
          ORDER BY (l.volunteer_id IS NULL), l.pickup_by, l.id
        ) job) AS routes
    `, [volunteerId]);
    return data;
  } catch (error) {
    return { error: serverFailure('Load neighbourhood map', error) };
  }
}
