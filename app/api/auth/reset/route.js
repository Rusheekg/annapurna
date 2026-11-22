import { hasOnlyFields, invalidBody, readBody } from '@/lib/json-body';
import { authClient, getUser, signInRequired } from '@/lib/auth';
import { errorResponse, serverFailure } from '@/lib/api-errors';
import { codeProblem, cleanEmail, emailProblem, passwordProblem, validCode } from '@/lib/auth-input';
import { clearLoginAttempts, releaseResetCodeAttempt, reserveResetCodeAttempt, takeResetRequest } from '@/lib/auth-limits';
import { invalidField } from '@/lib/request-errors';
import { weakMessage } from '@/lib/auth-input';

const resetLimit = { code: 'RESET_LIMIT', message: 'You’ve reached the limit of 3 password resets today. Try again tomorrow.' };
const codeLocked = {
  code: 'CODE_LOCKED',
  field: 'code',
  message: 'Too many wrong codes. This code no longer works. Request a new code.',
};

// Forgot password: request a code, verify it (signs the user in), then set a new password.
export async function POST(request) {
  const body = await readBody(request);
  if (!['request', 'verify', 'set'].includes(body?.action)) {
    return errorResponse(400, invalidField(null, 'Choose whether to request a code, verify it or set a password.'));
  }
  const fields = { request: ['email'], verify: ['email', 'code'], set: ['password'] };
  if (!hasOnlyFields(body, ['action', ...fields[body.action]])) return invalidBody();
  const email = body.action === 'set' ? '' : cleanEmail(body.email);
  if (body.action !== 'set' && !email) return errorResponse(400, emailProblem);
  if (body.action === 'verify' && !validCode(body.code)) return errorResponse(400, codeProblem);
  if (body.action === 'set') {
    const problem = passwordProblem(body.password);
    if (problem) return errorResponse(400, problem);
  }

  try {
    const client = await authClient();
    if (!client) throw new Error('Supabase Auth is not configured.');

    if (body.action === 'request') {
      if (!await takeResetRequest(email)) return errorResponse(429, resetLimit);
      const { error } = await client.auth.resetPasswordForEmail(email);
      if (error?.status === 429) {
        return errorResponse(429, { code: 'RATE_LIMITED', message: 'Wait a minute before requesting another code.' });
      }
      if (error) throw error;
      return Response.json({ ok: true });
    }

    if (body.action === 'verify') {
      const attempt = await reserveResetCodeAttempt(email);
      if (attempt.blocked) return errorResponse(429, codeLocked);
      const { error } = await client.auth.verifyOtp({ email, token: body.code, type: 'recovery' });
      if (!error) {
        await releaseResetCodeAttempt(attempt.id);
        await clearLoginAttempts(email);
        return Response.json({ ok: true });
      }
      if (['otp_expired', 'invalid_credentials', 'validation_failed'].includes(error.code)) {
        return errorResponse(400, attempt.remaining > 0
          ? invalidField('code', `That code is wrong or has expired. ${attempt.remaining} ${attempt.remaining === 1 ? 'try' : 'tries'} left.`)
          : { ...codeLocked, code: 'CODE_LOCKED', message: 'That code is wrong. This code no longer works, so request a new code.' });
      }
      await releaseResetCodeAttempt(attempt.id);
      if (error.status === 429) {
        return errorResponse(429, { code: 'RATE_LIMITED', message: 'Wait a minute before trying another code.' });
      }
      throw error;
    }

    if (!await getUser()) return errorResponse(401, signInRequired);
    const { error } = await client.auth.updateUser({ password: body.password });
    if (!error) return Response.json({ ok: true });
    if (error.code === 'same_password') {
      return errorResponse(400, invalidField('password', 'Choose a password you haven’t used before.'));
    }
    if (error.code === 'weak_password') return errorResponse(400, invalidField('password', weakMessage(error)));
    throw error;
  } catch (error) {
    return errorResponse(503, serverFailure('Password reset', error, true));
  }
}
