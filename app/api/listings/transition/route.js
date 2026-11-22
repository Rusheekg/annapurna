import { database } from '@/lib/db';
import { validId } from '@/lib/listings';
import { errorResponse, serverFailure } from '@/lib/api-errors';
import { expiredMessage, invalidField, missingListing } from '@/lib/request-errors';
import { receiverRequired, roleForbidden, writeIdentity } from '@/lib/auth';
import { hasOnlyFields, invalidBody, readBody } from '@/lib/json-body';

const selfClaim = {
  code: 'SELF_CLAIM',
  message: "You posted this listing, so it can't be claimed by your own account.",
};

const transitions = {
  claim: {
    account: 'receiver',
    query: `UPDATE public.listings AS l SET status = 'claimed', receiver_id = $2, claimed_at = now()
      WHERE l.id = $1 AND l.status = 'posted' AND l.pickup_by > now() AND EXISTS (
      SELECT 1 FROM public.notifications n WHERE n.listing_id = l.id AND n.receiver_id = $2
    ) RETURNING l.*`,
    conflict: 'This offer is no longer available to your account. Check your other offers.',
  },
  requestVolunteer: {
    account: 'receiver',
    query: `UPDATE public.listings AS l SET pickup_method = 'volunteer', volunteer_requested_at = now()
      WHERE l.id = $1 AND l.status = 'claimed' AND l.pickup_by > now() AND l.receiver_id = $2 AND l.pickup_method IS NULL RETURNING l.*`,
    conflict: 'A pickup choice is already set or the pickup window has closed.',
  },
  collectOurselves: {
    account: 'receiver',
    query: `UPDATE public.listings AS l SET pickup_method = 'self'
      WHERE l.id = $1 AND l.status = 'claimed' AND l.pickup_by > now() AND l.receiver_id = $2 AND l.pickup_method IS NULL RETURNING l.*`,
    conflict: 'A pickup choice is already set or the pickup window has closed.',
  },
  accept: {
    account: 'volunteer',
    query: `UPDATE public.listings AS l SET volunteer_id = $2
      WHERE l.id = $1 AND l.status = 'claimed' AND l.pickup_by > now() AND l.pickup_method = 'volunteer'
      AND l.volunteer_id IS NULL AND EXISTS (
  SELECT 1 FROM public.volunteers v JOIN public.donors d ON d.id = l.donor_id
  WHERE v.id = $2 AND v.available AND 12742 * asin(sqrt(least(1,
            power(sin(radians(d.lat - v.lat) / 2), 2) +
            cos(radians(v.lat)) * cos(radians(d.lat)) *
            power(sin(radians(d.lng - v.lng) / 2), 2)
          ))) <= 5
) RETURNING l.*`,
    conflict: 'This pickup is assigned, closed, outside your 5 km pickup radius, or your account is unavailable.',
  },
  collect: {
    query: `UPDATE public.listings AS l SET status = 'collected', collected_at = now()
      WHERE l.id = $1 AND l.status = 'claimed' AND l.pickup_by > now() AND ((l.pickup_method = 'self' AND l.receiver_id = $2) OR (l.pickup_method IS DISTINCT FROM 'self' AND l.volunteer_id = $3)) RETURNING l.*`,
    conflict: 'This pickup cannot be marked collected. Check the assignment and pickup deadline.',
    account: 'handover',
  },
  deliver: {
    query: `UPDATE public.listings AS l SET status = 'delivered', delivered_at = now()
      WHERE l.id = $1 AND l.status = 'collected' AND ((l.pickup_method = 'self' AND l.receiver_id = $2) OR (l.pickup_method IS DISTINCT FROM 'self' AND l.volunteer_id = $3)) RETURNING l.*`,
    conflict: 'This pickup cannot be marked delivered. It must be assigned to this account and collected first.',
    account: 'handover',
  },
};

export async function PATCH(request) {
  try {
    const body = await readBody(request);
    if (!hasOnlyFields(body, ['listingId', 'action'])) return invalidBody();
    const { listingId, action } = body;
    const transition = typeof action === 'string' && Object.hasOwn(transitions, action) ? transitions[action] : null;
    if (!transition || !validId(listingId)) {
      return errorResponse(400, invalidField(null, 'Choose a valid listing and action.'));
    }
    const { accounts, response } = await writeIdentity();
    if (response) return response;
    // The account follows from the action and the verified session, never from the request.
    const handover = transition.account === 'handover';
    const accountId = handover ? null : accounts[transition.account];
    if (transition.account === 'receiver' && !accountId) return errorResponse(403, receiverRequired);
    if (action === 'claim' && (await database().query(
      'SELECT 1 FROM public.listings WHERE id = $1 AND donor_id = $2', [listingId, accounts.donor],
    )).rowCount) return errorResponse(403, selfClaim);
    const { rows } = await database().query(
      transition.query,
      handover
        ? [listingId, accounts.receiver ?? null, accounts.volunteer]
        : [listingId, accountId],
    );
    if (!rows.length) {
      const { rows: [listing] } = await database().query(
        `SELECT status, receiver_id, pickup_by <= now() AS deadline_passed,
           EXISTS (SELECT 1 FROM public.notifications WHERE listing_id = $1 AND receiver_id = $2) AS offered,
           ((l.pickup_method = 'self' AND l.receiver_id = $2) OR (l.pickup_method IS DISTINCT FROM 'self' AND l.volunteer_id = $3)) AS handover_owned,
           (l.pickup_method = 'volunteer' AND
             (l.volunteer_id = $3 OR (l.volunteer_id IS NULL AND EXISTS (
  SELECT 1 FROM public.volunteers v JOIN public.donors d ON d.id = l.donor_id
  WHERE v.id = $3 AND v.available AND 12742 * asin(sqrt(least(1,
            power(sin(radians(d.lat - v.lat) / 2), 2) +
            cos(radians(v.lat)) * cos(radians(d.lat)) *
            power(sin(radians(d.lng - v.lng) / 2), 2)
          ))) <= 5
)))) AS volunteer_allowed
         FROM public.listings l WHERE l.id = $1`, [listingId, accounts.receiver ?? null, accounts.volunteer],
      );
      if (!listing) return errorResponse(404, missingListing);
      if (action === 'claim' && !listing.offered) return errorResponse(403, roleForbidden);
      if (action === 'accept' && !listing.volunteer_allowed) return errorResponse(403, roleForbidden);
      if (handover && !listing.handover_owned) return errorResponse(403, roleForbidden);
      if (transition.account === 'receiver' && action !== 'claim' && listing.receiver_id !== accountId) {
        return errorResponse(403, roleForbidden);
      }
      if (listing.status === 'expired' || (listing.deadline_passed && ['posted', 'claimed'].includes(listing.status))) {
        return errorResponse(409, { code: 'EXPIRED', message: expiredMessage });
      }
      if (action === 'claim' && listing.receiver_id && listing.receiver_id !== accountId) {
        return errorResponse(409, { code: 'CLAIM_CONFLICT', message: "Another kitchen claimed this a moment ago. It's no longer available." });
      }
      if (action === 'claim' && listing.receiver_id === accountId) {
        return errorResponse(409, { code: 'CONFLICT', message: 'You already claimed this offer. Check your listing offers.' });
      }
      return errorResponse(409, { code: 'CONFLICT', message: transition.conflict });
    }
    return Response.json(rows[0]);
  } catch (error) {
    return errorResponse(503, serverFailure('Update listing', error, true));
  }
}
