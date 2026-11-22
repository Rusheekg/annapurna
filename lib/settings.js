import 'server-only';
import { database } from './db';

export const settingKeys = ['kg_per_meal', 'co2e_per_kg', 'avg_speed_kmph'];

export function settingsFromRows(rows) {
  const values = Object.fromEntries(rows.map(({ key, value }) => [key, Number(value)]));
  if (!settingKeys.every((key) => Number.isFinite(values[key]) && values[key] > 0)) {
    throw new Error('Impact settings are missing or invalid.');
  }
  return values;
}

export async function readSettings() {
  const { rows } = await database().query(
    'SELECT key, value FROM public.settings WHERE key = ANY($1::text[])',
    [settingKeys],
  );
  return settingsFromRows(rows);
}
