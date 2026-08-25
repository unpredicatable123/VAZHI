import type { ClockTime, IsoDate, Paise } from './common';
import type { BusAmenities, CabinClass, SeatLayout } from './transit';

/**
 * Fleet, route, trip, and crew model — the operational core of VAZHI.
 *
 * THE CENTRAL RULE OF THIS FILE
 * ----------------------------
 * A bus is NOT a route. A vehicle is a vehicle; a route is a corridor; a trip
 * is one dated, timed running of a route by a specific vehicle with a specific
 * crew. Nothing here may ever put a permanent origin or destination on a `Bus`.
 *
 *     Bus ──┐
 *     Route ┼──▶ Trip ──▶ Bookings
 *     Crew ─┘
 *
 * The same registration plate therefore runs Salem → Chennai on one date and
 * Salem → Bangalore on another, because the corridor lives on the trip.
 *
 * PRIVACY: crew records carry an operational duty ID, a roster name, a depot,
 * and a duty status. There is deliberately no field for a phone number, home
 * address, date of birth, licence number, government ID, or any medical
 * detail, so no screen built on this model can leak one. Passenger identity
 * never appears here at all — a trip knows how many seats are sold, never who
 * holds them.
 */

/* ---------------------------------------------------------------- vehicles */

/**
 * A vehicle. Registration, class, and capacity only.
 *
 * There is deliberately no `routeId`, `originStopId`, or `departure` on this
 * type, and adding one would break the model: where a bus goes is a property
 * of the trip it is assigned to, never of the bus.
 */
export interface Bus {
	id: string;
	status?: 'active' | 'maintenance' | 'retired';
	/** Registration plate, rendered in the mono data face. */
	registrationNumber: string;
	/** Operating corporation or private operator. */
	operator: string;
	/** Human label for the vehicle class, e.g. "SETC Ultra Deluxe". */
	serviceType: string;
	cabinClass: CabinClass;
	seatLayout: SeatLayout;
	totalSeats: number;
	amenities: BusAmenities;
	/** Whether the vehicle has a step-free boarding point fitted. */
	accessibleBoardingPoint: boolean;
}

/* ------------------------------------------------------------------ routes */

export type RouteStopRole = 'origin' | 'intermediate' | 'destination';

/**
 * One stop in the running order of a route.
 *
 * Proper nouns carry their own Tamil form, the convention `TransitStop`
 * already follows: a place name is data belonging to the stop, not interface
 * copy. `stopId` points at a `TransitStop` when the stop is one a traveller
 * can search from; intermediate timing points carry their own name and need no
 * bookable stop record.
 */
export interface RouteStop {
	stopId: string;
	name: string;
	nameTa: string;
	role: RouteStopRole;
	/**
	 * [longitude, latitude] — GeoJSON order.
	 *
	 * Held on the stop so a corridor can be drawn on a map without a bundled
	 * geometry file. Only two corridors ship a hand-drawn polyline; every other
	 * route renders from these points, which is what lets the map follow the
	 * journey a traveller actually searched for.
	 */
	coordinates: [number, number];
}

/** A corridor, in running order. Carries no vehicle, date, time, or crew. */
export interface TransitRoute {
	id: string;
	/** Canonical English name, e.g. "Salem → Chennai". */
	name: string;
	nameTa: string;
	/** Ordered: origin first, destination last. */
	stops: RouteStop[];
	distanceKm: number;
	/** Bundled geometry key, when a map exists for this corridor. */
	geometryId?: string;
}

/* -------------------------------------------------------------------- crew */

export type CrewRole = 'driver' | 'conductor';

/** Duty state. Mock operational states, not employment records. */
export type CrewStatus = 'available' | 'assigned' | 'on-trip' | 'off-duty';

/** Duty statuses in the order they are listed and counted. */
export const crewStatuses: CrewStatus[] = ['available', 'assigned', 'on-trip', 'off-duty'];

/**
 * A crew member.
 *
 * PRIVACY: duty ID, roster name, depot, and duty status. Nothing else. A depot
 * is a workplace, not a home address. No contact detail, licence number, or
 * identity document has a field here, so the Operations screens cannot show
 * one even by accident.
 */
export interface CrewMember {
	/** Duty ID, e.g. "DRV-014" or "CON-023". Also the sign-in identifier. */
	id: string;
	role: CrewRole;
	/** Name as printed on the depot roster. */
	name: string;
	/** Depot the crew member books on and off at. */
	depot: string;
	status: CrewStatus;
	retired?: boolean;
	/** Earlier identifiers that still resolve to this crew member. */
	aliases: string[];
}

