BEGIN;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS match_reason text;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS pickup_method text
  CHECK (pickup_method IN ('volunteer', 'self'));
COMMIT;
