import { NextResponse } from 'next/server';
import { authClient, getAccounts } from '@/lib/auth';
import { safeNext } from '@/lib/auth-input';
import { serverFailure } from '@/lib/api-errors';

// Google returns here with ?code=. Exchange it for a session, then follow the same path as password login:
// accounts that still need a name and area go to /welcome, everyone else to `next` (relative paths only) or /post.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const failed = NextResponse.redirect(new URL('/login?error=google', origin));
  const code = searchParams.get('code');
  if (searchParams.get('error') || !code) return failed;

  try {
    const client = await authClient();
    if (!client) return failed;
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error || !data?.user) return failed;
    const accounts = await getAccounts(data.user.id);
    const ready = Boolean(accounts.donor && accounts.volunteer);
    const target = ready ? safeNext(searchParams.get('next')) || '/post' : '/welcome';
    return NextResponse.redirect(new URL(target, origin));
  } catch (error) {
    serverFailure('Google sign-in callback', error);
    return failed;
  }
}
