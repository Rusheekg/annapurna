'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Pending } from './request-feedback';

export default function RouteFeedback({ error }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="panel request-error error" role="alert">
      <span>{error.message}</span>
      <button type="button" className="secondary" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
        {pending ? <Pending>Retrying…</Pending> : 'Retry'}
      </button>
    </div>
  );
}
