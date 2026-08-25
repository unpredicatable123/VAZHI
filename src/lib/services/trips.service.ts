import { findBus } from './fleet.service';
import { findCrew, findCrewInRole } from './crew.service';
import { routeFixtures } from '$lib/mocks/routes.mock';
import { trips as tripStore } from '$stores/trips.svelte';
import type { ServiceResult } from '$types/common';
import type {
	CrewRole,
	RouteStop,
	TransitRoute,
	Trip,
	TripConflict,
	TripDraft,
	TripStatus,
	TripStatusCounts,
	TripStopProgress,
	TripValidationIssue,
	TripView
} from '$types/fleet';
import { tripStatusSequence, tripStatuses } from '$types/fleet';
import { todayIso } from '$utils/format';
import { collection, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '$lib/firebase/client';
import { mapFirebaseError } from '$lib/firebase/errors';

/**
 * Trips — the centre of the operational model.
 *
 * Every role reads its work from here. A traveller books a trip, a conductor
 * boards the passengers on a trip, a driver runs a trip, and Operations
 * schedules trips. There is exactly one set of trip records behind all four, so
 * a controller assigning `TRIP-001` to `DRV-014` and `CON-023` is the reason
 * that driver and that conductor see the same journey when they sign in.
 *
 * Frontend only: no depot system, no scheduling backend, no live vehicle feed.
 * Trip records come from fixtures, changes live in the trips store, and every
 * position or progress figure is derived from the clock in the browser.
 *
 * PRIVACY: nothing this module returns describes a passenger. A trip carries a
 * seats-remaining count, never a roster of who is travelling.
 */

/* ----------------------------------------------------------------- routes */

export function findRoute(routeId: string): TransitRoute | undefined {
	return routeFixtures.find((route) => route.id === routeId);
}

export async function listRoutes(): Promise<ServiceResult<TransitRoute[]>> {
	try {
		const { db } = requireFirebase();
		const snapshot = await getDocs(collection(db, 'routes'));
		return { status: 'ok', data: snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as TransitRoute) };
	} catch (error) {
		return { status: 'error', error: mapFirebaseError(error, 'tracking_error_body') };
	}
}

/* ------------------------------------------------------------ time helpers */

/** Minutes since midnight, from an `HH:mm` string. */
function minutesOf(time: string): number {
	const [hours, minutes] = time.split(':').map(Number);
	if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
	return hours * 60 + minutes;
}

