# Annapurna

Annapurna connects surplus food from campus messes and canteens with nearby community kitchens, shelters, and NGOs. CodeBenders ACE Hackathon 2026.

## Run Milestone 1

1. Install Node.js 20.9 or newer, then run `npm install`.
2. Copy `.env.example` to `.env.local`. Set `DATABASE_URL` to the Supabase transaction pooler connection string (port 6543) for your demo database. URL-encode special characters in the password.
3. Run `npm run db:setup`. This replaces the six Annapurna tables and their data in the configured database with synthetic seed data.
4. Run `npm run dev` and open [localhost:3000](http://localhost:3000).

In Windows PowerShell, use `npm.cmd` wherever a command above uses `npm` if execution policy blocks the npm PowerShell wrapper.
