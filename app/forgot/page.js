import { redirect } from 'next/navigation';
import AuthShell from '@/components/auth-shell';
import { getIdentity } from '@/lib/auth';
import ForgotForm from './forgot-form';

export const metadata = { title: 'Forgot password · Annapurna' };

export default async function ForgotPage() {
  const { user, ready } = await getIdentity();
  if (user) redirect(ready ? '/post' : '/welcome');
  return (
    <AuthShell>
      <ForgotForm />
    </AuthShell>
  );
}
