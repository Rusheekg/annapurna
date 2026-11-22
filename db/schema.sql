DROP TABLE IF EXISTS public.auth_write_limits, public.profiles, public.notifications, public.listings, public.settings,
  public.volunteers, public.receivers, public.donors;

CREATE TABLE public.donors (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('hostel_mess', 'canteen')),
  lat double precision NOT NULL,
  lng double precision NOT NULL
);

CREATE TABLE public.receivers (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  daily_need_meals integer NOT NULL CHECK (daily_need_meals > 0),
  can_store_chilled boolean NOT NULL
);

CREATE TABLE public.volunteers (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  available boolean NOT NULL
);

CREATE TABLE public.listings (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  donor_id integer NOT NULL REFERENCES public.donors(id),
  food_items text NOT NULL,
  veg boolean NOT NULL,
  quantity_kg numeric NOT NULL CHECK (quantity_kg > 0),
  portions integer NOT NULL CHECK (portions > 0),
  storage text NOT NULL CHECK (storage IN ('hot', 'room_temp', 'chilled')),
  allergens text[] NOT NULL DEFAULT '{}',
  cooked_at timestamptz NOT NULL,
  pickup_by timestamptz NOT NULL CHECK (pickup_by > cooked_at),
  status text NOT NULL DEFAULT 'posted'
    CHECK (status IN ('posted', 'claimed', 'collected', 'delivered', 'expired')),
  receiver_id integer REFERENCES public.receivers(id),
  volunteer_id integer REFERENCES public.volunteers(id),
  pickup_method text CHECK (pickup_method IN ('volunteer', 'self')),
  volunteer_requested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  collected_at timestamptz,
  delivered_at timestamptz,
  expired_at timestamptz
);

CREATE INDEX listings_donor_created_idx ON public.listings (donor_id, created_at DESC, id DESC);

CREATE TABLE public.notifications (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id integer NOT NULL REFERENCES public.listings(id),
  receiver_id integer NOT NULL REFERENCES public.receivers(id),
  round integer NOT NULL CHECK (round > 0),
  match_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, receiver_id)
);

CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value numeric NOT NULL CHECK (value > 0)
);

ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.donors ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.receivers ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.volunteers ADD COLUMN is_demo boolean NOT NULL DEFAULT false;

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('donor', 'receiver', 'volunteer')),
  account_id integer NOT NULL CHECK (account_id > 0),
  UNIQUE (role, account_id)
);

CREATE TABLE public.auth_write_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  attempts timestamptz[] NOT NULL CHECK (cardinality(attempts) <= 30)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_write_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles, public.auth_write_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
CREATE POLICY read_own_profile ON public.profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
