import { database } from '@/lib/db';
import { validId } from '@/lib/listings';
import { distanceKm, volunteerPickupRadiusKm } from '@/lib/matching';
import { errorResponse, serverFailure } from '@/lib/api-errors';
import { expiredMessage, invalidField, missingListing } from '@/lib/request-errors';
import { receiverRequired, roleForbidden, writeIdentity } from '@/lib/auth';

const selfClaim = {
  code: 'SELF_CLAIM',
  message: "You posted this listing, so it can't be claimed by your own account.",
};

const transitions = {
  claim: {
    account: 'receiver',
    set: "status = 'claimed', receiver_id = $2, claimed_at = now()",
    where: `l.status = 'posted' AND l.pickup_by > now() AND EXISTS (
      SELECT 1 FROM public.notifications n WHERE n.listing_id = l.id AND n.receiver_id = $2
    )`,
    conflict: 'This offer is no longer available to your account. Check your other offers.',
  },
  requestVolunteer: {
    account: 'receiver',
    set: "pickup_method = 'volunteer', volunteer_requested_at = now()",
    where: "l.status = 'claimed' AND l.pickup_by > now() AND l.receiver_id = $2 AND l.pickup_method IS NULL",
    conflict: 'A pickup choice is already set or the pickup window has closed.',
  },
  collectOurselves: {
    account: 'receiver',
    set: "pickup_method = 'self'",
    where: "l.status = 'claimed' AND l.pickup_by > now() AND l.receiver_id = $2 AND l.pickup_method IS NULL",
    conflict: 'A pickup choice is already set or the pickup window has closed.',
  },
  accept: {
    account: 'volunteer',
    set: 'volunteer_id = $2',
    where: `l.status = 'claimed' AND l.pickup_by > now() AND l.pickup_method = 'volunteer'
      AND l.volunteer_id IS NULL AND EXISTS (
        SELECT 1 FROM public.volunteers v JOIN public.donors d ON d.id = l.donor_id
        WHERE v.id = $2 AND v.available AND ${distanceKm('v', 'd')} <= ${volunteerPickupRadiusKm}
      )`,
    conflict: 'This pickup is assigned, closed, outside your 5 km pickup radius, or your account is unavailable.',
  },
  collect: {
    set: "status = 'collected', collected_at = now()",
    where: "l.status = 'claimed' AND l.pickup_by > now()",
    conflict: 'This pickup cannot be marked collected. Check the assignment and pickup deadline.',
    account: 'handover',
  },
  deliver: {
    set: "status = 'delivered', delivered_at = now()",
    where: "l.status = 'collected'",
    conflict: 'This pickup cannot be marked delivered. It must be assigned to this account and collected first.',
    account: 'handover',
  },
};

// A handover belongs to the user's receiver record (self pickup) or volunteer record (volunteer pickup).
const handoverOwner = "((l.pickup_method = 'self' AND l.receiver_id = $2) OR (l.pickup_method IS DISTINCT FROM 'self' AND l.volunteer_id = $3))";

export async function PATCH(request) {
  try {
    const { accounts, response } = await writeIdentity();
    if (response) return response;
    const { listingId, action } = (await request.json().catch(() => null)) ?? {};
    const transition = typeof action === 'string' && Object.hasOwn(transitions, action) ? transitions[action] : null;
    if (!transition || !validId(listingId)) {
      return errorResponse(400, invalidField(null, 'Choose a valid listing and action.'));
    }
    // The account follows from the action and the verified session, never from the request.
    const handover = transition.account === 'handover';
    const accountId = handover ? null : accounts[transition.account];
    if (transition.account === 'receiver' && !accountId) return errorResponse(403, receiverRequired);
    if (action === 'claim' && (await database().query(
      'SELECT 1 FROM public.listings WHERE id = $1 AND donor_id = $2', [listingId, accounts.donor],
    )).rowCount) return errorResponse(403, selfClaim);
    const { rows } = await database().query(
      `UPDATE public.listings AS l SET ${transition.set}
       WHERE l.id = $1 AND ${transition.where}${handover ? ' AND ' + handoverOwner : ''} RETURNING l.*`,
      handover ? [listingId, accounts.receiver ?? null, accounts.volunteer] : [listingId, accountId],
    );
    if (!rows.length) {
      const { rows: [listing] } = await database().query(
        `SELECT status, receiver_id, pickup_by <= now() AS deadline_passed,
           EXISTS (SELECT 1 FROM public.notifications WHERE listing_id = $1 AND receiver_id = $2) AS offered
         FROM public.listings WHERE id = $1`, [listingId, accounts.receiver ?? null],
      );
      if (!listing) return errorResponse(404, missingListing);
      if (action === 'claim' && !listing.offered) return errorResponse(403, roleForbidden);
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
