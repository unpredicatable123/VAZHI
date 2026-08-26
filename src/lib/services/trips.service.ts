import { findBus, listBuses } from './fleet.service';
import { findCrew, findCrewInRole } from './crew.service';
import { routeFixtures } from '$lib/mocks/routes.mock';
import { tripFixtures } from '$lib/mocks/trips.mock';
import { trips as tripStore } from '$stores/trips.svelte';
import type { ServiceResult } from '$types/common';
import type {
	Bus,
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

/**
 * Trips — the centre of the operational model.
 */

/* ----------------------------------------------------------------- routes */

let loadedRoutes: TransitRoute[] = [];
let loadedFirestoreTrips: Trip[] = [];

export async function syncTrips(): Promise<Trip[]> {
	try {
		const { db } = requireFirebase();
		const snapshot = await getDocs(collection(db, 'trips'));
		loadedFirestoreTrips = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as Trip);
		return allTrips();
	} catch {
		return allTrips();
	}
}

export function findRoute(routeId: string): TransitRoute | undefined {
	return loadedRoutes.find((route) => route.id === routeId) ?? routeFixtures.find((route) => route.id === routeId);
}

export async function listRoutes(): Promise<ServiceResult<TransitRoute[]>> {
	try {
		const { db } = requireFirebase();
		const snapshot = await getDocs(collection(db, 'routes'));
		const fetched = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as TransitRoute);
		loadedRoutes = fetched.length > 0 ? fetched : routeFixtures;
		return { status: 'ok', data: loadedRoutes };
	} catch {
		loadedRoutes = routeFixtures;
		return { status: 'ok', data: routeFixtures };
	}
}

/* ------------------------------------------------------------ time helpers */

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

export function durationOf(departure: string, arrival: string): number {
	const start = minutesOf(departure);
	const end = minutesOf(arrival);
	return end > start ? end - start : end + 1440 - start;
}

function windowOf(trip: Pick<Trip, 'departureTime' | 'arrivalTime'>): [number, number] {
	const start = minutesOf(trip.departureTime);
	return [start, start + durationOf(trip.departureTime, trip.arrivalTime)];
}

/* ------------------------------------------------------- canonical statuses */

function resolveStatus(trip: Trip): TripStatus {
	tripStore.init();
	const override = tripStore.overrideFor(trip.id);
	return override ?? trip.status;
}

export function allTrips(_now: Date = new Date()): Trip[] {
	tripStore.init();
	const map = new Map<string, Trip>();
	for (const trip of tripFixtures()) {
		map.set(trip.id, trip);
	}
	for (const trip of tripStore.all) {
		map.set(trip.id, trip);
	}
	for (const trip of loadedFirestoreTrips) {
		map.set(trip.id, trip);
	}
	return Array.from(map.values()).map((trip) => ({ ...trip, status: resolveStatus(trip) }));
}

/* ------------------------------------------------------------------ lookups */

function findTrip(tripId: string, now: Date = new Date()): Trip | undefined {
	return allTrips(now).find((trip) => trip.id === tripId);
}

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

function stopOnRoute(route: TransitRoute, stopId: string): RouteStop | undefined {
	return route.stops.find((stop) => stop.stopId === stopId);
}

export async function listTripViews(): Promise<ServiceResult<TripView[]>> {
	try {
		await Promise.all([listBuses(), listRoutes()]);
		const { db } = requireFirebase();
		const snapshot = await getDocs(collection(db, 'trips'));
		loadedFirestoreTrips = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as Trip);
		const views = loadedFirestoreTrips
			.map((entry) => viewFor(entry))
			.filter((view): view is TripView => view !== null)
			.sort(byServiceOrder);

		// Include local created trips if not already present
		const existingIds = new Set(views.map((v) => v.trip.id));
		const localViews = allTrips()
			.filter((t) => !existingIds.has(t.id))
			.map((t) => viewFor(t))
			.filter((v): v is TripView => v !== null);

		return { status: 'ok', data: [...views, ...localViews].sort(byServiceOrder) };
	} catch {
		const localViews = allTrips()
			.map((t) => viewFor(t))
			.filter((v): v is TripView => v !== null)
			.sort(byServiceOrder);
		return { status: 'ok', data: localViews };
	}
}

function byServiceOrder(a: TripView, b: TripView): number {
	if (a.trip.serviceDate !== b.trip.serviceDate) {
		return a.trip.serviceDate.localeCompare(b.trip.serviceDate);
	}
	return a.trip.departureTime.localeCompare(b.trip.departureTime);
}

/* ------------------------------------------------------- crew assignments */

