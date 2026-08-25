import type { BusResult } from '$types/transit';
import { busFleetFixtures } from './fleet.mock';
import { routeFixtures } from './routes.mock';
import { tripFixtures } from './trips.mock';
import { tripToOffer } from '$services/offer';

/**
 * The scheduled traveller timetable, projected from the trip fixtures.
 *
 * These are the services Operations has actually rostered: a real vehicle, a
 * real crew, a real slot in the day. They are projected through the shared
 * `tripToOffer` mapper, the same one the derived timetable uses, so a card
 * cannot describe a journey differently depending on where the service came
 * from.
 *
 *     Trip + Bus + Route  ──▶  BusResult (a dated service offer)
 *
 * The `id` of an offer is the id of the trip behind it, which is why a booking
 * can carry a `tripId` and a conductor can find the passengers for the trip a
 * traveller booked. The four ids that existed before trips did are unchanged,
 * so URLs, saved bookings, and seat-deck keys all still resolve.
 *
 * Corridors with no rostered service are covered by `timetable.service`, which
 * derives a timetable on demand rather than leaving a search empty.
 *
 * Fares are stored in paise. No passenger data appears in this file.
 */
function project(): BusResult[] {
	const results: BusResult[] = [];
	for (const trip of tripFixtures()) {
		if (!trip.sellable || trip.status === 'cancelled') continue;
		const bus = busFleetFixtures.find((candidate) => candidate.id === trip.busId);
		const route = routeFixtures.find((candidate) => candidate.id === trip.routeId);
		if (!bus || !route) continue;
		results.push(tripToOffer(trip, bus, route));
	}
	return results;
}

export const busFixtures: BusResult[] = project();
