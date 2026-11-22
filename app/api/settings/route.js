import { database } from '@/lib/db';
import { settingKeys, settingsFromRows } from '@/lib/settings';
import { errorResponse, serverFailure } from '@/lib/api-errors';
import { invalidField } from '@/lib/request-errors';

export async function PATCH(request) {
  const body = await request.json().catch(() => null);
  const values = settingKeys.map((key) => body?.[key]);
  const invalidIndex = values.findIndex((value) => !Number.isFinite(value) || value <= 0);
  if (invalidIndex !== -1) {
    return errorResponse(400, invalidField(settingKeys[invalidIndex], 'Enter a number greater than zero.'));
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
    return errorResponse(503, serverFailure('Save assumptions', error, true));
  }
}
