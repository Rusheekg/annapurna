import 'server-only';
import { randomBytes } from 'node:crypto';
import { loadFailure, writeFailure } from './request-errors';

export function serverFailure(operation, error, write = false) {
  const reference = randomBytes(3).toString('hex').toUpperCase();
  const code = typeof error?.code === 'string' && /^[A-Za-z0-9_]{1,40}$/.test(error.code)
    ? ` (${error.code})` : '';
  process.stderr.write(`[Ref ${reference}] ${operation}${code}\n`);
  return { code: 'SERVER_UNAVAILABLE', message: `${write ? writeFailure : loadFailure} Ref ${reference}` };
}

export function errorResponse(status, error) {
  return Response.json({ error }, { status });
}
