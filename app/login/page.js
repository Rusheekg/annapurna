import { redirect } from 'next/navigation';
import { AuthLayout } from '@/components/auth-layout';
import { getIdentity } from '@/lib/auth';
import { googleFailed, safeNext } from '@/lib/auth-input';
import LoginForm from './login-form';

export const metadata = {
  title: 'Log in',
  description: 'Log in to Annapurna to post surplus food, receive offers or pick up deliveries.',
};

export default async function LoginPage({ searchParams }) {
  const { next, error } = await searchParams;
  const { user, ready } = await getIdentity();
  if (user) redirect(ready ? safeNext(next) || '/post' : '/welcome');
  return (
    <AuthLayout>
      <LoginForm next={safeNext(next)} initialError={error ? googleFailed : ''} />
    </AuthLayout>
  );
}
