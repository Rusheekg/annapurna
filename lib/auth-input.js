import { invalidField } from './request-errors';

export const passwordRule = 'Use at least 8 characters, with letters and digits.';

export function cleanEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return email.length <= 254 && /^[^\s@\u0000-\u001f\u007f]+@[^\s@\u0000-\u001f\u007f]+\.[^\s@\u0000-\u001f\u007f]+$/.test(email) ? email : '';
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

// Only same-site relative paths may be used as a post-login destination.
export function safeNext(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') &&
    !value.includes('\\') && !/[\u0000-\u001f]/.test(value) && value.length <= 200 ? value : '';
}

export const googleUnavailable = 'Google sign-in isn’t available right now. Use email and password.';
export const googleFailed = 'Google sign-in didn’t complete. Try again, or use email and password.';
