'use client';

import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Password input with a show/hide toggle. Never stores or logs the value; the parent owns it.
export default function PasswordField({ label, value, onChange, autoComplete, error, errorId, hint }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input id={id} type={shown ? 'text' : 'password'} value={value} autoComplete={autoComplete}
          maxLength={72} autoCapitalize="none" spellCheck={false}
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
