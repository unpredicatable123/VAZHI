import { getBooking } from '$services/bookings.service';
export const prerender = false;
export const load = async ({ params }) => {
    const result = await getBooking(params.pnr);
    return { booking: result.status === 'ok' ? result.data : null };
};
