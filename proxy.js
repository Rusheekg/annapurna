import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { capSessionCookie, sessionCookieOptions, supabaseConfig } from './lib/supabase-config';

export async function proxy(request) {
  const config = supabaseConfig();
  let response = NextResponse.next({ request });
  if (!config) return response;
  const supabase = createServerClient(config.url, config.key, {
    cookieOptions: sessionCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies, headers = {}) {
        for (const { name, value } of cookies) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookies) response.cookies.set(name, value, capSessionCookie(options));
        for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ['/', '/login', '/signup', '/forgot', '/auth/callback', '/welcome', '/post', '/receive', '/volunteer', '/workspace', '/impact', '/settings', '/api/:path*'],
};
