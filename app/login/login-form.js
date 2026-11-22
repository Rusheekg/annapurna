'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { AuthCard } from '@/components/auth-layout';
import { GoogleSection, IconInput } from '@/components/auth-parts';
import CodeEntry from '@/components/code-entry';
import PasswordField from '@/components/password-field';
import { Pending, RequestError } from '@/components/request-feedback';
import { readJson } from '@/lib/client-requests';

const post = (url, body) => readJson(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

export default function LoginForm({ next, initialError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(initialError ? { code: 'GOOGLE_FAILED', message: initialError } : null);
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
      <AuthCard title={<>Check your <em>email</em></>}>
        <CodeEntry id="login-code" email={verifying}
          verify={async (code) => { await post('/api/auth/signup', { action: 'verify', email: verifying, code }); window.location.assign('/welcome'); }}
          resend={() => post('/api/auth/signup', { action: 'resend', email: verifying })}
          onBack={() => setVerifying('')} />
      </AuthCard>
    );
  }

  return (
    <AuthCard title={<>Welcome <em>back</em></>}>
      <form className="auth-form" noValidate onSubmit={(event) => { event.preventDefault(); run('signin'); }}>
        <fieldset className="grid gap-4" disabled={Boolean(pending)}>
          <IconInput label="Email" type="email" value={email} autoComplete="email" maxLength={254}
            error={Boolean(error)} errorId="login-error" onChange={(event) => setEmail(event.target.value)} />
          <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password"
            error={Boolean(error)} errorId="login-error" />
          <div className="auth-forgot"><Link className="auth-link" href="/forgot">Forgot password?</Link></div>
          <RequestError id="login-error" error={error} retry={() => run('signin')} />
          {error?.code === 'EMAIL_NOT_VERIFIED' && (
            <button className="auth-link" type="button" onClick={() => run('resend')}>
              {pending === 'resend' ? <Pending>Sending…</Pending> : 'Send a new verification code'}
            </button>
          )}
          <button className="primary auth-submit" type="submit">
            {pending === 'signin' ? <Pending>Signing in…</Pending> : 'Login'}
          </button>
        </fieldset>
        <p className="muted text-sm">Signed up with a code before? Use Forgot password to set a password.</p>
        <GoogleSection next={next} disabled={Boolean(pending)} onError={setError} />
        <p className="auth-switch">New here? <Link className="auth-link" href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}>Create account</Link></p>
      </form>
    </AuthCard>
  );
}
