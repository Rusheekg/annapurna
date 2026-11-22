'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Pending, RequestError } from '@/components/request-feedback';

// Six-digit code step: ONE input so pasting works. `verify(code)` and `resend()` throw request errors.
// "Resend code" unlocks after 60 seconds. `children` is a small helper line shown under the links.
export default function CodeEntry({ email, verify, resend, onBack, initialCooldown = true, id: idProp, children }) {
  const generated = useId();
  const id = idProp ?? generated;
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
    <form className="auth-form" noValidate onSubmit={(event) => { event.preventDefault(); run('verify'); }}>
      <p>Enter the six-digit code sent to <strong>{email}</strong>.</p>
      <fieldset className="grid gap-4" disabled={Boolean(pending)}>
        <div className="auth-field">
          <label htmlFor={id} className="sr-only">Verification code</label>
          <ShieldCheck className="auth-field-icon" size={18} strokeWidth={1.5} aria-hidden="true" />
          <input id={id} className="auth-code" value={code} placeholder="------"
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            onPaste={(event) => {
              // maxLength would cut "123 456" at 6 characters before the space is removed, so clean pasted text first.
              event.preventDefault();
              setCode(event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6));
            }}
            inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            aria-invalid={Boolean(error) || undefined} aria-describedby={error ? `${id}-error` : undefined} />
        </div>
        <RequestError id={`${id}-error`} error={error} retry={() => run('verify')} />
        <button className="primary auth-submit" type="submit">
          {pending === 'verify' ? <Pending>Checking…</Pending> : 'Verify code'}
        </button>
      </fieldset>
      <div className="auth-link-row">
        <button type="button" className="auth-link" disabled={seconds > 0 || Boolean(pending)} onClick={() => run('resend')}>
          {pending === 'resend' ? 'Sending…' : seconds > 0 ? `Resend in ${seconds}s` : 'Resend code'}
        </button>
        {onBack && <button type="button" className="auth-link" onClick={onBack}>Change email</button>}
      </div>
      {notice && <p className="notice" role="status">{notice}</p>}
      {children}
    </form>
  );
}
