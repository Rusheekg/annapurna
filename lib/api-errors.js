import 'server-only';
import { randomBytes } from 'node:crypto';
import { inspect } from 'node:util';
import { loadFailure, writeFailure } from './request-errors';

export function serverFailure(operation, error, write = false) {
  const reference = randomBytes(3).toString('hex').toUpperCase();
  process.stderr.write(`[Ref ${reference}] ${operation}\n${inspect(error)}\n`);
  return { code: 'SERVER_UNAVAILABLE', message: `${write ? writeFailure : loadFailure} Ref ${reference}` };
}

export function errorResponse(status, error) {
  return Response.json({ error }, { status });
}
