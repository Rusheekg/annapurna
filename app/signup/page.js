import { redirect } from 'next/navigation';
import AuthShell from '@/components/auth-shell';
import { getIdentity } from '@/lib/auth';
import { safeNext } from '@/lib/auth-input';
import SignupForm from './signup-form';

export const metadata = { title: 'Create account · Annapurna' };

export default async function SignupPage({ searchParams }) {
  const { next } = await searchParams;
  const { user, ready } = await getIdentity();
  if (user) redirect(ready ? safeNext(next) || '/post' : '/welcome');
  return (
    <AuthShell>
      <SignupForm next={safeNext(next)} />
    </AuthShell>
  );
}
