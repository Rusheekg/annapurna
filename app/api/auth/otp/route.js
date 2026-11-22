import { errorResponse } from '@/lib/api-errors';

// Code-only sign-in is retired. Accounts sign in with a password; use Forgot password to set one.
export function POST() {
  return errorResponse(410, { code: 'GONE', message: 'Code-only sign-in has been retired. Sign in with your password.' });
}
