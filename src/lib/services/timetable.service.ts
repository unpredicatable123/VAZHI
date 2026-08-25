import { busFleetFixtures } from '$lib/mocks/fleet.mock';
import { stopFixtures } from '$lib/mocks/stops.mock';
import type { BusResult, JourneySearchCriteria } from '$types/transit';
import type { Trip } from '$types/fleet';
import { tripToOffer } from './offer';
import { resolveRoute, roadDistanceKm, routeIdForJourney } from './routes.service';

/**
 * Derived timetable — services for corridors nothing is rostered on.
 *
 * WHY THIS EXISTS. The trip fixtures cover the corridors the demonstration
 * actually rosters crew onto. Tamil Nadu has far more pairs of stops than that,
 * and a traveller picking Chennai → Omalur was getting an empty result list,
 * which reads as a broken product rather than as an unserved route.
 *
 * WHAT IT IS. A stand-in for the timetable a real backend would return: given a
 * corridor, it produces a plausible set of departures. Everything is derived
 * from the two stops — distance from their coordinates, running time from that
 * distance, fare from the distance and the vehicle class — so the numbers are
 * at least internally consistent with the rest of the app.
 *
 * WHAT IT IS NOT. These are not rostered runnings. They carry no crew, they are
 * never `canonical`, and so they are never bookable: the Explorer lists them as
 * timetable entries and the card says so. Operations does not see them, because
 * Operations manages work that exists. When the mock services are replaced by
 * the real VAZHI backend this module is the one that goes away entirely — every
 * caller already speaks in `Trip` and `BusResult`.
 *
 * DETERMINISM. Everything is seeded from the corridor and the date, so the same
 * search always returns the same services, in the same order, with the same
 * ids. Nothing here is random at call time.
 */

/** Departure pattern for a derived corridor, in minutes from midnight. */
const DEPARTURE_PATTERN = [6 * 60 + 30, 9 * 60 + 15, 13 * 60 + 45, 18 * 60, 22 * 60 + 30];

/** Average running speed used to turn distance into a schedule. */
const AVERAGE_SPEED_KMH = 46;

/** Rest stops add time on anything long enough to need one. */
const REST_STOP_MINUTES = 25;
const REST_STOP_THRESHOLD_KM = 220;

/** Below this, the pair is a local hop rather than an intercity corridor. */
const MINIMUM_CORRIDOR_KM = 12;

/** Fare per kilometre in paise, by vehicle class. */
const FARE_PER_KM: Record<string, number> = {
	express: 78,
	deluxe: 95,
	ultra_deluxe: 110,
	sleeper: 200
};

/**
 * A small, stable hash of a string.
 *
 * Used only to pick which vehicles serve a derived corridor, so the choice is
 * repeatable across reloads without storing anything.
 */
