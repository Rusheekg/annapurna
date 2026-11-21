import 'server-only';

// SQL expression for distance on a sphere, with the sine term clamped for rounding.
export function distanceKm(origin, destination) {
  return `12742 * asin(sqrt(least(1,
    power(sin(radians(${destination}.lat - ${origin}.lat) / 2), 2) +
    cos(radians(${origin}.lat)) * cos(radians(${destination}.lat)) *
    power(sin(radians(${destination}.lng - ${origin}.lng) / 2), 2)
  )))`;
}

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
  ), candidates AS (
    SELECT l.id AS listing_id, r.id AS receiver_id, l.portions, r.daily_need_meals AS need,
      EXTRACT(EPOCH FROM l.pickup_by - l.created_at) / 60 AS minutes_left,
      ${distanceKm('d', 'r')} AS km, s.value AS speed
    FROM new_listing l
    JOIN public.donors d ON d.id = l.donor_id
    JOIN public.settings s ON s.key = 'avg_speed_kmph'
    CROSS JOIN public.receivers r
    WHERE l.storage <> 'chilled' OR r.can_store_chilled
  ), arrivals AS (
    SELECT *, minutes_left - km / speed * 60 AS minutes_early FROM candidates
  ), offers AS (
    INSERT INTO public.notifications (listing_id, receiver_id, round, match_reason)
    SELECT listing_id, receiver_id, 1, concat(
      round(km::numeric, 1), ' km · ',
      CASE WHEN portions <= need THEN concat('fits your need of ', need)
           ELSE concat(portions, ' portions for a need of ', need) END,
      ' · arrives ', floor(minutes_early)::int, ' min before cutoff'
    )
    FROM arrivals WHERE minutes_early >= 30
    ORDER BY .4 * minutes_early / minutes_left + .3 * (1 - least(km, 10) / 10)
      + .3 * least(portions, need)::numeric / greatest(portions, need) DESC, receiver_id
    LIMIT 3
    RETURNING listing_id
  )
  SELECT new_listing.*, (SELECT count(*)::int FROM offers) AS "offerCount"
  FROM new_listing
`;
