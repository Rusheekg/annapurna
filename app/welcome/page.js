import { redirect } from 'next/navigation';
import SiteHeader from '@/components/site-header';
import { getIdentity } from '@/lib/auth';
import { demoEnabled } from '@/lib/onboarding';
import WelcomeForm from './welcome-form';

export default async function WelcomePage() {
  const { user, ready } = await getIdentity();
  if (!user) redirect('/login');
  if (ready) redirect('/post');
  const demo = demoEnabled();
  return (
    <>
      <SiteHeader signedIn demo={demo} />
      <main className="container workspace">
        <p className="eyebrow mb-3">Account setup</p>
        <h1>Make yourself at <em>home</em>.</h1>
        <WelcomeForm demo={demo} defaultName={String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? '').slice(0, 100)} />
      </main>
    </>
  );
}
