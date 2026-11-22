'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import CodeEntry from '@/components/code-entry';
import PasswordField from '@/components/password-field';
import { Pending, RequestError } from '@/components/request-feedback';
import { cleanEmail, passwordProblem } from '@/lib/auth-input';
import { readJson } from '@/lib/client-requests';

const post = (body) => readJson('/api/auth/reset', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

export default function ForgotForm() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const busy = useRef(false);

  async function submit(event) {
    event.preventDefault();
    if (busy.current) return;
    let problem = null;
    const target = cleanEmail(email);
    if (step === 'email' && !target) problem = { field: 'email', message: 'Enter a valid email address.' };
    if (step === 'password') {
      problem = passwordProblem(password) ?? (password !== confirm ? { field: 'confirm', message: 'The passwords don’t match.' } : null);
    }
    if (problem) {
      setError(problem);
      return;
    }
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      if (step === 'email') {
        await post({ action: 'request', email: target });
        setEmail(target);
        setStep('code');
      } else {
        await post({ action: 'set', password });
        window.location.assign('/welcome');
        return;
      }
    } catch (failure) {
      setError(failure);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  if (step === 'code') {
    return (
      <div className="panel settings-panel">
        <CodeEntry id="reset-code" email={email}
          verify={async (code) => { await post({ action: 'verify', email, code }); setStep('password'); }}
          resend={() => post({ action: 'request', email })}
          onBack={() => setStep('email')} />
      </div>
    );
  }

  const at = (field) => error?.field === field;
  return (
    <form className="panel settings-panel" noValidate onSubmit={submit}>
      <fieldset className="grid gap-4" disabled={pending}>
        {step === 'email' ? (
          <>
            <p className="muted text-sm">We’ll email a six-digit code. You can request at most 3 resets a day.</p>
            <div>
              <label htmlFor="forgot-email">Email address</label>
              <input id="forgot-email" type="email" autoComplete="email" value={email} maxLength={254}
                aria-invalid={Boolean(error) || undefined} aria-describedby={error ? 'forgot-error' : undefined}
                onChange={(event) => setEmail(event.target.value)} />
            </div>
          </>
        ) : (
          <>
            <p>Code accepted. Choose a new password.</p>
            <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password"
              error={at('password')} errorId="forgot-error" hint="At least 8 characters, with letters and digits." />
            <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password"
              error={at('confirm')} errorId="forgot-error" />
          </>
        )}
        <RequestError id="forgot-error" error={error} retry={() => submit({ preventDefault() {} })} />
        <button className="primary settings-save" type="submit">
          {pending ? <Pending>Working…</Pending> : step === 'email' ? 'Send code' : 'Set password and sign in'}
        </button>
        <p className="auth-links"><Link href="/login">Back to sign in</Link></p>
      </fieldset>
    </form>
  );
}
