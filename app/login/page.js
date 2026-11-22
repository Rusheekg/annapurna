import { redirect } from 'next/navigation';
import AuthShell from '@/components/auth-shell';
import { getIdentity } from '@/lib/auth';
import { googleFailed, safeNext } from '@/lib/auth-input';
import LoginForm from './login-form';

export const metadata = { title: 'Login · Annapurna' };

export default async function LoginPage({ searchParams }) {
  const { next, error } = await searchParams;
  const { user, ready } = await getIdentity();
  if (user) redirect(ready ? safeNext(next) || '/post' : '/welcome');
  return (
    <AuthShell>
      <LoginForm next={safeNext(next)} initialError={error ? googleFailed : ''} />
    </AuthShell>
  );
}