/* ------------------------------------------------------------------- trips */

/**
 * Lifecycle of one running. `scheduled` through `completed` is the ordinary
 * path; `cancelled` can be reached from any state before completion.
 */
export type TripStatus =
	| 'scheduled'
	| 'boarding'
	| 'departed'
	| 'in-transit'
	| 'completed'
	| 'cancelled';

/** Statuses in running order, for progress rendering and transition checks. */
export const tripStatusSequence: TripStatus[] = [
	'scheduled',
	'boarding',
	'departed',
	'in-transit',
	'completed'
];

/** Every status, in the order the Operations dashboard lists them. */
export const tripStatuses: TripStatus[] = [...tripStatusSequence, 'cancelled'];

/**
 * One dated running of a route.
 *
 * This is the record that joins a vehicle, a corridor, a calendar date, a
 * timetable, and a crew — and the record a booking references. Everything a
 * traveller, conductor, driver, or controller sees about a journey is derived
 * from here.
 */
export interface Trip {
	id: string;
	/** Short operational reference shown to people, e.g. "TRIP-001". */
	code: string;

	routeId: TransitRoute['id'];
	busId: Bus['id'];
	driverId: CrewMember['id'];
	conductorId: CrewMember['id'];

	/** Public service name, e.g. "SETC Ultra Deluxe". */
	serviceName: string;

	serviceDate: IsoDate;
	departureTime: ClockTime;
	arrivalTime: ClockTime;

	/** Where this running actually starts and ends on the corridor. */
	boardingStopId: string;
	destinationStopId: string;

	/** Boarding platform at the origin stand, e.g. "04". */
	platform?: string;

	status: TripStatus;

	/** Per-passenger fare components for this running. */
	baseFare: Paise;
	taxes: Paise;
	seatsAvailable: number;

	/** Overrides the route distance when the running is short-worked. */
	distanceKm?: number;

	/**
	 * Whether this running appears in the traveller-facing timetable. A
	 * cancelled or already-completed trip is never sellable.
	 */
	sellable: boolean;
	/** The canonical demonstration journey from the build specification. */
	canonical: boolean;
	highlights: Array<'fast' | 'recommended'>;
}

/**
 * A trip resolved against the fleet, route, and crew records.
 *
 * Assembled by `trips.service` so a page renders one object instead of chasing
 * four lookups, and so every role sees the same joined facts.
 */
export interface TripView {
	trip: Trip;
	bus: Bus;
	route: TransitRoute;
	/** Absent only if a fixture references a crew id that no longer exists. */
	driver?: CrewMember;
	conductor?: CrewMember;
	/** Resolved from the running order of the route. */
	boardingStop?: RouteStop;
	destinationStop?: RouteStop;
	durationMinutes: number;
	distanceKm: number;
}

/* -------------------------------------------------- trip creation and edit */

/** What Operations supplies to schedule a running. */
export interface TripDraft {
	routeId: string;
	serviceDate: IsoDate;
	busId: string;
	driverId: string;
	conductorId: string;
	departureTime: ClockTime;
	arrivalTime: ClockTime;
	platform: string;
}

export type TripConflictKind = 'bus' | 'driver' | 'conductor';

/**
 * A double-booking found while validating an assignment.
 *
 * `tripCode` names the trip already holding the resource, so a controller can
 * go and look at it rather than guessing.
 */
export interface TripConflict {
	kind: TripConflictKind;
	tripId: string;
	tripCode: string;
}

export type TripFieldError =
	| 'routeId'
	| 'serviceDate'
	| 'busId'
	| 'driverId'
	| 'conductorId'
	| 'departureTime'
	| 'arrivalTime';

export interface TripValidationIssue {
	field: TripFieldError;
	/** Message key resolved through Paraglide at render time. */
	messageKey: string;
}

/* ------------------------------------------------------- progress on a run */

export type StopProgressState = 'completed' | 'current' | 'upcoming';

/**
 * A stop with simulated progress attached.
 *
 * SIMULATION. Derived from the trip status and the scheduled times, in the
 * browser. No GPS, vehicle telemetry feed, or transit API is involved, and the
 * driver screens say so on the page.
 */
export interface TripStopProgress {
	stop: RouteStop;
	state: StopProgressState;
	/** Scheduled time at this stop, interpolated across the running. */
	time: ClockTime;
}

/** Counts for the Operations dashboard: one per status, plus a total. */
export type TripStatusCounts = Record<TripStatus, number> & { total: number };
