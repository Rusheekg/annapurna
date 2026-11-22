import { redirect } from 'next/navigation';
import { Landing } from '@/components/home-workspace';
import SiteHeader from '@/components/site-header';
import { getIdentity } from '@/lib/auth';
import { demoEnabled } from '@/lib/onboarding';

export default async function HomePage({ searchParams }) {
  const { view, listingId } = await searchParams;
  if (listingId !== undefined) {
    redirect(`/workspace?listingId=${encodeURIComponent(typeof listingId === 'string' ? listingId : '')}`);
  }
  if (view) redirect('/workspace');
  const { user, profile } = await getIdentity();
  const demo = demoEnabled();
  return (
    <>
      <SiteHeader tagline signedIn={Boolean(user)} profile={profile} demo={demo} />
      <Landing profile={profile} demo={demo} />
    </>
  );
}
