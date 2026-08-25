import type { BusResult } from '$types/transit';
import type { Bus, TransitRoute, Trip } from '$types/fleet';

/**
 * Trip → service offer.
 *
 * `BusResult` is the flattened shape the Explorer and the booking flow consume:
 * one row per dated service, with the vehicle, the corridor, the times, and the
 * fare together so a card renders without four lookups.
 *
 * Pure on purpose — no fixtures, no stores, no imports with side effects — so
 * both the shipped timetable in `buses.mock` and the derived timetable in
 * `timetable.service` project through exactly the same function. A service
 * offer can therefore never disagree with the trip behind it depending on where
 * it came from.
 */
export function tripToOffer(trip: Trip, bus: Bus, route: TransitRoute): BusResult {
	const [depHours, depMinutes] = trip.departureTime.split(':').map(Number);
	const [arrHours, arrMinutes] = trip.arrivalTime.split(':').map(Number);
	const start = depHours * 60 + depMinutes;
	const end = arrHours * 60 + arrMinutes;

	return {
		id: trip.id,
		tripId: trip.id,
		operator: bus.operator,
		serviceName: trip.serviceName,
		cabinClass: bus.cabinClass,
		vehicleNumber: bus.registrationNumber,
		amenities: { ...bus.amenities },

		originStopId: trip.boardingStopId,
		destinationStopId: trip.destinationStopId,
		departure: trip.departureTime,
		arrival: trip.arrivalTime,
		// An arrival earlier on the clock than the departure runs past midnight.
		durationMinutes: end > start ? end - start : end + 1440 - start,
		distanceKm: trip.distanceKm ?? route.distanceKm,

		boardingPlatform: trip.platform ?? '--',
		accessibleBoardingPoint: bus.accessibleBoardingPoint,

		baseFare: trip.baseFare,
		taxes: trip.taxes,

		seatsAvailable: trip.seatsAvailable,
		highlights: [...trip.highlights],
		routeId: trip.routeId,
		canonical: trip.canonical
	};
}
