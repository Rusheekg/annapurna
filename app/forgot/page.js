import { redirect } from 'next/navigation';
import { AuthLayout } from '@/components/auth-layout';
import { getIdentity } from '@/lib/auth';
import ForgotForm from './forgot-form';

export const metadata = { title: 'Forgot password · Annapurna' };

export default async function ForgotPage() {
  const { user, ready } = await getIdentity();
  if (user) redirect(ready ? '/post' : '/welcome');
  return (
    <AuthLayout>
      <ForgotForm />
    </AuthLayout>
  );
}
