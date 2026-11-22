import 'server-only';
import { database } from './db';

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
        CROSS JOIN LATERAL (
          SELECT receiver_id, concat(
            round(km::numeric, 1), ' km · ',
            CASE WHEN l.portions <= need THEN concat('fits your need of ', need)
                 ELSE concat(l.portions, ' portions for a need of ', need) END,
            ' · arrives ', floor(minutes_early)::int, ' min before cutoff'
          ) AS reason
          FROM (
            SELECT r.id AS receiver_id, r.daily_need_meals AS need, travel.km, cutoff.minutes_left,
              cutoff.minutes_left - travel.km / s.value * 60 AS minutes_early
            FROM public.receivers r
            CROSS JOIN public.settings s
            CROSS JOIN LATERAL (SELECT 12742 * asin(sqrt(least(1,
                    power(sin(radians(r.lat - d.lat) / 2), 2) +
                    cos(radians(d.lat)) * cos(radians(r.lat)) *
                    power(sin(radians(r.lng - d.lng) / 2), 2)
                  ))) AS km) travel
            CROSS JOIN LATERAL (SELECT EXTRACT(EPOCH FROM l.pickup_by - now()) / 60 AS minutes_left) cutoff
            WHERE s.key = 'avg_speed_kmph'
              AND (l.storage <> 'chilled' OR r.can_store_chilled)
              AND NOT EXISTS (
                SELECT 1 FROM public.notifications n WHERE n.listing_id = l.id AND n.receiver_id = r.id
              )
              AND NOT EXISTS (
                SELECT 1 FROM public.user_roles poster
                JOIN public.user_roles own ON own.user_id = poster.user_id AND own.role = 'receiver'
                WHERE poster.role = 'donor' AND poster.account_id = l.donor_id AND own.account_id = r.id
              )
          ) arrivals
          WHERE minutes_early >= 30
          ORDER BY .4 * minutes_early / NULLIF(minutes_left, 0) + .3 * (1 - least(km, 10) / 10)
            + .3 * least(l.portions, need)::numeric / greatest(l.portions, need) DESC, receiver_id
          LIMIT 3
        ) r
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
