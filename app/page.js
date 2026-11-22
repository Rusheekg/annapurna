import { notFound } from 'next/navigation';
import HomeWorkspace from '@/components/home-workspace';
import RouteFeedback from '@/components/route-feedback';
import { database } from '@/lib/db';
import { serverFailure } from '@/lib/api-errors';
import { validId } from '@/lib/listings';

const accountTables = { donor: 'donors', receiver: 'receivers', volunteer: 'volunteers' };

export default async function HomePage({ searchParams }) {
  const { view, accountId, listingId } = await searchParams;
  let role = typeof view === 'string' && Object.hasOwn(accountTables, view) ? view : null;
  let id = accountId == null ? null : Number(accountId);
  if (accountId != null && (!role || typeof accountId !== 'string' || !validId(id))) notFound();
  if (listingId != null && (typeof listingId !== 'string' || !validId(Number(listingId)))) notFound();

  if (listingId != null || id != null) {
    let found;
    try {
      if (listingId != null) {
        const { rows: [listing] } = await database().query('SELECT donor_id FROM public.listings WHERE id = $1', [Number(listingId)]);
        found = Boolean(listing);
        role = 'donor';
        id = listing?.donor_id;
      } else {
        const { rows } = await database().query(`SELECT 1 FROM public.${accountTables[role]} WHERE id = $1`, [id]);
        found = rows.length > 0;
      }
    } catch (error) {
      return <main className="container workspace"><RouteFeedback error={serverFailure('Load account or listing', error)} /></main>;
    }
    if (!found) notFound();
  }
  return <HomeWorkspace key={`${role}:${id}`} initialRole={role} initialAccountId={id} />;
}
