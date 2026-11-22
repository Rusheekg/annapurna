'use client';

import { useId, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

// Password input with a left lock icon, a show/hide toggle and a visually hidden label.
// Never stores or logs the value; the parent owns it.
export default function PasswordField({ label, value, onChange, autoComplete, error, errorId, hint }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div>
      <div className="auth-field">
        <label htmlFor={id} className="sr-only">{label}</label>
        <Lock className="auth-field-icon" size={18} strokeWidth={1.5} aria-hidden="true" />
        <input id={id} type={shown ? 'text' : 'password'} value={value} autoComplete={autoComplete}
          placeholder={label} maxLength={72} autoCapitalize="none" spellCheck={false}
          aria-invalid={error || undefined} aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)} />
        <button type="button" className="password-toggle" aria-pressed={shown}
          aria-label={shown ? 'Hide password' : 'Show password'} onClick={() => setShown(!shown)}>
          {shown ? <EyeOff size={18} strokeWidth={1.5} aria-hidden="true" /> : <Eye size={18} strokeWidth={1.5} aria-hidden="true" />}
        </button>
      </div>
      {hint && <p className="muted mt-1 text-sm">{hint}</p>}
    </div>
  );
}
