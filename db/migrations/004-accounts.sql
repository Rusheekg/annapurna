BEGIN;

ALTER TABLE public.donors ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.receivers ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.volunteers ADD COLUMN is_demo boolean NOT NULL DEFAULT false;

UPDATE public.donors AS d SET is_demo = true
FROM unnest(ARRAY[
  'Hostel Block A Mess', 'Hostel Block B Mess', 'Hostel Block C Mess', 'Hostel Block D Mess',
  'Hostel Block E Mess', 'Hostel Block F Mess', 'Hostel Block G Mess', 'Hostel Block H Mess',
  'Hostel Block I Mess', 'Hostel Block J Mess', 'Courtyard Canteen', 'Library Canteen',
  'Student Commons Canteen', 'Garden Canteen', 'Studio Canteen'
]) WITH ORDINALITY AS seed(name, id)
WHERE d.id = seed.id AND d.name = seed.name;

UPDATE public.receivers AS r SET is_demo = true
FROM unnest(ARRAY[
  'Open Hearth Kitchen', 'Blue Banyan Collective', 'Lantern House Shelter', 'Juniper Table Kitchen',
  'Cedar Bridge Collective', 'Morning Porch Shelter', 'Silver Spoon Kitchen', 'Orchard Circle Collective',
  'Mango Court Shelter', 'Paper Lantern Kitchen'
]) WITH ORDINALITY AS seed(name, id)
WHERE r.id = seed.id AND r.name = seed.name;

UPDATE public.volunteers SET is_demo = true
WHERE id BETWEEN 1 AND 20 AND name = 'Demo Volunteer ' || lpad(id::text, 2, '0');

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

COMMIT;