export function assignmentFor(
	crewId: string,
	role: CrewRole,
	now: Date = new Date()
): Trip | undefined {
	const member = findCrew(crewId);
	const id = member?.id ?? crewId.trim().toLocaleUpperCase();
	const today = todayIso();

	const held = allTrips(now).filter((trip) => {
		const holder = (role === 'driver' ? trip.driverId : trip.conductorId) ?? '';
		return holder.toLocaleUpperCase() === id && trip.status !== 'cancelled';
	});

	const todays = held
		.filter((trip) => trip.serviceDate === today)
		.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
	if (todays.length > 0) {
		return todays.find((trip) => trip.status !== 'completed') ?? todays[todays.length - 1];
	}

	return held
		.filter((trip) => trip.serviceDate >= today)
		.sort((a, b) => a.serviceDate.localeCompare(b.serviceDate))[0];
}

export async function getAssignedTrip(
	crewId: string,
	role: CrewRole
): Promise<ServiceResult<TripView>> {
	await Promise.all([listBuses(), listRoutes()]);

	try {
		const { functions } = requireFirebase();
		const response = await httpsCallable<Record<string, never>, { trip: Trip }>(functions, 'getAssignedTrip')({});
		const view = viewFor(response.data.trip);
		if (view) return { status: 'ok', data: view };
	} catch {
		// Fallback for local state / offline mode
	}

	const localTrip = assignmentFor(crewId, role);
	if (localTrip) {
		const view = viewFor(localTrip);
		if (view) return { status: 'ok', data: view };
	}

	return { status: 'error', error: { code: 'not_found', messageKey: 'assignment_none_body' } };
}

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

export function nextStatus(status: TripStatus): TripStatus | null {
	const index = tripStatusSequence.indexOf(status);
	if (index === -1 || index === tripStatusSequence.length - 1) return null;
	return tripStatusSequence[index + 1];
}

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
	} catch {
		tripStore.setStatus(tripId, to);
		return { status: 'ok', data: { ...trip, status: to } };
	}
}

/* --------------------------------------------------------- stop progression */

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
		if (trip.driverId.toUpperCase() === draft.driverId.toUpperCase()) {
			conflicts.push({ kind: 'driver', tripId: trip.id, tripCode: trip.code });
		}
		if (trip.conductorId.toUpperCase() === draft.conductorId.toUpperCase()) {
			conflicts.push({ kind: 'conductor', tripId: trip.id, tripCode: trip.code });
		}
	}
	return conflicts;
}

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

function nextTripCode(): string {
	const used = new Set(allTrips().map((trip) => trip.code));
	for (let n = 1; n < 1000; n++) {
		const code = `TRIP-${String(n).padStart(3, '0')}`;
		if (!used.has(code)) return code;
	}
	return `TRIP-${Date.now().toString(36).toUpperCase()}`;
}

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
		sellable: true,
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
		loadedFirestoreTrips = [...loadedFirestoreTrips.filter((t) => t.id !== trip.id), trip];
		return { status: 'ok', data: trip };
	} catch {
		tripStore.init();
		tripStore.add(trip);
		loadedFirestoreTrips = [...loadedFirestoreTrips.filter((t) => t.id !== trip.id), trip];
		return { status: 'ok', data: trip };
	}
}

/* ---------------------------------------------------------------- summaries */

export function statusCounts(list: Trip[]): TripStatusCounts {
	const counts = Object.fromEntries(tripStatuses.map((status) => [status, 0])) as Record<
		TripStatus,
		number
	>;
	for (const trip of list) counts[trip.status] += 1;
	return { ...counts, total: list.length };
}

/* ------------------------------------------------------- the board filter */

export type BoardFilter = 'all' | 'active' | TripStatus;

function isActiveStatus(status: TripStatus): boolean {
	return status === 'boarding' || status === 'departed' || status === 'in-transit';
}

export function matchesBoardFilter(trip: Trip, filter: BoardFilter): boolean {
	if (filter === 'all') return true;
	if (filter === 'active') return isActiveStatus(trip.status);
	return trip.status === filter;
}

export type BoardScope = 'today' | 'all';

export function matchesBoardScope(trip: Trip, scope: BoardScope): boolean {
	return scope === 'all' || trip.serviceDate === todayIso();
}

export function parseBoardFilter(value: string | null): BoardFilter {
	if (value === 'active' || value === 'all') return value;
	return tripStatuses.includes(value as TripStatus) ? (value as TripStatus) : 'all';
}

export function parseBoardScope(value: string | null): BoardScope {
	return value === 'today' ? 'today' : 'all';
}
