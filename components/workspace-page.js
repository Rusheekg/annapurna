import { notFound, redirect } from 'next/navigation';
import AccountWorkspace from '@/components/home-workspace';
import { getIdentity } from '@/lib/auth';
import { database } from '@/lib/db';
import { availableDemoAccounts, demoEnabled } from '@/lib/onboarding';
import { readSettings } from '@/lib/settings';

const tabRecord = { post: 'donor', receive: 'receiver', volunteer: 'volunteer' };

// Server wrapper for the Post, Receive and Volunteer tabs. Accounts come from the verified session only.
export default async function WorkspacePage({ tab }) {
  const { user, accounts, ready } = await getIdentity();
  if (!user) redirect('/login');
  if (!ready) redirect('/welcome');
  const { rows: [records] } = await database().query(
    `SELECT d.lat, d.lng, d.name AS donor, r.name AS receiver, v.name AS volunteer
     FROM public.donors d
     LEFT JOIN public.receivers r ON r.id = $2
     LEFT JOIN public.volunteers v ON v.id = $3
     WHERE d.id = $1`,
    [accounts.donor, accounts.receiver ?? null, accounts.volunteer],
  );
  if (!records) notFound();
  const setup = tab === 'receive' && !accounts.receiver;
  const demoReceivers = setup ? (await availableDemoAccounts(['receiver']))?.receiver ?? null : null;
  const kgPerMeal = tab === 'post' ? (await readSettings()).kg_per_meal : null;
  const demo = demoEnabled();
  return (
    <AccountWorkspace key={tab} tab={tab} userId={user.id} accounts={accounts}
      name={records[tabRecord[tab]]}
      area={{ lat: records.lat, lng: records.lng }} kgPerMeal={kgPerMeal} demo={demo} demoReceivers={demoReceivers} />
  );
}
