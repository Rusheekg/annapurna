import { notFound, redirect } from 'next/navigation';
import { getIdentity } from '@/lib/auth';
import { database } from '@/lib/db';
import { validId } from '@/lib/listings';

// Old links: send the visitor to the tab where the listing shows up for their own records.
export default async function WorkspacePage({ searchParams }) {
  const { user, accounts, ready } = await getIdentity();
  if (!user) redirect('/login');
  if (!ready) redirect('/welcome');
  const { listingId } = await searchParams;
  if (listingId === undefined) redirect('/post');
  if (typeof listingId !== 'string' || !validId(Number(listingId))) notFound();
  const { rows: [match] } = await database().query(
    `SELECT l.donor_id = $2 AS post,
       (l.receiver_id = $3 OR (l.status = 'posted' AND EXISTS (
         SELECT 1 FROM public.notifications n WHERE n.listing_id = l.id AND n.receiver_id = $3))) AS receive,
       l.volunteer_id = $4 AS volunteer
     FROM public.listings l WHERE l.id = $1`,
    [Number(listingId), accounts.donor, accounts.receiver ?? null, accounts.volunteer],
  );
  const tab = ['post', 'receive', 'volunteer'].find((name) => match?.[name]);
  if (!tab) notFound();
  redirect(`/${tab}`);
}
