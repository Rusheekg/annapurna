import { ImpactFrame } from '@/components/impact-settings-frames';
import { getIdentity, isAdmin } from '@/lib/auth';
import { demoEnabled } from '@/lib/onboarding';

export default async function Loading() {
  const { user, profile } = await getIdentity();
  return (
    <ImpactFrame session={{ signedIn: Boolean(user), profile, demo: demoEnabled() }} editable={isAdmin(user)}>
      <div aria-busy="true">
        <span className="sr-only" role="status">Loading impact…</span>
        <div className="impact-metrics" aria-hidden="true">
          {['Meals served', 'Kg food saved', 'Kg CO₂e avoided', 'Delivered vs expired', 'Average delivery time'].map((label) => (
            <div className="panel impact-metric" key={label}>
              <dl className="metric-stat">
                <dt>{label}</dt>
                <dd><span className="skeleton skeleton-impact-value">&nbsp;</span></dd>
              </dl>
              <span className="formula-button"><span className="skeleton size-[18px]" /></span>
            </div>
          ))}
        </div>
        <div className="panel impact-chart" aria-hidden="true">
          <h2>Kg saved per day</h2>
          <p className="muted">Last 7 days, including today · India Standard Time</p>
          <div className="chart-columns">
            {[45, 60, 55, 85, 70, 80, 40].map((height) => (
              <div key={height}>
                <span className="chart-track"><span className="chart-fill skeleton" style={{ height: `${height}%` }} /></span>
                <span className="chart-day"><span className="skeleton skeleton-day" /></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ImpactFrame>
  );
}
