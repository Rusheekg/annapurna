import { SettingsFrame } from '@/components/impact-settings-frames';
import RouteFeedback from '@/components/route-feedback';
import { serverFailure } from '@/lib/api-errors';
import { readSettings } from '@/lib/settings';
import SettingsForm from './settings-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings · Annapurna' };

export default async function SettingsPage() {
  let content;
  try {
    content = <SettingsForm initialValues={await readSettings()} />;
  } catch (error) {
    content = <RouteFeedback error={serverFailure('Load assumptions', error)} />;
  }
  return <SettingsFrame>{content}</SettingsFrame>;
}
