import { getSeatDeck } from '$services/seats.service';
/** Bus and stops come from the booking layout; this adds the seat deck. */
export const load = async ({ params }) => {
    const result = await getSeatDeck(params.busId);
    return { deck: result.status === 'ok' ? result.data : null };
};
