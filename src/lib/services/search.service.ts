import { districtIdForStop } from './stops.service';
import type { ServiceResult } from '$types/common';
import type { Paise } from '$types/common';
import type {
	BusFilterKey,
	BusFilters,
	BusResult,
	BusSearchResponse,
	CoachFilter,
	JourneySearchCriteria
} from '$types/transit';
import { collection, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '$lib/firebase/client';
import { mapFirebaseError } from '$lib/firebase/errors';
import type { Bus, TransitRoute, Trip } from '$types/fleet';
import { tripToOffer } from './offer';

export const emptyFilters: BusFilters = {
	time: false,
	price: false,
	ac: false,
	access: false,
	coach: 'all'
};

/** The on/off facets, in the order the bar renders them. */
export const filterKeys: BusFilterKey[] = ['time', 'price', 'ac', 'access'];

/** The coach-type choices, in order. */
export const coachOptions: CoachFilter[] = ['all', 'seater', 'sleeper'];

/** Whether a service is a sleeper. One place decides, so nothing drifts. */
export function isSleeper(bus: BusResult): boolean {
	return bus.cabinClass === 'sleeper';
}

export function totalFare(bus: BusResult): number {
	return bus.baseFare + bus.taxes;
}

/**
 * The fare the "Price" chip filters below, for a given set of results.
 *
 * Relative, not a fixed rupee ceiling. The old chip cut at a flat ₹500, which
 * meant it did nothing at all on a short corridor where every fare was ₹152,
 * and emptied the list entirely on a long one where the cheapest seat was ₹635.
 * A chip that either does nothing or wipes the list is not a filter.
 *
 * The cut is the median, so the chip always divides the list roughly in half
 * whatever the corridor costs. Nudged up by one paisa so the median fare itself
 * survives the `<=` test rather than being excluded by a rounding accident.
 */
export function fareThreshold(results: BusResult[]): Paise {
	if (results.length === 0) return 0;

	/*
		The median of the *distinct* fares, not of every row.

		Several services on a corridor often share a fare — same vehicle class,
		same distance — and the median of the raw list then lands on the most
		common value, which keeps everything and makes the chip a dud. Taking
		distinct values first guarantees a cut that actually divides the list,
		unless every fare really is identical, in which case there is nothing to
		filter on and the chip is stood down by `filterOutcomes`.
	*/
	const distinct = [...new Set(results.map(totalFare))].sort((a, b) => a - b);
	return distinct[Math.floor((distinct.length - 1) / 2)];
}

/**
 * Runs a journey search.
 *
 * Rostered services first: if Operations has scheduled anything on this
 * corridor, that is what the traveller is offered, unchanged. Only when the
 * corridor has no rostered service does the derived timetable stand in, so the
 * curated Salem → Chennai results are never diluted by generated ones and no
 * corridor comes back empty just because nobody wrote a fixture for it.
 *
 * Only route-level criteria travel across this boundary — no passenger
 * identity is accepted, returned, or logged here.
 */
export async function searchBuses(
	criteria: JourneySearchCriteria
): Promise<ServiceResult<BusSearchResponse>> {
	let matches: BusResult[];
	try {
		const { db } = requireFirebase();
		const [tripResponse, busDocs, routeDocs] = await Promise.all([
			httpsCallable<{ serviceDate: string }, { trips: Trip[] }>(requireFirebase().functions, 'searchTrips')({ serviceDate: criteria.date }),
			getDocs(collection(db, 'buses')),
			getDocs(collection(db, 'routes'))
		]);
		const buses = new Map(busDocs.docs.map((entry) => [entry.id, ({ id: entry.id, ...entry.data() }) as Bus]));
		const routes = new Map(routeDocs.docs.map((entry) => [entry.id, ({ id: entry.id, ...entry.data() }) as TransitRoute]));
		matches = tripResponse.data.trips
			.map((trip) => {
				const bus = buses.get(trip.busId);
				const route = routes.get(trip.routeId);
				return bus && route ? tripToOffer(trip, bus, route) : null;
			})
			.filter((offer): offer is BusResult => offer !== null)
			.filter((bus) => servesCorridor(bus, criteria));
	} catch (error) {
		return { status: 'error', error: mapFirebaseError(error, 'tracking_error_body') };
	}

	if (matches.length === 0) {
		return {
			status: 'ok',
			data: { criteria, results: [], totalCount: 0 }
		};
	}

	const ordered = criteria.accessibleTravelMode ? prioritiseAccessible(matches) : sortByTime(matches);

	return {
		status: 'ok',
		data: { criteria, results: ordered, totalCount: ordered.length }
	};
}

/**
 * Whether a service runs the corridor the traveller asked for.
 *
 * Matched at district level rather than stop-for-stop: a coach leaving Salem
 * Bypass still serves someone searching from Salem New Bus Stand, and each
 * result carries its own boarding point so the difference stays visible. An
 * exact-stop match would hide those alternatives; matching the whole network
 * would return services that go nowhere near the traveller.
 */
function servesCorridor(bus: BusResult, criteria: JourneySearchCriteria): boolean {
	const wantedOrigin = districtIdForStop(criteria.originStopId);
	const wantedDestination = districtIdForStop(criteria.destinationStopId);
	if (!wantedOrigin || !wantedDestination) return false;

	return (
		districtIdForStop(bus.originStopId) === wantedOrigin &&
		districtIdForStop(bus.destinationStopId) === wantedDestination
	);
}

/**
 * Applies the Explorer filter chips.
 *
 * Pure, so the UI can call it on every chip toggle without another round trip,
 * and so the chips can also call it speculatively to show what each one would
 * leave behind.
 *
 * IMPORTANT: `results` must always be the *unfiltered* set for the current
 * search. The price cut is derived from it, so passing an already-filtered list
 * would move the threshold as chips are toggled and make the chip behave
 * differently depending on the order things were pressed.
 */
export function applyFilters(results: BusResult[], filters: BusFilters): BusResult[] {
	const priceCut = filters.price ? fareThreshold(results) : 0;

	return results.filter((bus) => {
		if (filters.time && !isMorningDeparture(bus)) return false;
		if (filters.price && totalFare(bus) > priceCut) return false;
		if (filters.ac && !bus.amenities.airConditioned) return false;
		if (filters.coach === 'seater' && isSleeper(bus)) return false;
		if (filters.coach === 'sleeper' && !isSleeper(bus)) return false;
		if (filters.access && !bus.accessibleBoardingPoint) return false;
		return true;
	});
}

/**
 * How many results each chip would leave, and whether pressing it is useful.
 *
 * Counted against the *other* active chips, so the number answers the question
 * actually being asked: "if I press this now, what am I left with?"
 *
 * A chip is only offered when pressing it would genuinely change the list. Two
 * kinds of chip are stood down instead, and both were sources of the complaint
 * that the filters did not work:
 *
 *  - one that would leave nothing, which is a trap — you press it and the
 *    results vanish;
 *  - one that would leave everything, which is a dud — you press it and nothing
 *    happens at all, so it reads as broken even though it ran.
 *
 * A chip already on is always available, or it could never be turned off.
 */
export interface FilterOutcome {
	/** Results remaining if this chip is on, alongside the other active chips. */
	count: number;
	/** Results showing right now, for comparison. */
	current: number;
	available: boolean;
}

export function filterOutcomes(
	results: BusResult[],
	filters: BusFilters
): Record<BusFilterKey, FilterOutcome> {
	const outcomes = {} as Record<BusFilterKey, FilterOutcome>;
	const current = applyFilters(results, filters).length;

	for (const key of filterKeys) {
		const isOn = filters[key];
		const count = applyFilters(results, { ...filters, [key]: true }).length;
		outcomes[key] = {
			count,
			current,
			available: isOn || (count > 0 && count < current)
		};
	}

	return outcomes;
}

/**
 * How many results each coach option would leave.
 *
 * Counted against the other active facets, like the toggles. Unlike a toggle,
 * an option is not stood down for leaving *everything* — picking "All" when
 * everything is already showing is a legitimate way back, and a segmented
 * control with a disabled segment reads as broken.
 */
export function coachOutcomes(
	results: BusResult[],
	filters: BusFilters
): Record<CoachFilter, FilterOutcome> {
	const outcomes = {} as Record<CoachFilter, FilterOutcome>;
	const current = applyFilters(results, filters).length;

	for (const option of coachOptions) {
		const count = applyFilters(results, { ...filters, coach: option }).length;
		outcomes[option] = {
			count,
			current,
			available: option === 'all' || filters.coach === option || count > 0
		};
	}

	return outcomes;
}

/**
 * How many facets are narrowing the list.
 *
 * Counted field by field rather than over `Object.values`: `coach` is a string
 * now, and `'all'` is truthy, so a blanket truthiness count would report the
 * default state as an active filter and offer a "Clear all" that clears
 * nothing.
 */
export function activeFilterCount(filters: BusFilters): number {
	const toggles = filterKeys.filter((key) => filters[key]).length;
	return toggles + (filters.coach === 'all' ? 0 : 1);
}

/** The "Time" chip keeps departures before noon. Named so the chip can say so. */
export const MORNING_BEFORE_HOUR = 12;

function isMorningDeparture(bus: BusResult): boolean {
	return Number(bus.departure.slice(0, 2)) < MORNING_BEFORE_HOUR;
}

/** The canonical service leads the list on both orderings, matching the Stitch
 *  Explorer where SETC Ultra Deluxe is the first card. */
function sortByTime(results: BusResult[]): BusResult[] {
	return [...results].sort((a, b) => {
		if (a.canonical !== b.canonical) return a.canonical ? -1 : 1;
		return a.departure.localeCompare(b.departure);
	});
}

/** Accessible Travel Mode floats accessible boarding points to the top while
 *  keeping departure order within each group. */
function prioritiseAccessible(results: BusResult[]): BusResult[] {
	return [...results].sort((a, b) => {
		if (a.canonical !== b.canonical) return a.canonical ? -1 : 1;
		if (a.accessibleBoardingPoint !== b.accessibleBoardingPoint) {
			return a.accessibleBoardingPoint ? -1 : 1;
		}
		return a.departure.localeCompare(b.departure);
	});
}
