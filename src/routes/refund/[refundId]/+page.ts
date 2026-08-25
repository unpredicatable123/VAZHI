import { getRefund } from '$services/refunds.service';
import { getBooking } from '$services/bookings.service';
import type { Booking, RefundRecord } from '$types/booking';
import type { PageLoad } from './$types';

export const prerender = false;

export const load: PageLoad = async ({
	params
}): Promise<{ refund: RefundRecord | null; booking: Booking | null }> => {
	const refundResult = await getRefund(params.refundId);
	if (refundResult.status === 'error') {
		return { refund: null, booking: null };
	}
	const bookingResult = await getBooking(refundResult.data.pnr);
	return {
		refund: refundResult.data,
		booking: bookingResult.status === 'ok' ? bookingResult.data : null
	};
};
