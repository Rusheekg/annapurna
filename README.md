# Annapurna

Annapurna connects surplus food from campus messes and canteens with nearby community kitchens, shelters, and NGOs. CodeBenders ACE Hackathon 2026.

## Run locally

1. Install Node.js 22 or newer, then run `npm install`.
2. Copy `.env.example` to `.env.local`. Set `DATABASE_URL` to the Supabase transaction pooler URL (port 6543). Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the same Supabase project. URL-encode special characters in the database password.
3. On an existing Milestone 4 database, apply [the accounts migration](db/migrations/004-accounts.sql), then [the user-roles migration](db/migrations/005-user-roles.sql), once each. It preserves the existing organisations and listings. On a fresh disposable Supabase project, `npm run db:setup -- --force` creates and seeds the app tables. That command replaces the application tables, including profiles and user roles, and should only be used for intentional resets.
4. Run `npm run dev` and open [localhost:3000](http://localhost:3000).

In Windows PowerShell, use `npm.cmd` wherever a command above uses `npm` if execution policy blocks the npm PowerShell wrapper.

## Email sign-in

Accounts use email + password. Enable the Email provider, sign-ups and **Confirm email** in Supabase Auth, and put `{{ .Token }}` in the Confirm signup and Reset password email templates so the six-digit code is emailed at sign-up and password reset only. Set the password policy to at least 8 characters with letters and digits (the app checks that rule itself). Run `db/migrations/006-auth-login-attempts.sql`: failed sign-ins (5 in 15 minutes locks the email for 15 minutes), reset requests (3 per 24 hours) and wrong reset codes (3 per code) are counted server-side per email. Sign-in runs in `/api/auth/login`; the old code-only route `/api/auth/otp` returns 410. Users who signed up with a code before use Forgot password to set a password. Keep the resend interval at 60 seconds and configure a custom SMTP sender for users outside the Supabase project team. The SSR proxy refreshes sessions, and refreshed browser cookies have a 30-day lifetime.

The home and impact pages are public. After a first sign-in, enter a display name and area. Every signed-in user can then post, volunteer, and (after a one-time "Who are you receiving for?" screen) receive. Only confirmed emails on the server's comma-separated `ADMIN_EMAILS` list can change the shared assumptions.

## Demo mode

Set `DEMO_MODE=true` to offer unlinked seeded organisations during onboarding. Each organisation can be linked to one sign-in. Use "Use a demo identity" at sign-up, or link a demo receiver the first time you open Receive. The setup seeds 14 days of listing history relative to the setup date.

## Architecture

- Next.js App Router renders the public pages and authenticated workspaces. Route Handlers and Server Actions verify the Supabase user before looking up the account for the action in `user_roles` and accessing PostgreSQL through the server-side `pg` pool.
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
