'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { AuthCard } from '@/components/auth-layout';
import { GoogleSection, IconInput, NameIcon } from '@/components/auth-parts';
import CodeEntry from '@/components/code-entry';
import PasswordField from '@/components/password-field';
import { Pending, RequestError } from '@/components/request-feedback';
import { cleanEmail, passwordProblem } from '@/lib/auth-input';
import { readJson } from '@/lib/client-requests';

const post = (body) => readJson('/api/auth/signup', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

export default function SignupForm({ next }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const busy = useRef(false);

  async function submit(event) {
    event.preventDefault();
    if (busy.current) return;
    const target = cleanEmail(email);
    const problem = !name.trim() ? { field: 'name', message: 'Enter your full name.' }
      : !target ? { field: 'email', message: 'Enter a valid email address.' }
        : passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await post({ action: 'signup', name: name.trim(), email: target, password });
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
      <AuthCard title={<>Check your <em>email</em></>}>
        <CodeEntry id="signup-code" email={sentTo}
          verify={async (code) => { await post({ action: 'verify', email: sentTo, code }); window.location.assign('/welcome'); }}
          resend={() => post({ action: 'resend', email: sentTo })}
          onBack={() => { setSentTo(''); setPassword(''); }}>
          <p className="muted text-sm">
            No code? If this email already has an account, <Link href="/login" className="auth-link">log in</Link> or{' '}
            <Link href="/forgot" className="auth-link">reset your password</Link>.
          </p>
        </CodeEntry>
      </AuthCard>
    );
  }

  const at = (field) => error?.field === field;
  return (
    <AuthCard title={<>Create <em>Account</em></>}>
      <form className="auth-form" noValidate onSubmit={submit}>
        <p className="muted">Be a part of Annapurna’s mission.</p>
        <fieldset className="grid gap-4" disabled={pending}>
          <IconInput label="Full Name" icon={NameIcon} value={name} autoComplete="name" maxLength={100}
            error={at('name')} errorId="signup-error" onChange={(event) => setName(event.target.value)} />
          <IconInput label="Email Address" type="email" value={email} autoComplete="email" maxLength={254}
            error={at('email')} errorId="signup-error" onChange={(event) => setEmail(event.target.value)} />
          <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="new-password"
            error={at('password')} errorId="signup-error" hint="At least 8 characters, with letters and digits." />
          <RequestError id="signup-error" error={error} retry={() => submit({ preventDefault() {} })} />
          <button className="primary auth-submit" type="submit">
            {pending ? <Pending>Creating account…</Pending> : 'Sign Up'}
          </button>
        </fieldset>
        <GoogleSection next={next} disabled={pending} onError={setError} />
        <p className="auth-switch">Already have an account? <Link className="auth-link" href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}>Login</Link></p>
      </form>
    </AuthCard>
  );
}
