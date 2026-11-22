import { invalidField } from './request-errors';

export const passwordRule = 'Use at least 8 characters, with letters and digits.';

export function cleanEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

export function passwordProblem(value) {
  if (typeof value !== 'string' || value.length < 8 || !/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return invalidField('password', passwordRule);
  }
  if (value.length > 72) return invalidField('password', 'Use at most 72 characters.');
  return null;
}

export const emailProblem = invalidField('email', 'Enter a valid email address.');
export const codeProblem = invalidField('code', 'Enter the six-digit code from your email.');
export const validCode = (value) => typeof value === 'string' && /^\d{6}$/.test(value);

export function weakMessage(error) {
  const reasons = error?.reasons ?? [];
  if (reasons.includes('pwned')) return 'That password appears in a known data breach. Choose another.';
  if (reasons.includes('characters')) return 'Include uppercase and lowercase letters and a digit.';
  return 'Choose a stronger password.';
}
