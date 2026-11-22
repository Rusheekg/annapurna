import { notFound, redirect } from 'next/navigation';
import HomeWorkspace from '@/components/home-workspace';
import { accountTables, getIdentity } from '@/lib/auth';
import { database } from '@/lib/db';
import { demoEnabled } from '@/lib/onboarding';
import { readSettings } from '@/lib/settings';
import { validId } from '@/lib/listings';

const listingVisibility = {
  donor: 'l.donor_id = $2',
  receiver: `l.receiver_id = $2 OR (l.status = 'posted' AND EXISTS (
    SELECT 1 FROM public.notifications n WHERE n.listing_id = l.id AND n.receiver_id = $2))`,
  volunteer: 'l.volunteer_id = $2',
};

export default async function WorkspacePage({ searchParams }) {
  const { user, profile } = await getIdentity();
  if (!user) redirect('/login');
  if (!profile) redirect('/welcome');
  const { listingId } = await searchParams;
  if (listingId !== undefined) {
    if (typeof listingId !== 'string' || !validId(Number(listingId))) notFound();
    const { rowCount } = await database().query(
      `SELECT 1 FROM public.listings l WHERE l.id = $1 AND (${listingVisibility[profile.role]})`,
      [Number(listingId), profile.id],
    );
    if (!rowCount) notFound();
  }
  const { rows: [account] } = await database().query(
    `SELECT name FROM public.${accountTables[profile.role]} WHERE id = $1`, [profile.id],
  );
  if (!account) notFound();
  const kgPerMeal = profile.role === 'donor' ? (await readSettings()).kg_per_meal : null;
  return <HomeWorkspace key={user.id} profile={profile} name={account.name} kgPerMeal={kgPerMeal} demo={demoEnabled()} />;
}
