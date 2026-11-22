# Annapurna

Annapurna connects surplus food from campus messes and canteens with nearby community kitchens, shelters, and NGOs. CodeBenders ACE Hackathon 2026.

## Run locally

1. Install Node.js 20.9 or newer, then run `npm install`.
2. Copy `.env.example` to `.env.local`. Set `DATABASE_URL` to the Supabase transaction pooler connection string (port 6543) for your demo database. URL-encode special characters in the password.
3. For a fresh demo database, run `npm run db:setup` to preview the target host, then `npm run db:setup -- --force` to create and seed the app tables. The force command drops and replaces the six Annapurna tables. Skip setup when using an existing initialized database.
4. Run `npm run dev` and open [localhost:3000](http://localhost:3000).

In Windows PowerShell, use `npm.cmd` wherever a command above uses `npm` if execution policy blocks the npm PowerShell wrapper.

## Demo mode

Use the role and account selectors to choose a synthetic donor, receiver, or volunteer without logging in. The selection is stored in the browser. As a donor, post surplus. As an offered receiver, claim it and choose how to collect it. If you request a volunteer, switch to a nearby volunteer account and accept, collect, and deliver the pickup. The setup seeds 14 days of listing history relative to the setup date.

Anyone can open `/impact` and edit the shared demo assumptions at `/settings`. Changes are stored in the demo database and apply across browsers.

## Architecture

- Next.js App Router renders the landing page, role workspaces, impact dashboard, and settings. Route Handlers and Server Actions access PostgreSQL through the server-side `pg` pool.
- Posting a listing and offering it to the top matching receivers happen in one database statement. Workspaces poll every five seconds. Polls also expire overdue pickups and offer unclaimed listings to the next group of eligible receivers.
- Volunteers see open pickups within 5 km of their synthetic location, measured in a straight line to the donor. Assigned jobs stay available for tracking and handover. Leaflet displays the neighbourhood and pickup routes over OpenStreetMap tiles.
- To deploy the demo, import the repository into Vercel and set `DATABASE_URL` to the Supabase transaction pooler URL.

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
