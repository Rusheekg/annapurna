-- One account, all actions: user_roles maps a user to their donor, receiver and volunteer records.
-- Additive only. public.profiles is left in place (no longer read or written by the app).
BEGIN;

CREATE TABLE public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('donor', 'receiver', 'volunteer')),
  account_id integer NOT NULL CHECK (account_id > 0),
  PRIMARY KEY (user_id, role),
  UNIQUE (role, account_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_roles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
CREATE POLICY read_own_roles ON public.user_roles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

INSERT INTO public.user_roles (user_id, role, account_id)
SELECT user_id, role, account_id FROM public.profiles
ON CONFLICT DO NOTHING;

COMMIT;
