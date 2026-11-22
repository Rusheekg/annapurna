import { Info } from 'lucide-react';
import Link from 'next/link';
import SiteHeader from '@/components/site-header';
import { readImpact } from '../feed-data';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Impact · Annapurna' };

const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const dayLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'UTC' });
const fullDate = new Intl.DateTimeFormat('en-IN', { dateStyle: 'long', timeZone: 'UTC' });

function Metric({ id, label, value, formula, assumption }) {
  return (
    <div className="panel impact-metric">
      <dl className="metric-stat">
        <dt>{label}</dt>
        <dd>{value}</dd>
      </dl>
      <button type="button" className="formula-button" popoverTarget={id} aria-label={`How ${label} is calculated`}>
        <Info size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <div id={id} className="formula-popover" popover="auto" aria-label={`${label} formula`}>
        <strong>{label}</strong>
        <p>{formula}</p>
        <p className="muted">{assumption}</p>
      </div>
    </div>
  );
}

function SavedChart({ days }) {
  const peak = Math.max(...days.map(({ kg }) => kg));
  return (
    <figure className="panel impact-chart" aria-labelledby="chart-title">
      <figcaption>
        <h2 id="chart-title">Kg saved per day</h2>
        <p className="muted">Last 7 days, including today · India Standard Time</p>
      </figcaption>
      <ol className="chart-columns" role="list">
        {days.map(({ day, kg }) => {
          const date = new Date(day);
          return (
            <li key={day} className="chart-column">
              <span className="sr-only">{fullDate.format(date)}: {number.format(kg)} kg</span>
              <span className="chart-track" aria-hidden="true">
                <span className="chart-fill" style={{ height: `${peak ? kg / peak * 100 : 0}%` }}>
                  <span className="chart-value">{number.format(kg)}</span>
                </span>
              </span>
              <span className="chart-day" aria-hidden="true">{dayLabel.format(date)}</span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

export default async function ImpactPage() {
  const impact = await readImpact();
  return (
    <>
      <SiteHeader page="impact" />
      <main className="container workspace">
        <p className="eyebrow mb-3">All-time impact</p>
        <div className="section-heading">
          <h1>Food <em>rescued</em>.</h1>
          <Link className="secondary" href="/settings">Edit assumptions</Link>
        </div>
        {impact ? (
          <>
            <div className="impact-metrics">
              <Metric id="meals-formula" label="Meals served" value={number.format(impact.meals)}
                formula="Sum of portions from delivered listings." assumption="1 listed portion = 1 meal." />
              <Metric id="kg-formula" label="Kg food saved" value={number.format(impact.kg)}
                formula="Sum of stored food weights from delivered listings."
                assumption={`New listings use ${impact.settings.kg_per_meal} kg per portion. Earlier weights are kept as recorded.`} />
              <Metric id="co2e-formula" label="Kg CO₂e avoided" value={number.format(impact.co2e)}
                formula="Kg food saved × CO₂e factor."
                assumption={`Current factor: ${impact.settings.co2e_per_kg} kg CO₂e per kg of delivered food.`} />
              <Metric id="outcome-formula" label="Delivered vs expired"
                value={`${number.format(impact.delivered)} / ${number.format(impact.expired)}`}
                formula="Count of delivered listings / count of expired listings."
                assumption="Each listing counts once. Posted or claimed listings count as expired at their pickup deadline." />
              <Metric id="time-formula" label="Average delivery time"
                value={impact.averageMinutes == null ? '—' : `${number.format(impact.averageMinutes)} min`}
                formula="Average of (delivery time − post time) in minutes."
                assumption="Includes each delivered listing once when both timestamps are valid." />
            </div>
            <SavedChart days={impact.days} />
          </>
        ) : <p role="status">Impact data is temporarily unavailable. Reload to try again.</p>}
      </main>
    </>
  );
}
