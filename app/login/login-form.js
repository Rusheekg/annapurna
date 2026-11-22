'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import CodeEntry from '@/components/code-entry';
import PasswordField from '@/components/password-field';
import { Pending, RequestError } from '@/components/request-feedback';
import { readJson } from '@/lib/client-requests';

const post = (url, body) => readJson(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState('');
  const busy = useRef(false);

  async function run(kind) {
    if (busy.current) return;
    busy.current = true;
    setPending(kind);
    setError(null);
    try {
      if (kind === 'signin') {
        await post('/api/auth/login', { email, password });
        window.location.assign('/welcome');
        return;
      }
      await post('/api/auth/signup', { action: 'resend', email });
      setVerifying(email.trim().toLowerCase());
    } catch (failure) {
      setError(failure);
    } finally {
      busy.current = false;
      setPending(null);
    }
  }

  if (verifying) {
    return (
      <div className="panel settings-panel">
        <CodeEntry id="login-code" email={verifying}
          verify={async (code) => { await post('/api/auth/signup', { action: 'verify', email: verifying, code }); window.location.assign('/welcome'); }}
          resend={() => post('/api/auth/signup', { action: 'resend', email: verifying })}
          onBack={() => setVerifying('')} />
      </div>
    );
  }

  return (
    <form className="panel settings-panel" noValidate onSubmit={(event) => { event.preventDefault(); run('signin'); }}>
      <fieldset className="grid gap-4" disabled={Boolean(pending)}>
        <div>
          <label htmlFor="login-email">Email address</label>
          <input id="login-email" type="email" autoComplete="email" value={email} maxLength={254}
            aria-invalid={Boolean(error) || undefined} aria-describedby={error ? 'login-error' : undefined}
            onChange={(event) => setEmail(event.target.value)} />
        </div>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password"
          error={Boolean(error)} errorId="login-error" />
        <RequestError id="login-error" error={error} retry={() => run('signin')} />
        {error?.code === 'EMAIL_NOT_VERIFIED' && (
          <button className="secondary" type="button" onClick={() => run('resend')}>
            {pending === 'resend' ? <Pending>Sending…</Pending> : 'Send a new verification code'}
          </button>
        )}
        <button className="primary settings-save" type="submit">
          {pending === 'signin' ? <Pending>Signing in…</Pending> : 'Sign in'}
        </button>
        <p className="auth-links">
          <Link href="/signup">Sign up</Link>
          <Link href="/forgot">Forgot password</Link>
        </p>
        <p className="muted text-sm">Signed up with a code before? Use Forgot password to set a password.</p>
      </fieldset>
    </form>
  );
}