function hash(value: string): number {
	let h = 2166136261;
	for (let i = 0; i < value.length; i++) {
		h ^= value.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return Math.abs(h);
}

/**
 * Identifier for a derived service.
 *
 * `~` separates the parts because a stop id is `[a-z0-9-]` and a hyphen would
 * make the id ambiguous to parse. That matters: the id goes into the booking
 * URL, so the seat screen has to be able to reconstruct the service from it
 * alone when someone reloads the page or opens a link.
 */
const SERVICE_PREFIX = 'svc~';

export function serviceIdFor(
	originStopId: string,
	destinationStopId: string,
	departure: string
): string {
	return `${SERVICE_PREFIX}${originStopId}~${destinationStopId}~${departure.replace(':', '')}`;
}

/** The corridor and departure behind a derived service id, if it is one. */
export function parseServiceId(
	id: string
): { originStopId: string; destinationStopId: string; departure: string } | null {
	if (!id.startsWith(SERVICE_PREFIX)) return null;
	const [originStopId, destinationStopId, time] = id.slice(SERVICE_PREFIX.length).split('~');
	if (!originStopId || !destinationStopId || !/^\d{4}$/.test(time ?? '')) return null;
	return {
		originStopId,
		destinationStopId,
		departure: `${time.slice(0, 2)}:${time.slice(2)}`
	};
}

/**
 * Rebuilds one derived service from its id.
 *
 * The whole timetable for the corridor is regenerated and the matching
 * departure picked out. Cheap, and it means a derived service survives a
 * reload, a shared link, and a return trip to the ticket later on.
 */
export function findDerivedOffer(id: string, date: string): BusResult | undefined {
	const parsed = parseServiceId(id);
	if (!parsed) return undefined;

	return deriveOffers({
		originStopId: parsed.originStopId,
		destinationStopId: parsed.destinationStopId,
		date,
		passengers: 1,
		accessibleTravelMode: false
	}).find((offer) => offer.id === id);
}

function clockOf(totalMinutes: number): string {
	const wrapped = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
	return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

/**
 * Whether a corridor is worth deriving services for.
 *
 * Same stop, unknown stop, or two stops close enough to walk between are all
 * cases where inventing an intercity coach would be worse than an honest empty
 * result.
 */
export function isDerivableCorridor(originStopId: string, destinationStopId: string): boolean {
	if (originStopId === destinationStopId) return false;
	const origin = stopFixtures.find((stop) => stop.id === originStopId);
	const destination = stopFixtures.find((stop) => stop.id === destinationStopId);
	if (!origin || !destination) return false;
	return roadDistanceKm(origin.coordinates, destination.coordinates) >= MINIMUM_CORRIDOR_KM;
}

/**
 * Derives the day's services for a corridor.
 *
 * Returns `Trip` records rather than display rows, so the derived timetable and
 * the rostered one are the same kind of thing and project through the same
 * mapper.
 */
export function deriveTrips(criteria: JourneySearchCriteria): Trip[] {
	const { originStopId, destinationStopId, date } = criteria;
	if (!isDerivableCorridor(originStopId, destinationStopId)) return [];

	const routeId = routeIdForJourney(originStopId, destinationStopId);
	const route = resolveRoute(routeId);
	if (!route) return [];

	const origin = stopFixtures.find((stop) => stop.id === originStopId);
	const destination = stopFixtures.find((stop) => stop.id === destinationStopId);
	if (!origin || !destination) return [];

	const distanceKm = Math.max(
		MINIMUM_CORRIDOR_KM,
		Math.round(roadDistanceKm(origin.coordinates, destination.coordinates))
	);

	let runningMinutes = Math.round((distanceKm / AVERAGE_SPEED_KMH) * 60);
	if (distanceKm >= REST_STOP_THRESHOLD_KM) runningMinutes += REST_STOP_MINUTES;

	const seed = hash(`${originStopId}~${destinationStopId}`);

	// A long corridor gets the whole day's pattern; a short one gets the first
	// few departures, so a two-hour hop does not pretend to run overnight.
	const departures = DEPARTURE_PATTERN.slice(0, distanceKm >= 150 ? 5 : 3);

	return departures.map((departureMinutes, index) => {
		/*
			Rotate through the fleet so the corridor is not worked by one vehicle
			all day, and so the class mix looks like a real timetable.

			Step by one, not by three: with six vehicles a step of three put the
			first and third departure on the same bus (0 and 6 are the same index
			once wrapped), so a three-departure corridor came out with duplicate
			fares and amenities — and the Explorer's filter chips then had nothing
			to tell the services apart by.
		*/
		const bus = busFleetFixtures[(seed + index) % busFleetFixtures.length];
		const perKm = FARE_PER_KM[bus.cabinClass] ?? 95;
		const baseFare = Math.round((distanceKm * perKm) / 500) * 500;

		return {
			id: serviceIdFor(originStopId, destinationStopId, clockOf(departureMinutes)),
			code: `SVC-${String((seed + index) % 900 + 100)}`,
			routeId,
			busId: bus.id,
			// A derived service carries no roster. Operations assigns crew when a
			// service is actually put on, which is what turns it into a trip.
			driverId: '',
			conductorId: '',
			serviceName: bus.serviceType,
			serviceDate: date,
			departureTime: clockOf(departureMinutes),
			arrivalTime: clockOf(departureMinutes + runningMinutes),
			boardingStopId: originStopId,
			destinationStopId,
			platform: String(((seed + index) % 12) + 1).padStart(2, '0'),
			status: 'scheduled',
			baseFare,
			taxes: Math.round((baseFare * 0.05) / 100) * 100,
			seatsAvailable: ((seed + index * 7) % 34) + 4,
			distanceKm,
			// Never on sale and never canonical: there is no seat deck and no crew
			// behind a derived service, so the Explorer lists it and stops there.
			sellable: false,
			canonical: false,
			highlights: index === 0 ? ['fast'] : []
		} satisfies Trip;
	});
}

/** The derived timetable as display rows, ordered by departure. */
export function deriveOffers(criteria: JourneySearchCriteria): BusResult[] {
	const routeId = routeIdForJourney(criteria.originStopId, criteria.destinationStopId);
	const route = resolveRoute(routeId);
	if (!route) return [];

	return deriveTrips(criteria)
		.map((trip) => {
			const bus = busFleetFixtures.find((candidate) => candidate.id === trip.busId);
			return bus ? tripToOffer(trip, bus, route) : null;
		})
		.filter((offer): offer is BusResult => offer !== null)
		.sort((a, b) => a.departure.localeCompare(b.departure));
}
