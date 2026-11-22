'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import CodeEntry from '@/components/code-entry';
import PasswordField from '@/components/password-field';
import { Pending, RequestError } from '@/components/request-feedback';
import { cleanEmail, passwordProblem } from '@/lib/auth-input';
import { readJson } from '@/lib/client-requests';

const post = (body) => readJson('/api/auth/signup', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const busy = useRef(false);

  async function submit(event) {
    event.preventDefault();
    if (busy.current) return;
    const target = cleanEmail(email);
    const problem = !target ? { field: 'email', message: 'Enter a valid email address.' }
      : passwordProblem(password) ?? (password !== confirm ? { field: 'confirm', message: 'The passwords don’t match.' } : null);
    if (problem) {
      setError(problem);
      return;
    }
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await post({ action: 'signup', email: target, password });
      setSentTo(target);
    } catch (failure) {
      setError(failure);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  if (sentTo) {
    return (
      <div className="panel settings-panel grid gap-4">
        <CodeEntry id="signup-code" email={sentTo}
          verify={async (code) => { await post({ action: 'verify', email: sentTo, code }); window.location.assign('/welcome'); }}
          resend={() => post({ action: 'resend', email: sentTo })}
          onBack={() => { setSentTo(''); setPassword(''); setConfirm(''); }} />
        <p className="muted text-sm">
          No code? If this email already has an account, <Link href="/login" className="auth-inline">sign in</Link> or{' '}
          <Link href="/forgot" className="auth-inline">reset your password</Link>.
        </p>
      </div>
    );
  }

  const at = (field) => error?.field === field;
  return (
    <form className="panel settings-panel" noValidate onSubmit={submit}>
      <fieldset className="grid gap-4" disabled={pending}>
        <div>
          <label htmlFor="signup-email">Email address</label>
          <input id="signup-email" type="email" autoComplete="email" value={email} maxLength={254}
            aria-invalid={at('email') || undefined} aria-describedby={at('email') ? 'signup-error' : undefined}
            onChange={(event) => setEmail(event.target.value)} />
        </div>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="new-password"
          error={at('password')} errorId="signup-error" hint="At least 8 characters, with letters and digits." />
        <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password"
          error={at('confirm')} errorId="signup-error" />
        <RequestError id="signup-error" error={error} retry={() => submit({ preventDefault() {} })} />
        <button className="primary settings-save" type="submit">
          {pending ? <Pending>Creating account…</Pending> : 'Create account'}
        </button>
        <p className="auth-links"><Link href="/login">Already have an account? Sign in</Link></p>
      </fieldset>
    </form>
  );
}
