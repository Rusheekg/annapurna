import { authClient } from '@/lib/auth';
import { errorResponse, serverFailure } from '@/lib/api-errors';
import { googleUnavailable, safeNext } from '@/lib/auth-input';

// Starts Google sign-in. It runs on the server so the PKCE verifier cookie is set here, and it checks the
// provider is enabled first so the user never lands on a raw Supabase error page.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const next = safeNext(body?.next);
  const unavailable = { code: 'GOOGLE_UNAVAILABLE', message: googleUnavailable };
  try {
    const client = await authClient();
    if (!client) return errorResponse(503, unavailable);
    const callback = new URL('/auth/callback', request.url);
    if (next) callback.searchParams.set('next', next);
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
    });
    if (error || !data?.url) return errorResponse(503, unavailable);
    // A disabled provider answers the authorize URL with a 4xx instead of redirecting to Google.
    const probe = await fetch(data.url, { redirect: 'manual', signal: AbortSignal.timeout(6000) }).catch(() => null);
    if (!probe || probe.status < 300 || probe.status >= 400) return errorResponse(503, unavailable);
    return Response.json({ url: data.url });
  } catch (error) {
    serverFailure('Google sign-in', error);
    return errorResponse(503, unavailable);
  }
}
