'use client';

import { useEffect, useRef, useState } from 'react';
import { Pending, RequestError } from '@/components/request-feedback';

// Six-digit code step. `verify(code)` and `resend()` throw request errors; "Resend code" unlocks after 60 seconds.
export default function CodeEntry({ email, verify, resend, onBack, initialCooldown = true, id = 'code' }) {
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [resendAt, setResendAt] = useState(initialCooldown ? Date.now() + 60000 : 0);
  const [seconds, setSeconds] = useState(initialCooldown ? 60 : 0);
  const busy = useRef(false);

  useEffect(() => {
    if (!resendAt) return;
    const update = () => setSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  async function run(kind) {
    if (busy.current) return;
    busy.current = true;
    setPending(kind);
    setError(null);
    setNotice('');
    try {
      if (kind === 'verify') {
        await verify(code);
      } else {
        await resend();
        setCode('');
        setResendAt(Date.now() + 60000);
        setSeconds(60);
        setNotice('New code sent. Check your inbox and spam folder.');
      }
    } catch (failure) {
      setError(failure);
    } finally {
      busy.current = false;
      setPending(null);
    }
  }

  return (
    <form className="grid gap-4" noValidate onSubmit={(event) => { event.preventDefault(); run('verify'); }}>
      <fieldset className="grid gap-4" disabled={Boolean(pending)}>
        <p>Enter the six-digit code sent to <strong>{email}</strong>.</p>
        <div>
          <label htmlFor={id}>Verification code</label>
          <input id={id} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            aria-invalid={Boolean(error) || undefined} aria-describedby={error ? `${id}-error` : undefined} />
        </div>
        <RequestError id={`${id}-error`} error={error} retry={() => run('verify')} />
        <button className="primary settings-save" type="submit">
          {pending === 'verify' ? <Pending>Checking…</Pending> : 'Verify code'}
        </button>
        <div className="flex flex-wrap gap-2">
          <button className="secondary" type="button" disabled={seconds > 0 || Boolean(pending)} onClick={() => run('resend')}>
            {pending === 'resend' ? <Pending>Sending…</Pending> : 'Resend code'}
          </button>
          {onBack && <button className="secondary" type="button" onClick={onBack}>Change email</button>}
          {seconds > 0 && <p className="muted self-center text-sm">Resend available in {seconds}s</p>}
        </div>
      </fieldset>
      {notice && <p className="notice" role="status">{notice}</p>}
    </form>
  );
}
