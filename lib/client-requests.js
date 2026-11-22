import { loadFailure, writeFailure } from './request-errors';

export function networkError(write = false) {
  return { code: 'SERVER_UNAVAILABLE', message: write ? writeFailure : loadFailure };
}

function waitForConnection() {
  if (navigator.onLine) return;
  return new Promise((resolve) => window.addEventListener('online', resolve, { once: true }));
}

export async function readJson(url, options) {
  const write = Boolean(options?.method && options.method !== 'GET');
  let response;
  try {
    if (write) await waitForConnection();
    response = await fetch(url, options);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    // An in-flight request may already have reached the server. Retry it explicitly.
    throw networkError(write);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw data?.error?.message ? data.error : networkError(write);
  return data;
}
