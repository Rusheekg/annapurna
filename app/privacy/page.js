import LegalPage, { contactEmail } from '@/components/legal-page';

export const metadata = {
  title: 'Privacy',
  description: 'What Annapurna collects, why, and how to ask for your data to be shown or deleted.',
};

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Privacy" title={<>Your data, kept <em>simple</em>.</>}>
      <h2>What we collect</h2>
      <p>Your name, email address, organisation name, and pickup and drop-off locations.</p>

      <h2>Why we collect it</h2>
      <p>Only to match surplus food with nearby receivers and volunteers. We don’t use it for anything else.</p>

      <h2>Cookies</h2>
      <p>We use one login cookie that keeps you signed in. There are no tracking or advertising cookies.</p>

      <h2>Sharing</h2>
      <p>We never sell your data.</p>

      <h2>Where it is stored</h2>
      <p>Your data is stored with Supabase, our database and sign-in provider.</p>

      <h2>Access or deletion</h2>
      <p>
        To see the data we hold about you or to have it deleted, email{' '}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
      </p>
    </LegalPage>
  );
}
