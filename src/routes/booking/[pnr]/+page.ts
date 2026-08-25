import { getBooking } from '$services/bookings.service';
import type { Booking } from '$types/booking';
import type { PageLoad } from './$types';

export const prerender = false;

export const load: PageLoad = async ({ params }): Promise<{ booking: Booking | null }> => {
	const result = await getBooking(params.pnr);
	return { booking: result.status === 'ok' ? result.data : null };
};
