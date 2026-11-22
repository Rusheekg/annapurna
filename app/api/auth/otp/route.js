import { errorResponse } from '@/lib/api-errors';
import { hasOnlyFields, invalidBody, readBody } from '@/lib/json-body';

// Code-only sign-in is retired. Accounts sign in with a password; use Forgot password to set one.
export async function POST(request) {
  if (request.body && !hasOnlyFields(await readBody(request), [])) return invalidBody();
  return errorResponse(410, { code: 'GONE', message: 'Code-only sign-in has been retired. Sign in with your password.' });
}
