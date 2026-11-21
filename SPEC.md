# Annapurna — Build Spec (for the coding agent)

Build this app in the milestones at the bottom, one at a time. After each milestone, stop so it can be run and tested.

## 1. What it is
A web app that connects surplus food from **hostel messes / college canteens** in one city neighbourhood to nearby **receivers** (NGOs, community kitchens, shelters), coordinated by **volunteers**, before the food spoils.

## 2. Stack (do not change)
- Next.js 14+ (App Router), JavaScript or TypeScript, Tailwind CSS
- PostgreSQL hosted on Supabase, accessed via `pg` (node-postgres) using `DATABASE_URL`. No ORM, no Supabase client library needed.
- Leaflet + react-leaflet with OpenStreetMap tiles (no API keys)
- Live updates by polling every 5 seconds (no WebSockets)
- NO Docker. The app runs locally with `npm run dev` and deploys to Vercel.
- No real login. A top-bar dropdown "View as: Donor / Receiver / Volunteer" plus a second dropdown to pick which donor/receiver/volunteer. Store the choice in localStorage.

## 3. Data model
```sql
donors(id, name, type, lat, lng)                 -- type: 'hostel_mess' | 'canteen'
receivers(id, name, type, lat, lng, daily_need_meals, can_store_chilled BOOLEAN)
volunteers(id, name, lat, lng, available BOOLEAN)
listings(
  id, donor_id, food_items TEXT, veg BOOLEAN, quantity_kg NUMERIC, portions INT,
  storage TEXT,               -- 'hot' | 'room_temp' | 'chilled'
  allergens TEXT[],           -- e.g. {'nuts','dairy','gluten'}
  cooked_at TIMESTAMPTZ, pickup_by TIMESTAMPTZ,
  status TEXT DEFAULT 'posted',  -- posted | claimed | collected | delivered | expired
  receiver_id NULL, volunteer_id NULL,
  created_at, claimed_at, collected_at, delivered_at, expired_at
)
notifications(id, listing_id, receiver_id, round INT, created_at)  -- who was offered the listing
settings(key PRIMARY KEY, value NUMERIC)  -- 'kg_per_meal' = 0.4, 'co2e_per_kg' = 2.5, 'avg_speed_kmph' = 15
```

## 4. Screens
**Donor**
- "Post surplus" form, completable in under a minute: food chips (Rice, Dal, Sabzi, Rotis, Biryani, Curd, Sweets + free text), veg toggle, portions (kg auto-calculated from `kg_per_meal`), storage, allergen chips, cooked-at (default now), pickup-by (default now + 2h).
- "Repeat yesterday's post" button that pre-fills the form from this donor's last listing.
- My listings with a live status timeline (posted → claimed → collected → delivered) and timestamps.

**Receiver**
- Feed of listings offered to this receiver, each showing match reason text, e.g. "2.1 km · fits your need of 60 · arrives 70 min before cutoff".
- Countdown to pickup_by, storage guidance, allergens, veg/non-veg.
- "Claim" button. After claiming: "Request volunteer" or "We'll collect ourselves".

**Volunteer**
- Open pickup jobs near them; "Accept", then "Mark collected", then "Mark delivered".
- Map with donor pin → receiver pin and a straight line between them.

**Map (all roles)** — Leaflet map of the neighbourhood showing donors, receivers, open listings.

**Impact dashboard (public)**
- Meals served, kg food saved, kg CO2e avoided, listings delivered vs expired, avg minutes from post to delivery.
- Each number has an (i) popover showing the formula and assumption values. Assumptions editable on a /settings page.
- Simple bar chart: kg saved per day for the last 7 days.

## 5. Matching (server-side, on every new listing)
1. Distance = haversine(lat/lng) in km. Travel minutes = distance / avg_speed_kmph × 60.
2. Hard filter: drop a receiver if `now + travel_minutes > pickup_by - 30 min`. Drop if storage = 'chilled' and receiver.can_store_chilled = false.
3. Score each remaining receiver (each part normalised 0–1):
   - time_safety = (minutes left after arrival) / (total minutes until pickup_by)
   - closeness = 1 - min(distance, 10) / 10
   - quantity_fit = min(portions, need) / max(portions, need)
   - **score = 0.4·time_safety + 0.3·closeness + 0.3·quantity_fit**
4. Offer the listing to the top 3 (insert notifications, round 1). Store and show the reason text.

## 6. Escalation (run on each poll or with a 1-minute interval)
- Posted and unclaimed for 15 min → offer to the next 3 receivers (round +1).
- Claimed with "request volunteer" and no volunteer in 10 min → highlight to the nearest 3 available volunteers.
- Past pickup_by and not collected → status = 'expired'; donor sees "Expired — do not send this food."

## 7. Guardrails (must be visible in the UI)
- Banner on every listing and on the receiver feed: "Annapurna connects people. It does not certify that food is safe. Check the food before serving."
- Handling guidance by storage type, e.g. room_temp: "Cooked food at room temperature: serve within about 2 hours of cooking." Show a countdown.
- No mention of tax benefits, deductions or legal benefits anywhere.
- Footer: "Demo uses synthetic data. No real addresses or personal details."

## 8. Seed data (synthetic)
- One neighbourhood centred at lat 12.935, lng 77.615 (change if needed). All points within ~3 km.
- 15 donors (invented names like "Hostel Block C Mess"), 10 receivers (invented NGO/kitchen names, daily_need 20–150), 20 volunteers.
- 14 days of past listings (mix of delivered and a few expired) so the dashboard has data.

## 9. Delivery
- `db/schema.sql` and `db/seed.sql`, plus a script `npm run db:setup` (Node, using `pg` and DATABASE_URL) that drops, creates and seeds all tables. Safe to re-run.
- Local run: `npm install` → `npm run db:setup` → `npm run dev` → http://localhost:3000
- Deploy: Vercel (import the GitHub repo, set DATABASE_URL). Use the Supabase **transaction pooler** connection string (port 6543); use a pg Pool with `max: 1` per serverless function and `ssl: { rejectUnauthorized: false }`.
- `.env.example` with DATABASE_URL; `.env.local` in .gitignore. README with run steps.
- Mobile-first layout (donors post from phones).

## Milestones
1. Next.js setup, db:setup script, schema, seed data, role switcher, donor post form, listings table. **Stop.**
2. Matching + receiver feed + claim + status flow + volunteer screens. **Stop.**
3. Map, escalation, "repeat yesterday", guardrail banners. **Stop.**
4. Impact dashboard + settings page + mobile polish + README. **Stop.**
