BEGIN;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS volunteer_requested_at timestamptz;
COMMIT;
