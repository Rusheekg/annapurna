import { getUser, signInRequired } from '@/lib/auth';
import { errorResponse, serverFailure } from '@/lib/api-errors';
import { invalidField } from '@/lib/request-errors';

const endpoint = 'https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=in&limit=5&viewbox=77.35,13.20,77.85,12.75';
const userAgent = 'Annapurna/1.0 (annapurnasurplus@gmail.com)';
const cacheMs = 10 * 60 * 1000;
const failure = { code: 'GEOCODE_UNAVAILABLE', message: 'Search isn’t working right now. Drag the pin instead.' };

// Per-instance memory: results for 10 minutes, and the last request time per user (1 per second).
const cache = globalThis.annapurnaGeocodeCache ??= new Map();
const lastRequest = globalThis.annapurnaGeocodeLast ??= new Map();

// Location search for the map pickers. Nominatim's policy applies: no autocomplete, identified client, 1 request/second.
export async function GET(request) {
  try {
    const user = await getUser();
    if (!user) return errorResponse(401, signInRequired);

    const query = (new URL(request.url).searchParams.get('q') ?? '').trim();
    if (query.length < 3 || query.length > 100) {
      return errorResponse(400, invalidField('q', 'Enter between 3 and 100 characters to search.'));
    }

    const now = Date.now();
    if (now - (lastRequest.get(user.id) ?? 0) < 1000) {
      return Response.json({ error: { code: 'RATE_LIMITED', message: 'Wait a second before searching again.' } },
        { status: 429, headers: { 'Retry-After': '1' } });
    }
    lastRequest.set(user.id, now);
    if (lastRequest.size > 1000) {
      for (const [key, time] of lastRequest) if (now - time > 60000) lastRequest.delete(key);
    }

    const key = query.toLowerCase();
    const hit = cache.get(key);
    if (hit && now - hit.at < cacheMs) return Response.json({ results: hit.results });

    const response = await fetch(`${endpoint}&q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': userAgent, Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error(`Nominatim answered ${response.status}`);
    const places = await response.json();
    const results = (Array.isArray(places) ? places : []).slice(0, 5).flatMap((place) => {
      const lat = Number(place.lat);
      const lng = Number(place.lon);
      return Number.isFinite(lat) && Number.isFinite(lng) && typeof place.display_name === 'string'
        ? [{ name: place.display_name.slice(0, 200), lat, lng }] : [];
    });
    if (cache.size > 200) cache.delete(cache.keys().next().value);
    cache.set(key, { at: now, results });
    return Response.json({ results });
  } catch (error) {
    serverFailure('Location search', error);
    return errorResponse(502, failure);
  }
}
