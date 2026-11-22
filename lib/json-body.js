import { errorResponse } from './api-errors';
import { invalidField } from './request-errors';

export async function readBody(request) {
  const body = await request.json().catch(() => null);
  return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
}

export function hasOnlyFields(body, fields) {
  return body !== null && Object.keys(body).every((field) => fields.includes(field));
}

export function invalidBody() {
  return errorResponse(400, invalidField(null, 'Enter a valid request body.'));
}
