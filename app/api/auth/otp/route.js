import { authClient } from '@/lib/auth';
import { errorResponse, serverFailure } from '@/lib/api-errors';
import { invalidField } from '@/lib/request-errors';

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorResponse(400, invalidField('email', 'Enter a valid email address.'));
  }
  if (!['send', 'verify'].includes(body.action)) {
    return errorResponse(400, invalidField(null, 'Choose whether to send or verify a code.'));
  }
  if (body.action === 'verify' && (typeof body.code !== 'string' || !/^\d{6}$/.test(body.code))) {
    return errorResponse(400, invalidField('code', 'Enter the six-digit code from your email.'));
  }

  try {
    const client = await authClient();
    if (!client) throw new Error('Supabase Auth is not configured.');
    const { error } = body.action === 'send'
      ? await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
      : await client.auth.verifyOtp({ email, token: body.code, type: 'email' });

    if (!error) return Response.json({ ok: true });
    if (error.status === 429) {
      return errorResponse(429, { code: 'RATE_LIMITED', message: 'Wait a minute before requesting or trying another code.' });
    }
    if (body.action === 'verify' && ['otp_expired', 'invalid_credentials', 'validation_failed'].includes(error.code)) {
      return errorResponse(400, invalidField('code', 'That code is wrong or has expired. Check the latest email or request a new code.'));
    }
    throw error;
  } catch (error) {
    return errorResponse(503, serverFailure('Email sign-in', error, true));
  }
}
