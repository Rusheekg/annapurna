import { authClient } from '@/lib/auth';
import { errorResponse, serverFailure } from '@/lib/api-errors';
import { cleanEmail } from '@/lib/auth-input';
import { clearLoginAttempts, reserveLoginAttempt } from '@/lib/auth-limits';

const wrongLogin = { code: 'INVALID_CREDENTIALS', message: 'Wrong email or password' };

// Password sign-in on the server: the session cookies are set here and the attempt limit cannot be skipped.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const email = cleanEmail(body?.email);
  if (!email || typeof body?.password !== 'string' || !body.password || body.password.length > 200) {
    return errorResponse(401, wrongLogin);
  }

  try {
    const attempt = await reserveLoginAttempt(email);
    if (attempt.blocked) {
      return errorResponse(429, { code: 'LOCKED_OUT', message: 'Too many attempts. Try again in 15 minutes.' });
    }
    const client = await authClient();
    if (!client) throw new Error('Supabase Auth is not configured.');
    const { error } = await client.auth.signInWithPassword({ email, password: body.password });
    if (!error) {
      await clearLoginAttempts(email);
      return Response.json({ ok: true });
    }
    if (error.code === 'email_not_confirmed') {
      await clearLoginAttempts(email);
      return errorResponse(403, { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email first' });
    }
    if (error.code === 'invalid_credentials') return errorResponse(401, wrongLogin);
    if (error.status === 429) {
      return errorResponse(429, { code: 'RATE_LIMITED', message: 'Too many sign-in requests. Wait a minute and try again.' });
    }
    throw error;
  } catch (error) {
    return errorResponse(503, serverFailure('Sign-in', error, true));
  }
}
