import { authClient } from '@/lib/auth';
import { errorResponse, serverFailure } from '@/lib/api-errors';
import { codeProblem, cleanEmail, emailProblem, passwordProblem, validCode } from '@/lib/auth-input';
import { invalidField } from '@/lib/request-errors';
import { weakMessage } from '@/lib/auth-input';

const rateLimited = { code: 'RATE_LIMITED', message: 'Wait a minute before requesting or trying another code.' };

// Sign-up: create the account, confirm the emailed 6-digit code, or send a new code. Passwords are never echoed or logged.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const email = cleanEmail(body?.email);
  if (!email) return errorResponse(400, emailProblem);
  if (!['signup', 'verify', 'resend'].includes(body.action)) {
    return errorResponse(400, invalidField(null, 'Choose whether to sign up, verify or resend.'));
  }
  if (body.action === 'signup') {
    const problem = passwordProblem(body.password);
    if (problem) return errorResponse(400, problem);
  }
  if (body.action === 'verify' && !validCode(body.code)) return errorResponse(400, codeProblem);

  try {
    const client = await authClient();
    if (!client) throw new Error('Supabase Auth is not configured.');
    const { data, error } = body.action === 'signup'
      ? await client.auth.signUp({ email, password: body.password })
      : body.action === 'verify'
        ? await client.auth.verifyOtp({ email, token: body.code, type: 'signup' })
        : await client.auth.resend({ type: 'signup', email });

    if (!error && body.action === 'signup' && data?.session) {
      // Supabase signed the user in without a code: email confirmation is off. Fail closed instead of skipping verification.
      await client.auth.signOut({ scope: 'local' });
      throw new Error('Email confirmation is disabled in Supabase Auth.');
    }
    if (!error) return Response.json({ ok: true });
    if (error.status === 429) return errorResponse(429, rateLimited);
    if (error.code === 'weak_password') return errorResponse(400, invalidField('password', weakMessage(error)));
    if (body.action === 'verify' && ['otp_expired', 'invalid_credentials', 'validation_failed'].includes(error.code)) {
      return errorResponse(400, invalidField('code', 'That code is wrong or has expired. Check the latest email or request a new code.'));
    }
    throw error;
  } catch (error) {
    return errorResponse(503, serverFailure('Sign-up', error, true));
  }
}
