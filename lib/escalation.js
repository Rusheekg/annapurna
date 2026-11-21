import 'server-only';
import { database } from './db';
import { nextReceivers } from './matching';

export async function runEscalation() {
  const client = await database().connect();
  try {
    await client.query('BEGIN');
    // Serialize offer rounds across simultaneous pollers, including separate app instances.
    const { rows: [lock] } = await client.query('SELECT pg_try_advisory_xact_lock(450831, 3) AS acquired');
    if (lock.acquired) {
      await client.query(`
        UPDATE public.listings SET status = 'expired', expired_at = now()
        WHERE status IN ('posted', 'claimed') AND pickup_by <= now()
      `);
      await client.query(`
        WITH due AS (
          SELECT l.*, COALESCE(previous.last_round, 0) + 1 AS next_round
          FROM public.listings l
          CROSS JOIN LATERAL (
            SELECT MAX(round) AS last_round, MAX(created_at) AS last_offer_at
            FROM public.notifications WHERE listing_id = l.id
          ) previous
          WHERE l.status = 'posted' AND l.pickup_by > now() + interval '30 minutes'
            AND COALESCE(previous.last_offer_at, l.created_at) <= now() - interval '15 minutes'
          FOR NO KEY UPDATE OF l SKIP LOCKED
        )
        INSERT INTO public.notifications (listing_id, receiver_id, round, match_reason)
        SELECT l.id, r.receiver_id, l.next_round, r.reason
        FROM due l JOIN public.donors d ON d.id = l.donor_id
        CROSS JOIN LATERAL (${nextReceivers}) r
        ON CONFLICT (listing_id, receiver_id) DO NOTHING
      `);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
