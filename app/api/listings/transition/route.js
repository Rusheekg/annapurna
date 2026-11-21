import { database } from '@/lib/db';
import { validId } from '@/lib/listings';

const transitions = {
  claim: {
    set: "status = 'claimed', receiver_id = $2, claimed_at = now()",
    where: `l.status = 'posted' AND l.pickup_by > now() AND EXISTS (
      SELECT 1 FROM public.notifications n WHERE n.listing_id = l.id AND n.receiver_id = $2
    )`,
    conflict: 'This offer has already been claimed, is no longer available, or was not offered to this account.',
  },
  requestVolunteer: {
    set: "pickup_method = 'volunteer'",
    where: "l.status = 'claimed' AND l.pickup_by > now() AND l.receiver_id = $2 AND l.pickup_method IS NULL",
    conflict: 'A pickup choice is already set or the pickup window has closed.',
  },
  collectOurselves: {
    set: "pickup_method = 'self'",
    where: "l.status = 'claimed' AND l.pickup_by > now() AND l.receiver_id = $2 AND l.pickup_method IS NULL",
    conflict: 'A pickup choice is already set or the pickup window has closed.',
  },
  accept: {
    set: 'volunteer_id = $2',
    where: `l.status = 'claimed' AND l.pickup_by > now() AND l.pickup_method = 'volunteer'
      AND l.volunteer_id IS NULL AND EXISTS (
        SELECT 1 FROM public.volunteers v WHERE v.id = $2 AND v.available
      )`,
    conflict: 'This pickup is already assigned, the pickup window closed, or this volunteer is unavailable.',
  },
  collect: {
    set: "status = 'collected', collected_at = now()",
    where: "l.status = 'claimed' AND l.pickup_by > now()",
    conflict: 'This pickup cannot be marked collected. Check the assignment and pickup deadline.',
    handover: true,
  },
  deliver: {
    set: "status = 'delivered', delivered_at = now()",
    where: "l.status = 'collected'",
    conflict: 'This pickup cannot be marked delivered. It must be assigned to this account and collected first.',
    handover: true,
  },
};

const handoverOwner = {
  receiver: "l.pickup_method = 'self' AND l.receiver_id = $2",
  volunteer: "l.pickup_method IS DISTINCT FROM 'self' AND l.volunteer_id = $2",
};

export async function PATCH(request) {
  const { listingId, accountId, action, role } = (await request.json().catch(() => null)) ?? {};
  const transition = typeof action === 'string' && Object.hasOwn(transitions, action) ? transitions[action] : null;
  const allowed = transition?.handover
    ? typeof role === 'string' && Object.hasOwn(handoverOwner, role)
    : role === (action === 'accept' ? 'volunteer' : 'receiver');
  if (!transition || !allowed || !validId(listingId) || !validId(accountId)) {
    return Response.json({ error: 'Choose a valid listing, account and action.' }, { status: 400 });
  }

  try {
    const owner = transition.handover ? ' AND ' + handoverOwner[role] : '';
    const { rows } = await database().query(
      `UPDATE public.listings AS l SET ${transition.set}
       WHERE l.id = $1 AND ${transition.where}${owner} RETURNING l.*`,
      [listingId, accountId],
    );
    if (!rows.length) return Response.json({ error: transition.conflict }, { status: 409 });
    return Response.json(rows[0]);
  } catch (error) {
    console.error('Could not update listing:', error.message);
    return Response.json({ error: 'The listing could not be updated. Please try again.' }, { status: 500 });
  }
}
