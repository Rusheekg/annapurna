import { redirect } from 'next/navigation';
import SiteHeader from '@/components/site-header';
import { getIdentity } from '@/lib/auth';
import { availableDemoAccounts } from '@/lib/onboarding';
import WelcomeForm from './welcome-form';

export default async function WelcomePage() {
  const { user, profile } = await getIdentity();
  if (!user) redirect('/login');
  if (profile) redirect('/workspace');
  const demo = await availableDemoAccounts();
  return (
    <>
      <SiteHeader signedIn demo={Boolean(demo)} />
      <main className="container workspace">
        <p className="eyebrow mb-3">Account setup</p>
        <h1>Make yourself at <em>home</em>.</h1>
        <WelcomeForm demo={demo} />
      </main>
    </>
  );
}
