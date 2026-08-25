import { listTrips } from '$services/bookings.service';
import type { Booking } from '$types/booking';
import type { PageLoad } from './$types';

// Trip data depends on this session's in-memory bookings, so the page renders
// on the client rather than being prerendered with stale fixtures.
export const prerender = false;

export const load: PageLoad = async (): Promise<{ trips: Booking[] }> => {
	const result = await listTrips();
	return { trips: result.status === 'ok' ? result.data : [] };
};
