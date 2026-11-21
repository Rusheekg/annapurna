INSERT INTO public.settings (key, value) VALUES
  ('kg_per_meal', 0.4), ('co2e_per_kg', 2.5), ('avg_speed_kmph', 15);

INSERT INTO public.donors (name, type, lat, lng)
SELECT name, CASE WHEN n <= 10 THEN 'hostel_mess' ELSE 'canteen' END,
  12.935 + 0.018 * sin(n), 77.615 + 0.018 * cos(n)
FROM unnest(ARRAY[
  'Hostel Block A Mess', 'Hostel Block B Mess', 'Hostel Block C Mess',
  'Hostel Block D Mess', 'Hostel Block E Mess', 'Hostel Block F Mess',
  'Hostel Block G Mess', 'Hostel Block H Mess', 'Hostel Block I Mess',
  'Hostel Block J Mess', 'Courtyard Canteen', 'Library Canteen',
  'Student Commons Canteen', 'Garden Canteen', 'Studio Canteen'
]) WITH ORDINALITY AS names(name, n)
ORDER BY n;

INSERT INTO public.receivers (name, type, lat, lng, daily_need_meals, can_store_chilled)
SELECT name, type, 12.935 + 0.021 * sin(n + 0.5), 77.615 + 0.021 * cos(n + 0.5),
  20 + (n - 1) * 14, n % 2 = 0
FROM (VALUES
  (1, 'Open Hearth Kitchen', 'community_kitchen'),
  (2, 'Blue Banyan Collective', 'ngo'),
  (3, 'Lantern House Shelter', 'shelter'),
  (4, 'Juniper Table Kitchen', 'community_kitchen'),
  (5, 'Cedar Bridge Collective', 'ngo'),
  (6, 'Morning Porch Shelter', 'shelter'),
  (7, 'Silver Spoon Kitchen', 'community_kitchen'),
  (8, 'Orchard Circle Collective', 'ngo'),
  (9, 'Mango Court Shelter', 'shelter'),
  (10, 'Paper Lantern Kitchen', 'community_kitchen')
) AS names(n, name, type)
ORDER BY n;

INSERT INTO public.volunteers (name, lat, lng, available)
SELECT 'Demo Volunteer ' || lpad(n::text, 2, '0'),
  12.935 + 0.016 * sin(n + 1.1), 77.615 + 0.016 * cos(n + 1.1), n % 5 <> 0
FROM generate_series(1, 20) AS series(n)
ORDER BY n;

WITH history AS (
  SELECT day, batch, now() - day * interval '1 day' - batch * interval '1 hour' AS posted,
    24 + day + 6 * batch AS portions, batch = 0 AND day % 4 = 0 AS expired
  FROM generate_series(1, 14) AS days(day)
  CROSS JOIN generate_series(0, 1) AS batches(batch)
)
INSERT INTO public.listings (
  donor_id, food_items, veg, quantity_kg, portions, storage, allergens, cooked_at,
  pickup_by, status, receiver_id, volunteer_id, created_at, claimed_at, collected_at,
  delivered_at, expired_at
)
SELECT 1 + (day + 14 * batch) % 15,
  CASE WHEN batch = 0 THEN 'Rice, Dal, Sabzi' ELSE 'Rotis, Sabzi' END,
  true, portions * 0.4, portions, 'hot',
  CASE WHEN batch = 0 THEN ARRAY[]::text[] ELSE ARRAY['gluten'] END,
  posted - interval '20 minutes', posted + interval '2 hours',
  CASE WHEN expired THEN 'expired' ELSE 'delivered' END,
  CASE WHEN NOT expired THEN 1 + day % 10 END,
  CASE WHEN NOT expired THEN 1 + day % 20 END,
  posted,
  CASE WHEN NOT expired THEN posted + interval '10 minutes' END,
  CASE WHEN NOT expired THEN posted + interval '25 minutes' END,
  CASE WHEN NOT expired THEN posted + interval '45 minutes' END,
  CASE WHEN expired THEN posted + interval '2 hours' END
FROM history
ORDER BY posted;
