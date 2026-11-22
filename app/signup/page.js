import { redirect } from 'next/navigation';
import { AuthLayout } from '@/components/auth-layout';
import { getIdentity } from '@/lib/auth';
import { safeNext } from '@/lib/auth-input';
import SignupForm from './signup-form';

export const metadata = { title: 'Create account · Annapurna' };

export default async function SignupPage({ searchParams }) {
  const { next } = await searchParams;
  const { user, ready } = await getIdentity();
  if (user) redirect(ready ? safeNext(next) || '/post' : '/welcome');
  return (
    <AuthLayout>
      <SignupForm next={safeNext(next)} />
    </AuthLayout>
  );
}
