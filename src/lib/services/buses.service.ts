import { busFixtures } from '$lib/mocks/buses.mock';
import type { ServiceResult } from '$types/common';
import type { BusResult } from '$types/transit';
import { simulateLatency } from './transport';
import { findDerivedOffer } from './timetable.service';
import { todayIso } from '$utils/format';

/**
 * Single-service lookup for the booking flow. Route and vehicle data only.
 *
 * Resolves both kinds of service: the rostered ones projected from the trip
 * fixtures, and the derived ones the timetable generates for corridors nothing
 * is rostered on. A derived service is rebuilt from its own id, so a booking
 * URL still works after a reload or when a link is shared.
 */

export function findService(busId: string, date: string = todayIso()): BusResult | undefined {
	return (
		busFixtures.find((candidate) => candidate.id === busId) ?? findDerivedOffer(busId, date)
	);
}

export async function getBus(
	busId: string,
	date: string = todayIso()
): Promise<ServiceResult<BusResult>> {
	await simulateLatency();
	const bus = findService(busId, date);
	if (!bus) {
		return { status: 'error', error: { code: 'not_found', messageKey: 'booking_bus_missing_body' } };
	}
	return { status: 'ok', data: bus };
}

/**
 * Whether a service can be carried into seat selection.
 *
 * Every service can. This used to be true of the canonical journey alone,
 * because it was the only one with a hand-written seat plan — so every other
 * result in the Explorer offered a "Select seats" button that walked into a
 * dead end. Plans are now generated for whatever vehicle works the trip, so
 * the whole timetable goes through to a ticket.
 *
 * Kept as a predicate rather than deleted: a real backend will have services
 * that genuinely cannot be sold — cancelled, closed, or full — and this is
 * where that answer belongs.
 */
export function isBookable(bus: BusResult): boolean {
	return bus.seatsAvailable > 0;
}
