import { hasOnlyFields, invalidBody, readBody } from '@/lib/json-body';
import { database } from '@/lib/db';
import { settingKeys, settingsFromRows } from '@/lib/settings';
import { errorResponse, serverFailure } from '@/lib/api-errors';
import { invalidField } from '@/lib/request-errors';
import { getUser, isAdmin, writeIdentity } from '@/lib/auth';

export async function PATCH(request) {
  try {
    if (!isAdmin(await getUser())) return errorResponse(403, { code: 'FORBIDDEN', message: 'Only administrators can change the impact assumptions.' });
    const body = await readBody(request);
    if (!hasOnlyFields(body, settingKeys)) return invalidBody();
    const values = settingKeys.map((key) => body[key]);
    const invalidIndex = values.findIndex((value) => !Number.isFinite(value) || value <= 0 || value > 1000);
    if (invalidIndex !== -1) {
      return errorResponse(400, invalidField(settingKeys[invalidIndex], 'Enter a number greater than zero and no greater than 1,000.'));
    }

    const { response } = await writeIdentity({ needsProfile: false });
    if (response) return response;

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
