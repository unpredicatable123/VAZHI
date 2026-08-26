import { getRefund } from '$services/refunds.service';
import { getBooking } from '$services/bookings.service';
export const prerender = false;
export const load = async ({ params }) => {
    try {
        const refundId = params.refundId ?? '';
        const refundResult = await getRefund(refundId);
        if (refundResult.status === 'error' || !refundResult.data) {
            return { refund: null, booking: null };
        }
        const bookingResult = await getBooking(refundResult.data.pnr);
        return {
            refund: refundResult.data,
            booking: bookingResult.status === 'ok' ? bookingResult.data : null
        };
    }
    catch {
        return { refund: null, booking: null };
    }
};
