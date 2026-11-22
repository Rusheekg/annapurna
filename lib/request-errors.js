export const writeFailure = "We couldn't reach the server, so this wasn't saved. Try again.";
export const loadFailure = "We couldn't reach the server. Try again.";
export const expiredMessage = 'The pickup time for this listing has passed.';
export const missingAccount = { code: 'NOT_FOUND', message: 'This account could not be found. Choose another account.' };
export const missingListing = { code: 'NOT_FOUND', message: 'This listing could not be found. Return to your listings.' };

export function invalidField(field, message) {
  return { code: 'INVALID_INPUT', message, ...(field && { field }) };
}
