import { database } from '../../../lib/db';

export async function GET() {
  try {
    const db = database();
    const [donors, receivers, volunteers, settings] = await Promise.all([
      db.query('SELECT id, name FROM public.donors ORDER BY id'),
      db.query('SELECT id, name FROM public.receivers ORDER BY id'),
      db.query('SELECT id, name FROM public.volunteers ORDER BY id'),
      db.query("SELECT value FROM public.settings WHERE key = 'kg_per_meal'"),
    ]);
    return Response.json({
      donor: donors.rows,
      receiver: receivers.rows,
      volunteer: volunteers.rows,
      kgPerMeal: Number(settings.rows[0].value),
    });
  } catch (error) {
    console.error('Could not load demo accounts:', error.message);
    return Response.json({ error: 'Could not load demo accounts.' }, { status: 500 });
  }
}
