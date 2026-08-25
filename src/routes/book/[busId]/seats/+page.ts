import { getSeatDeck } from '$services/seats.service';
import type { SeatDeck } from '$types/booking';
import type { PageLoad } from './$types';

/** Bus and stops come from the booking layout; this adds the seat deck. */
export const load: PageLoad = async ({ params }): Promise<{ deck: SeatDeck | null }> => {
	const result = await getSeatDeck(params.busId);
	return { deck: result.status === 'ok' ? result.data : null };
};
