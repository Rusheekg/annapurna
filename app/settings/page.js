import SiteHeader from '@/components/site-header';
import { readSettings } from '@/lib/settings';
import SettingsForm from './settings-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings · Annapurna' };

export default async function SettingsPage() {
  let settings;
  try {
    settings = await readSettings();
  } catch (error) {
    console.error('Could not load assumptions:', error.message);
  }

  return (
    <>
      <SiteHeader page="settings" />
      <main className="container workspace">
        <p className="eyebrow mb-3">Settings</p>
        <h1>Impact <em>assumptions</em>.</h1>
        {settings ? <SettingsForm initialValues={settings} /> :
          <p role="status">Assumptions are temporarily unavailable. Reload to try again.</p>}
      </main>
    </>
  );
}
