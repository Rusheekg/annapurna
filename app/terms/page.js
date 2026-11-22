import LegalPage, { contactEmail } from '@/components/legal-page';

export const metadata = {
  title: 'Terms',
  description: 'The plain-English rules for donors, receivers and volunteers using Annapurna.',
};

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Terms" title={<>The ground <em>rules</em>.</>}>
      <h2>What Annapurna does</h2>
      <p>Annapurna connects food donors, receivers and volunteers. We do not inspect or certify food safety.</p>

      <h2>Donors</h2>
      <p>You are responsible for the food you post, including its freshness and its allergen labels.</p>

      <h2>Receivers</h2>
      <p>You decide whether to accept any food that is offered to you.</p>

      <h2>Volunteers</h2>
      <p>Hand over food only after the pickup code has been checked.</p>

      <h2>Misuse</h2>
      <p>Misuse of the service or fake listings will lead to your account being removed.</p>

      <h2>Prototype</h2>
      <p>Annapurna is a hackathon prototype that uses synthetic demo data.</p>

      <h2>Questions</h2>
      <p>Email <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
    </LegalPage>
  );
}
