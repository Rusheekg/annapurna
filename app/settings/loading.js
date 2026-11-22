import { SettingsFrame } from '@/components/impact-settings-frames';
import { assumptionFields, demoAssumptionNote } from '@/lib/impact-assumptions';

export default function Loading() {
  return (
    <SettingsFrame>
      <div className="panel settings-panel" aria-busy="true">
        <span className="sr-only" role="status">Loading assumptions…</span>
        <div className="grid gap-5" aria-hidden="true">
          {assumptionFields.map(([key, label, description]) => (
            <div key={key}>
              <span className="eyebrow">{label}</span>
              <div className="settings-skeleton-input"><span className="skeleton h-4 w-1/4" /></div>
              <p className="muted mt-1 text-sm">{description}</p>
            </div>
          ))}
          <div className="flex flex-wrap gap-3">
            <span className="primary settings-save skeleton skeleton-button">Save assumptions</span>
            <span className="secondary settings-save skeleton skeleton-button">Reset to defaults</span>
          </div>
        </div>
        <p className="muted mt-4 text-sm">{demoAssumptionNote}</p>
      </div>
    </SettingsFrame>
  );
}
