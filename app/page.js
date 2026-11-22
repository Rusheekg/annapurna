import { redirect } from 'next/navigation';
import { Landing } from '@/components/home-workspace';
import SiteHeader from '@/components/site-header';
import { getIdentity } from '@/lib/auth';
import { demoEnabled } from '@/lib/onboarding';

export const metadata = {
  description: 'Annapurna connects surplus food from hostel messes to nearby shelters and community kitchens before it spoils.',
};

export default async function HomePage({ searchParams }) {
  const { view, listingId } = await searchParams;
  if (listingId !== undefined) {
    redirect(`/workspace?listingId=${encodeURIComponent(typeof listingId === 'string' ? listingId : '')}`);
  }
  if (view) redirect('/post');
  const { user, accounts, ready } = await getIdentity();
  const demo = demoEnabled();
  return (
    <>
      <SiteHeader tagline signedIn={Boolean(user)} accounts={ready ? accounts : null} userId={user?.id} demo={demo} />
      <Landing demo={demo} />
    </>
  );
}
