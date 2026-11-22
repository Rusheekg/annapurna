# Annapurna

Annapurna connects surplus food from campus messes and canteens with nearby community kitchens, shelters, and NGOs. CodeBenders ACE Hackathon 2026.

## Run locally

1. Install Node.js 22 or newer, then run `npm install`.
2. Copy `.env.example` to `.env.local`. Set `DATABASE_URL` to the Supabase transaction pooler URL (port 6543). Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the same Supabase project. URL-encode special characters in the database password.
3. On an existing Milestone 4 database, apply [the accounts migration](db/migrations/004-accounts.sql) once. It preserves the existing organisations and listings. On a fresh disposable Supabase project, `npm run db:setup -- --force` creates and seeds the app tables. That command replaces the application tables, including profiles, and should only be used for intentional resets.
4. Run `npm run dev` and open [localhost:3000](http://localhost:3000).

In Windows PowerShell, use `npm.cmd` wherever a command above uses `npm` if execution policy blocks the npm PowerShell wrapper.

## Email sign-in

Enable the Email provider and sign-ups in Supabase Auth. Put `{{ .Token }}` in the confirmation and magic-link email templates so both new and returning users receive a six-digit code. Keep the resend interval at 60 seconds. Configure a custom SMTP sender for users outside the Supabase project team. The SSR proxy refreshes sessions, and refreshed browser cookies have a 30-day lifetime. Configure a 30-day session time box in Supabase if an absolute limit is required. [Supabase email OTP setup](https://supabase.com/docs/guides/auth/auth-email-passwordless)

The home and impact pages are public. After a first sign-in, set up one donor, receiver, or volunteer profile. Only confirmed emails on the server's comma-separated `ADMIN_EMAILS` list can change the shared assumptions.

## Demo mode

Set `DEMO_MODE=true` to offer unlinked seeded organisations during onboarding. Each organisation can be linked to one sign-in. Judges need separate email addresses to try the donor, receiver, and volunteer roles. The setup seeds 14 days of listing history relative to the setup date.

## Architecture

- Next.js App Router renders the public pages and authenticated workspaces. Route Handlers and Server Actions verify the Supabase user before looking up their profile and accessing PostgreSQL through the server-side `pg` pool.
- Posting serializes checks per donor. Matching offers and the listing are inserted together. Donors can post 10 listings per hour, and each user can make 30 app write requests per minute. Workspaces poll every five seconds for updates.
- Volunteers see open pickups within 5 km, measured in a straight line to the donor. Assigned jobs stay available for tracking and handover. Leaflet displays the neighbourhood and pickup routes over OpenStreetMap tiles.
- In Vercel, set the variables from `.env.example` in the Preview environment for the auth branch and use Node.js 22 or later.

## Impact assumptions

| Metric | Calculation |
| --- | --- |
| Meals served | Sum of portions on delivered listings. Each portion counts as one meal. |
| Kg food saved | Sum of stored weights on delivered listings. New posts use portions × kg per meal, seeded at 0.4 kg. Edits apply to future posts. |
| Kg CO₂e avoided | Kg food saved × the current CO₂e factor, seeded at 2.5 kg CO₂e per kg of food. This is an estimate, and factor edits recalculate the all-time total. |
| Delivered vs expired | Counts of delivered and expired listings. Posted or claimed listings count as expired once their pickup deadline passes. |
| Average delivery time | Mean of delivery timestamp minus post timestamp in minutes across delivered listings with valid timestamps. |
| Kg saved per day | Delivered weight grouped by delivery date in India Standard Time. The chart includes today and the preceding six days, with zeroes for days without deliveries. |

The average travel speed is seeded at 15 km/h. Matching estimates travel time as distance ÷ speed × 60. The impact dashboard uses actual post and delivery timestamps for its average.
