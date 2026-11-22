import { redirect } from 'next/navigation';
import SiteHeader from '@/components/site-header';
import { getIdentity } from '@/lib/auth';
import { demoEnabled } from '@/lib/onboarding';
import LoginForm from './login-form';

export default async function LoginPage() {
  const { user, ready } = await getIdentity();
  if (user) redirect(ready ? '/post' : '/welcome');
  return (
    <>
      <SiteHeader demo={demoEnabled()} />
      <main className="container workspace">
        <p className="eyebrow mb-3">Your account</p>
        <h1>Sign <em>in</em>.</h1>
        <LoginForm />
      </main>
    </>
  );
}
