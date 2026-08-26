import { listTrips } from '$services/bookings.service';
// Trip data depends on this session's in-memory bookings, so the page renders
// on the client rather than being prerendered with stale fixtures.
export const prerender = false;
export const load = async () => {
    const result = await listTrips();
    return { trips: result.status === 'ok' ? result.data : [] };
};
