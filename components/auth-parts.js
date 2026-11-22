'use client';

import { useId, useRef, useState } from 'react';
import { Mail, User } from 'lucide-react';
import { Pending } from '@/components/request-feedback';
import { readJson } from '@/lib/client-requests';

// Text input with a left icon and a visually hidden label.
export function IconInput({ label, icon: Icon = Mail, error, errorId, ...props }) {
  const id = useId();
  return (
    <div className="auth-field">
      <label htmlFor={id} className="sr-only">{label}</label>
      <Icon className="auth-field-icon" size={18} strokeWidth={1.5} aria-hidden="true" />
      <input id={id} placeholder={label} aria-invalid={error || undefined} aria-describedby={error ? errorId : undefined} {...props} />
    </div>
  );
}

export const NameIcon = User;

export function OrDivider() {
  return <p className="auth-or" aria-hidden="true"><span>or</span></p>;
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5Z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1Z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48Z" />
    </svg>
  );
}

// Starts Google sign-in on the server so the PKCE cookie is set there; a disabled provider returns a friendly message.
export function GoogleButton({ next, onError, disabled }) {
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  async function start() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    onError(null);
    try {
      const { url } = await readJson('/api/auth/google', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ next }),
      });
      window.location.assign(url);
    } catch (failure) {
      onError(failure);
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <button type="button" className="google-button" disabled={disabled || pending} onClick={start}>
      {pending ? <Pending>Opening Google…</Pending> : <><GoogleG />Continue with Google</>}
    </button>
  );
}
