import { database } from '@/lib/db';
import { settingKeys, settingsFromRows } from '@/lib/settings';

export async function PATCH(request) {
  const body = await request.json().catch(() => null);
  const values = settingKeys.map((key) => body?.[key]);
  if (!values.every((value) => Number.isFinite(value) && value > 0)) {
    return Response.json({ error: 'Enter a positive number for each assumption.' }, { status: 400 });
  }

  try {
    const { rows } = await database().query(
      `INSERT INTO public.settings (key, value)
       SELECT * FROM unnest($1::text[], $2::numeric[])
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
       RETURNING key, value`,
      [settingKeys, values],
    );
    return Response.json(settingsFromRows(rows));
  } catch (error) {
    console.error('Could not save assumptions:', error.message);
    return Response.json({ error: 'Could not save assumptions. Try again.' }, { status: 500 });
  }
}
