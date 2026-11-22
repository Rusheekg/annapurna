-- Password login limits: failed sign-ins, reset requests and wrong reset codes, keyed by lowercased email.
-- Additive only. Row-level security is on with no policies and no grants, so the browser cannot read or write it.
BEGIN;

CREATE TABLE public.auth_login_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL CHECK (email = lower(email) AND char_length(email) <= 254),
  kind text NOT NULL CHECK (kind IN ('login_fail', 'login_lock', 'reset_request', 'reset_wrong_code')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_login_attempts_lookup ON public.auth_login_attempts (email, kind, created_at DESC);

ALTER TABLE public.auth_login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_login_attempts FROM PUBLIC, anon, authenticated;

COMMIT;
