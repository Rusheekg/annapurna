'use server';

import { redirect } from 'next/navigation';
import { authClient } from '@/lib/auth';

export async function signOut() {
  const client = await authClient();
  await client?.auth.signOut({ scope: 'local' });
  redirect('/');
}
