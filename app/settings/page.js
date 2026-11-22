import { SettingsFrame } from '@/components/impact-settings-frames';
import RouteFeedback from '@/components/route-feedback';
import { serverFailure } from '@/lib/api-errors';
import { readSettings } from '@/lib/settings';
import SettingsForm from './settings-form';
import { getIdentity, isAdmin } from '@/lib/auth';
import { demoEnabled } from '@/lib/onboarding';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings · Annapurna' };

export default async function SettingsPage() {
  const { user, profile } = await getIdentity();
  let content;
  try {
    content = <SettingsForm initialValues={await readSettings()} editable={isAdmin(user)} />;
  } catch (error) {
    content = <RouteFeedback error={serverFailure('Load assumptions', error)} />;
  }
  return <SettingsFrame session={{ signedIn: Boolean(user), profile, demo: demoEnabled() }}>{content}</SettingsFrame>;
}
