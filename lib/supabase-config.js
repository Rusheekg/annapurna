export const sessionCookieOptions = {
  maxAge: 30 * 24 * 60 * 60,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
};

export function capSessionCookie(options) {
  return options?.maxAge > sessionCookieOptions.maxAge
    ? { ...options, maxAge: sessionCookieOptions.maxAge }
    : options;
}

export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && /^sb_publishable_[A-Za-z0-9_-]+$/.test(key ?? '') ? { url, key } : null;
}
