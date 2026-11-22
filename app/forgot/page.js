import { redirect } from 'next/navigation';
import SiteHeader from '@/components/site-header';
import { getIdentity } from '@/lib/auth';
import { demoEnabled } from '@/lib/onboarding';
import ForgotForm from './forgot-form';

export const metadata = { title: 'Forgot password · Annapurna' };

export default async function ForgotPage() {
  const { user, ready } = await getIdentity();
  if (user) redirect(ready ? '/post' : '/welcome');
  return (
    <>
      <SiteHeader demo={demoEnabled()} />
      <main className="container workspace">
        <p className="eyebrow mb-3">Your account</p>
        <h1>Reset your <em>password</em>.</h1>
        <ForgotForm />
      </main>
    </>
  );
}
