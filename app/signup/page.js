import { redirect } from 'next/navigation';
import SiteHeader from '@/components/site-header';
import { getIdentity } from '@/lib/auth';
import { demoEnabled } from '@/lib/onboarding';
import SignupForm from './signup-form';

export const metadata = { title: 'Sign up · Annapurna' };

export default async function SignupPage() {
  const { user, ready } = await getIdentity();
  if (user) redirect(ready ? '/post' : '/welcome');
  return (
    <>
      <SiteHeader demo={demoEnabled()} />
      <main className="container workspace">
        <p className="eyebrow mb-3">Your account</p>
        <h1>Create your <em>account</em>.</h1>
        <SignupForm />
      </main>
    </>
  );
}
