'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { AuthCard } from '@/components/auth-layout';
import { IconInput } from '@/components/auth-parts';
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
      <AuthCard title={<>Check your <em>email</em></>}>
        <CodeEntry id="reset-code" email={email}
          verify={async (code) => { await post({ action: 'verify', email, code }); setStep('password'); }}
          resend={() => post({ action: 'request', email })}
          onBack={() => setStep('email')} />
      </AuthCard>
    );
  }

  const at = (field) => error?.field === field;
  return (
    <AuthCard title={step === 'email' ? <>Reset your <em>password</em></> : <>Set a new <em>password</em></>}>
      <form className="auth-form" noValidate onSubmit={submit}>
        <fieldset className="grid gap-4" disabled={pending}>
          {step === 'email' ? (
            <>
              <p className="muted text-sm">We’ll email a six-digit code. You can request at most 3 resets a day.</p>
              <IconInput label="Email Address" type="email" value={email} autoComplete="email" maxLength={254}
                error={Boolean(error)} errorId="forgot-error" onChange={(event) => setEmail(event.target.value)} />
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
          <button className="primary auth-submit" type="submit">
            {pending ? <Pending>Working…</Pending> : step === 'email' ? 'Send code' : 'Set password and log in'}
          </button>
        </fieldset>
        <p className="auth-switch"><Link className="auth-link" href="/login">Back to login</Link></p>
      </form>
    </AuthCard>
  );
}