function clockOf(totalMinutes: number): string {
	const wrapped = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
	const hours = Math.floor(wrapped / 60);
	return `${String(hours).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

/**
 * Scheduled running time in minutes.
 *
 * An arrival earlier on the clock than the departure means the service runs
 * past midnight, so a day is added rather than the duration coming out
 * negative.
 */
export function durationOf(departure: string, arrival: string): number {
	const start = minutesOf(departure);
	const end = minutesOf(arrival);
	return end > start ? end - start : end + 1440 - start;
}

/** The window a running occupies, in minutes from midnight on its date. */
function windowOf(trip: Pick<Trip, 'departureTime' | 'arrivalTime'>): [number, number] {
	const start = minutesOf(trip.departureTime);
	return [start, start + durationOf(trip.departureTime, trip.arrivalTime)];
}

/* ------------------------------------------------------- canonical statuses */

/**
 * The status to show for a trip.
 *
 * The stored trip field is the source of truth. A locally acknowledged
 * transition wins until the refreshed Firestore record catches up, but the
 * browser clock never invents a different status for another screen.
 */
function resolveStatus(trip: Trip): TripStatus {
	tripStore.init();
	const override = tripStore.overrideFor(trip.id);
	return override ?? trip.status;
}

/** Every trip, with its canonical status resolved. Synchronous for render paths. */
export function allTrips(_now: Date = new Date()): Trip[] {
	tripStore.init();
	return tripStore.all.map((trip) => ({ ...trip, status: resolveStatus(trip) }));
}

/* ------------------------------------------------------------------ lookups */

function findTrip(tripId: string, now: Date = new Date()): Trip | undefined {
	return allTrips(now).find((trip) => trip.id === tripId);
}

/**
 * Joins a trip to its vehicle, corridor, and crew.
 *
 * Returns `null` when the vehicle or corridor is missing, because a trip
 * without either is not something a page can render honestly.
 */
export function viewFor(trip: Trip): TripView | null {
	const bus = findBus(trip.busId);
	const route = findRoute(trip.routeId);
	if (!bus || !route) return null;

	return {
		trip,
		bus,
		route,
		driver: findCrewInRole(trip.driverId, 'driver'),
		conductor: findCrewInRole(trip.conductorId, 'conductor'),
		boardingStop: stopOnRoute(route, trip.boardingStopId),
		destinationStop: stopOnRoute(route, trip.destinationStopId),
		durationMinutes: durationOf(trip.departureTime, trip.arrivalTime),
		distanceKm: trip.distanceKm ?? route.distanceKm
	};
}

/**
 * A stop on a corridor.
 *
 * A short-worked running can board or terminate somewhere the corridor does
 * not list — the Koyambedu terminator is the example in the fixtures — so a
 * miss here is expected and the caller falls back to the terminus.
 */
function stopOnRoute(route: TransitRoute, stopId: string): RouteStop | undefined {
	return route.stops.find((stop) => stop.stopId === stopId);
}

export async function listTripViews(): Promise<ServiceResult<TripView[]>> {
	try {
		const { db } = requireFirebase();
		const snapshot = await getDocs(collection(db, 'trips'));
		const views = snapshot.docs
			.map((entry) => viewFor({ id: entry.id, ...entry.data() } as Trip))
			.filter((view): view is TripView => view !== null)
			.sort(byServiceOrder);
		return { status: 'ok', data: views };
	} catch (error) {
		return { status: 'error', error: mapFirebaseError(error, 'tracking_error_body') };
	}
}

/** Soonest first within a date, and today ahead of history. */
function byServiceOrder(a: TripView, b: TripView): number {
	if (a.trip.serviceDate !== b.trip.serviceDate) {
		return a.trip.serviceDate.localeCompare(b.trip.serviceDate);
	}
	return a.trip.departureTime.localeCompare(b.trip.departureTime);
}

/* ------------------------------------------------------- crew assignments */

/**
 * The trip a crew member is rostered onto.
 *
 * Today's running comes first, because that is what someone signing in at the
 * depot needs. Failing that, the next future running, so a driver rostered for
 * tomorrow still sees their work rather than an empty screen. A cancelled trip
 * is never returned as an assignment.
 */
export function assignmentFor(
	crewId: string,
	role: CrewRole,
	now: Date = new Date()
): Trip | undefined {
	const member = findCrew(crewId);
	const id = member?.id ?? crewId.trim().toLocaleUpperCase();
	const today = todayIso();

	const held = allTrips(now).filter((trip) => {
		const holder = role === 'driver' ? trip.driverId : trip.conductorId;
		return holder.toLocaleUpperCase() === id && trip.status !== 'cancelled';
	});

	const todays = held
		.filter((trip) => trip.serviceDate === today)
		.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
	if (todays.length > 0) {
		// A crew member working two turns in a day should see the one still to
		// run, not the one they finished this morning.
		return todays.find((trip) => trip.status !== 'completed') ?? todays[todays.length - 1];
	}

	return held
		.filter((trip) => trip.serviceDate > today)
		.sort((a, b) => a.serviceDate.localeCompare(b.serviceDate))[0];
}

export async function getAssignedTrip(
	crewId: string,
	role: CrewRole
): Promise<ServiceResult<TripView>> {
	try {
		const { functions } = requireFirebase();
		const response = await httpsCallable<Record<string, never>, { trip: Trip }>(functions, 'getAssignedTrip')({});
		const view = viewFor(response.data.trip);
		if (!view) return { status: 'error', error: { code: 'not_found', messageKey: 'assignment_none_body' } };
		return { status: 'ok', data: view };
	} catch (error) {
		return { status: 'error', error: mapFirebaseError(error, 'assignment_none_body') };
	}
}

/**
 * What a vehicle is doing right now, if anything.
 *
 * This is a lookup *through* the trips, never a field on the bus: the answer
 * changes every day, which is precisely why a route cannot live on a vehicle.
 */
export function currentTripForBus(busId: string, now: Date = new Date()): Trip | undefined {
	const today = todayIso();
	const held = allTrips(now).filter((trip) => trip.busId === busId && trip.status !== 'cancelled');

	return (
		held
			.filter((trip) => trip.serviceDate === today && trip.status !== 'completed')
			.sort((a, b) => a.departureTime.localeCompare(b.departureTime))[0] ??
		held
			.filter((trip) => trip.serviceDate > today)
			.sort((a, b) => a.serviceDate.localeCompare(b.serviceDate))[0]
	);
}

/* ------------------------------------------------------------ status change */

/** The next status in the running order, or `null` at the end of the line. */
export function nextStatus(status: TripStatus): TripStatus | null {
	const index = tripStatusSequence.indexOf(status);
	if (index === -1 || index === tripStatusSequence.length - 1) return null;
	return tripStatusSequence[index + 1];
}

/**
 * Whether a status change is allowed.
 *
 * Forward one step at a time along the running order, or a cancellation of
 * anything not already finished. No going backwards: a trip that has departed
 * has departed.
 */
function canTransition(from: TripStatus, to: TripStatus): boolean {
	if (from === to) return false;
	if (from === 'completed' || from === 'cancelled') return false;
	if (to === 'cancelled') return true;
	return nextStatus(from) === to;
}

export async function updateTripStatus(
	tripId: string,
	to: TripStatus
): Promise<ServiceResult<Trip>> {
	const trip = findTrip(tripId);
	if (!trip) {
		return { status: 'error', error: { code: 'not_found', messageKey: 'trip_missing_body' } };
	}
	if (!canTransition(trip.status, to)) {
		return {
			status: 'error',
			error: { code: 'invalid_request', messageKey: 'trip_status_invalid_transition' }
		};
	}

	try {
		const { functions } = requireFirebase();
		const response = await httpsCallable<{ tripId: string; status: TripStatus }, { trip: Trip }>(functions, 'transitionTrip')({ tripId, status: to });
		tripStore.setStatus(tripId, to);
		return { status: 'ok', data: response.data.trip };
	} catch (error) {
		return { status: 'error', error: mapFirebaseError(error, 'trip_status_invalid_transition') };
	}
}

/* --------------------------------------------------------- stop progression */

/**
 * The corridor with simulated progress marked on it.
 *
 * SIMULATION ONLY. Position is inferred from the trip status and, once the
 * service is running, from the browser clock against the scheduled times. No
 * GPS receiver, telemetry feed, or transit API is contacted — the driver
 * screens state this on the page.
 */
export function stopProgress(view: TripView, now: Date = new Date()): TripStopProgress[] {
	const { trip, route } = view;
	const stops = route.stops;
	if (stops.length === 0) return [];

	const departure = minutesOf(trip.departureTime);
	const span = Math.max(1, view.durationMinutes);
	const nowMinutes = now.getHours() * 60 + now.getMinutes();

	let progress: number;
	if (trip.status === 'completed') progress = 1;
	else if (trip.status === 'departed' || trip.status === 'in-transit') {
		progress = Math.min(0.999, Math.max(0, (nowMinutes - departure) / span));
	} else progress = 0;

	const lastIndex = stops.length - 1;
	const currentIndex = progress >= 1 ? lastIndex : Math.floor(progress * lastIndex);

	return stops.map((stop, index) => ({
		stop,
		time: clockOf(departure + (span * index) / Math.max(1, lastIndex)),
		state:
			progress >= 1
				? 'completed'
				: index < currentIndex
					? 'completed'
					: index === currentIndex
						? 'current'
						: 'upcoming'
	}));
}

/* ------------------------------------------------------------ trip creation */

/**
 * Validates a draft and reports every double-booking it would cause.
 *
 * A vehicle, a driver, and a conductor can each be in one place at a time, so
 * an overlapping running on the same date is a conflict. `excludeTripId` lets
 * a trip be re-saved without conflicting with itself.
 */
export function findConflicts(draft: TripDraft, excludeTripId?: string): TripConflict[] {
	const [start, end] = windowOf({
		departureTime: draft.departureTime,
		arrivalTime: draft.arrivalTime
	});

	const conflicts: TripConflict[] = [];
	for (const trip of allTrips()) {
		if (trip.id === excludeTripId) continue;
		if (trip.serviceDate !== draft.serviceDate) continue;
		if (trip.status === 'cancelled') continue;

		const [otherStart, otherEnd] = windowOf(trip);
		if (start >= otherEnd || end <= otherStart) continue;

		if (trip.busId === draft.busId) {
			conflicts.push({ kind: 'bus', tripId: trip.id, tripCode: trip.code });
		}
		if (trip.driverId === draft.driverId) {
			conflicts.push({ kind: 'driver', tripId: trip.id, tripCode: trip.code });
		}
		if (trip.conductorId === draft.conductorId) {
			conflicts.push({ kind: 'conductor', tripId: trip.id, tripCode: trip.code });
		}
	}
	return conflicts;
}

/** Field-level checks, run before conflicts so the form marks the right input. */
function validateDraft(draft: TripDraft): TripValidationIssue[] {
	const issues: TripValidationIssue[] = [];

	if (!findRoute(draft.routeId)) {
		issues.push({ field: 'routeId', messageKey: 'ops_trip_error_route' });
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.serviceDate)) {
		issues.push({ field: 'serviceDate', messageKey: 'ops_trip_error_date' });
	}
	if (!findBus(draft.busId)) {
		issues.push({ field: 'busId', messageKey: 'ops_trip_error_bus' });
	}
	if (!findCrewInRole(draft.driverId, 'driver')) {
		issues.push({ field: 'driverId', messageKey: 'ops_trip_error_driver' });
	}
	if (!findCrewInRole(draft.conductorId, 'conductor')) {
		issues.push({ field: 'conductorId', messageKey: 'ops_trip_error_conductor' });
	}
	if (!/^\d{2}:\d{2}$/.test(draft.departureTime)) {
		issues.push({ field: 'departureTime', messageKey: 'ops_trip_error_departure' });
	}
	if (!/^\d{2}:\d{2}$/.test(draft.arrivalTime)) {
		issues.push({ field: 'arrivalTime', messageKey: 'ops_trip_error_arrival' });
	} else if (draft.departureTime === draft.arrivalTime) {
		issues.push({ field: 'arrivalTime', messageKey: 'ops_trip_error_same_time' });
	}

	return issues;
}

export interface CreateTripFailure {
	issues: TripValidationIssue[];
	conflicts: TripConflict[];
}

/** Next free `TRIP-nnn`, so a controller reads a short reference, not a uuid. */
function nextTripCode(): string {
	const used = new Set(allTrips().map((trip) => trip.code));
	for (let n = 1; n < 1000; n++) {
		const code = `TRIP-${String(n).padStart(3, '0')}`;
		if (!used.has(code)) return code;
	}
	return `TRIP-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Schedules a running.
 *
 * The whole point of this call: a controller picks a corridor, a date, a
 * vehicle, and a crew, and those four become one trip. Nothing is written to
 * the vehicle record, so the same vehicle stays free to run somewhere else
 * tomorrow.
 *
 * A created trip is scheduled but not put on sale — offering seats is a
 * separate decision from rostering a running.
 */
export async function createTrip(
	draft: TripDraft
): Promise<ServiceResult<Trip> & { failure?: CreateTripFailure }> {
	const issues = validateDraft(draft);
	let conflicts = issues.length === 0 ? findConflicts(draft) : [];

	if (issues.length > 0 || conflicts.length > 0) {
		return {
			status: 'error',
			error: { code: 'invalid_request', messageKey: 'ops_trip_error_title' },
			failure: { issues, conflicts }
		};
	}

	const route = findRoute(draft.routeId)!;
	const bus = findBus(draft.busId)!;
	const origin = route.stops[0];
	const destination = route.stops[route.stops.length - 1];

	const trip: Trip = {
		id: `trip-${Date.now().toString(36)}`,
		code: nextTripCode(),
		routeId: draft.routeId,
		busId: draft.busId,
		driverId: draft.driverId,
		conductorId: draft.conductorId,
		serviceName: bus.serviceType,
		serviceDate: draft.serviceDate,
		departureTime: draft.departureTime,
		arrivalTime: draft.arrivalTime,
		boardingStopId: origin?.stopId ?? '',
		destinationStopId: destination?.stopId ?? '',
		platform: draft.platform.trim() || undefined,
		status: 'scheduled',
		baseFare: 32000,
		taxes: 2500,
		seatsAvailable: bus.totalSeats,
		sellable: false,
		canonical: false,
		highlights: []
	};

	try {
		const { functions } = requireFirebase();
		const validation = await httpsCallable<
			{ trip: Trip; excludeTripId?: string },
			{ conflicts: TripConflict[] }
		>(functions, 'validateTripAssignment')({ trip });
		conflicts = validation.data.conflicts;
		if (conflicts.length) {
			return {
				status: 'error',
				error: { code: 'invalid_request', messageKey: 'ops_trip_error_title' },
				failure: { issues: [], conflicts }
			};
		}
		await httpsCallable<{ trip: Trip }, { trip: Trip }>(functions, 'saveTrip')({ trip });
		tripStore.init();
		tripStore.add(trip);
		return { status: 'ok', data: trip };
	} catch (error) {
		return { status: 'error', error: mapFirebaseError(error, 'ops_trip_error_title'), failure: { issues: [], conflicts } };
	}
}

/* ---------------------------------------------------------------- summaries */

/** One count per status, for the Operations dashboard. */
export function statusCounts(list: Trip[]): TripStatusCounts {
	const counts = Object.fromEntries(tripStatuses.map((status) => [status, 0])) as Record<
		TripStatus,
		number
	>;
	for (const trip of list) counts[trip.status] += 1;
	return { ...counts, total: list.length };
}

/* ------------------------------------------------------- the board filter */

/**
 * What the Operations board can be narrowed to.
 *
 * `active` is not a trip status but the question a controller actually asks —
 * what is out on the road right now — so it is offered alongside the real
 * statuses rather than making someone select three of them.
 */
export type BoardFilter = 'all' | 'active' | TripStatus;

/** Whether a running is out on the road at this moment. */
function isActiveStatus(status: TripStatus): boolean {
	return status === 'boarding' || status === 'departed' || status === 'in-transit';
}

export function matchesBoardFilter(trip: Trip, filter: BoardFilter): boolean {
	if (filter === 'all') return true;
	if (filter === 'active') return isActiveStatus(trip.status);
	return trip.status === filter;
}

/** Whether the board is showing one day or the whole schedule. */
export type BoardScope = 'today' | 'all';

export function matchesBoardScope(trip: Trip, scope: BoardScope): boolean {
	return scope === 'all' || trip.serviceDate === todayIso();
}

/**
 * Reads a board filter out of a URL, rejecting anything unrecognised.
 *
 * The dashboard links straight into the board with these, so a hand-edited or
 * stale link has to fall back rather than render an empty page.
 */
export function parseBoardFilter(value: string | null): BoardFilter {
	if (value === 'active' || value === 'all') return value;
	return tripStatuses.includes(value as TripStatus) ? (value as TripStatus) : 'all';
}

export function parseBoardScope(value: string | null): BoardScope {
	return value === 'today' ? 'today' : 'all';
}
