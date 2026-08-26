import { getBus } from '$services/buses.service';
import { listStops } from '$services/stops.service';
/**
 * Bus and stop data shared by every step of the booking flow, so seat
 * selection, passenger details, and review all describe the same journey.
 */
export const load = async ({ params }) => {
    const [busResult, stopsResult] = await Promise.all([getBus(params.busId), listStops()]);
    return {
        busId: params.busId,
        bus: busResult.status === 'ok' ? busResult.data : null,
        stops: stopsResult.status === 'ok' ? stopsResult.data : []
    };
};
