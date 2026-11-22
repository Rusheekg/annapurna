'use client';

import { useEffect, useRef, useState } from 'react';
import { Pending, RequestError } from '@/components/request-feedback';
import { readJson } from '@/lib/client-requests';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const busy = useRef(false);

  useEffect(() => {
    if (!resendAt) return;
    const update = () => setSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  async function submit(action) {
    if (busy.current) return;
    busy.current = true;
    setPending(action);
    setError(null);
    setNotice('');
    try {
      const target = sentTo || email.trim();
      await readJson('/api/auth/otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, email: target, code }),
      });
      if (action === 'verify') {
        window.location.assign('/welcome');
        return;
      }
      setSentTo(target);
      setCode('');
      setSeconds(60);
      setResendAt(Date.now() + 60000);
      setNotice('Code sent. Check your inbox and spam folder.');
    } catch (failure) {
      setError(failure);
    } finally {
      busy.current = false;
      setPending(null);
    }
  }

  return (
    <form className="panel settings-panel" noValidate onSubmit={(event) => {
      event.preventDefault();
      submit(sentTo ? 'verify' : 'send');
    }}>
      <fieldset className="grid gap-4" disabled={Boolean(pending)}>
        {sentTo ? (
          <>
            <p>Enter the six-digit code sent to <strong>{sentTo}</strong>.</p>
            <div>
              <label htmlFor="login-code">Verification code</label>
              <input id="login-code" value={code} onChange={(event) => setCode(event.target.value)}
                inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                aria-invalid={error?.field === 'code' || undefined}
                aria-describedby={error?.field === 'code' ? 'login-error' : undefined} />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="login-email">Email address</label>
            <input id="login-email" type="email" autoComplete="email" value={email} maxLength={254}
              aria-invalid={error?.field === 'email' || undefined}
              aria-describedby={error?.field === 'email' ? 'login-error' : undefined}
              onChange={(event) => setEmail(event.target.value)} />
          </div>
        )}
        <RequestError id="login-error" error={error} retry={() => submit(sentTo ? 'verify' : 'send')} />
        <button className="primary settings-save" type="submit">
          {pending ? <Pending>{pending === 'send' ? 'Sending…' : 'Checking…'}</Pending> : sentTo ? 'Sign in' : 'Send code'}
        </button>
        {sentTo && (
          <div className="flex flex-wrap gap-2">
            <button className="secondary" type="button" disabled={seconds > 0} onClick={() => submit('send')}>Resend code</button>
            <button className="secondary" type="button" onClick={() => { setSentTo(''); setNotice(''); setError(null); }}>Change email</button>
            {seconds > 0 && <p className="muted self-center text-sm">Resend available in {seconds}s</p>}
          </div>
        )}
      </fieldset>
      {notice && <p className="notice mt-3" role="status">{notice}</p>}
    </form>
  );
}
