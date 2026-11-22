import 'server-only';

export const volunteerPickupRadiusKm = 5;

// SQL expression for distance on a sphere, with the sine term clamped for rounding.
export function distanceKm(origin, destination) {
  return `12742 * asin(sqrt(least(1,
    power(sin(radians(${destination}.lat - ${origin}.lat) / 2), 2) +
    cos(radians(${origin}.lat)) * cos(radians(${destination}.lat)) *
    power(sin(radians(${destination}.lng - ${origin}.lng) / 2), 2)
  )))`;
}

// Both rounds rank eligible, previously unoffered receivers from the time of the offer.
export const nextReceivers = `
  SELECT receiver_id, concat(
    round(km::numeric, 1), ' km · ',
    CASE WHEN l.portions <= need THEN concat('fits your need of ', need)
         ELSE concat(l.portions, ' portions for a need of ', need) END,
    ' · arrives ', floor(minutes_early)::int, ' min before cutoff'
  ) AS reason
  FROM (
    SELECT r.id AS receiver_id, r.daily_need_meals AS need, travel.km, cutoff.minutes_left,
      cutoff.minutes_left - travel.km / s.value * 60 AS minutes_early
    FROM public.receivers r
    CROSS JOIN public.settings s
    CROSS JOIN LATERAL (SELECT ${distanceKm('d', 'r')} AS km) travel
    CROSS JOIN LATERAL (SELECT EXTRACT(EPOCH FROM l.pickup_by - now()) / 60 AS minutes_left) cutoff
    WHERE s.key = 'avg_speed_kmph'
      AND (l.storage <> 'chilled' OR r.can_store_chilled)
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n WHERE n.listing_id = l.id AND n.receiver_id = r.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles poster
        JOIN public.user_roles own ON own.user_id = poster.user_id AND own.role = 'receiver'
        WHERE poster.role = 'donor' AND poster.account_id = l.donor_id AND own.account_id = r.id
      )
  ) arrivals
  WHERE minutes_early >= 30
  ORDER BY .4 * minutes_early / NULLIF(minutes_left, 0) + .3 * (1 - least(km, 10) / 10)
    + .3 * least(l.portions, need)::numeric / greatest(l.portions, need) DESC, receiver_id
  LIMIT 3
`;

export const insertListingAndOffers = `
  WITH new_listing AS (
    INSERT INTO public.listings
      (donor_id, food_items, veg, portions, quantity_kg, storage, allergens, cooked_at, pickup_by)
    SELECT d.id, $2, $3, $4::int, $4::int * w.value, $5, $6, $7, $8
    FROM public.donors d
    JOIN public.settings w ON w.key = 'kg_per_meal'
    JOIN public.settings s ON s.key = 'avg_speed_kmph' AND s.value > 0
    WHERE d.id = $1 AND $8::timestamptz > now()
    RETURNING *
  ), offers AS (
    INSERT INTO public.notifications (listing_id, receiver_id, round, match_reason)
    SELECT l.id, r.receiver_id, 1, r.reason
    FROM new_listing l JOIN public.donors d ON d.id = l.donor_id
    CROSS JOIN LATERAL (${nextReceivers}) r
    RETURNING listing_id
  )
  SELECT new_listing.*, (SELECT count(*)::int FROM offers) AS "offerCount"
  FROM new_listing
`;
