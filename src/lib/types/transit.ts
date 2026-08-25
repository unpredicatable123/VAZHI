import type { ClockTime, IsoDate, Paise } from './common';

/**
 * Transit domain model.
 *
 * Privacy note: nothing in this file may ever describe an individual
 * passenger. Occupancy is expressed only as counts and area-level signals.
 */

export type TransitStopKind = 'bus_stand' | 'bypass' | 'terminal' | 'waypoint';

/**
 * A district, used to group the stops a traveller chooses between.
 *
 * Proper nouns carry their own Tamil form rather than a message key: a place
 * name is data belonging to the stop, not interface copy, and keeping both
 * spellings on the record means a stop can never be half-translated. Every
 * label *around* them — headings, placeholders, empty states — goes through
 * Paraglide as usual.
 */
export interface District {
	id: string;
	/** Canonical English name. */
	name: string;
	/** Tamil form of the same proper noun. */
	nameTa: string;
}

export interface TransitStop {
	id: string;
	/** Canonical English name. */
	name: string;
	/** Tamil form of the same proper noun. */
	nameTa: string;
	/** The district this stop is grouped under. */
	districtId: District['id'];
	kind: TransitStopKind;
	/** [longitude, latitude] — GeoJSON order. */
	coordinates: [number, number];
	accessibleBoarding: boolean;
}

/** Stops of one district, ready to render as a labelled group. */
export interface DistrictStopGroup {
	district: District;
	stops: TransitStop[];
}

export type SeatLayout = '2+2' | '2+1';
export type CabinClass = 'ultra_deluxe' | 'deluxe' | 'sleeper' | 'express';

export interface BusAmenities {
	airConditioned: boolean;
	seatLayout: SeatLayout;
	chargingPoints: boolean;
	restStop: boolean;
}

type BusHighlight = 'fast' | 'recommended';

/**
 * One dated service offer, as the Explorer and the booking flow see it.
 *
 * A flattened *projection* of a trip: the vehicle, the corridor, the times, and
 * the fare on one record so a result card renders without four lookups. The
 * authority for all of it is the `Trip` named by `tripId` — see
 * `types/fleet.ts`. Nothing here should be treated as a property of the bus:
 * the same vehicle carries a different origin, destination, and time on its
 * next trip.
 */
export interface BusResult {
	/** Same value as `tripId`: a service offer is one running of a route. */
	id: string;
	/** The trip this offer sells seats on. Carried onto the booking. */
	tripId: string;
	operator: string;
	serviceName: string;
	cabinClass: CabinClass;
	/** Registration plate, rendered in the mono data face. */
	vehicleNumber: string;
	amenities: BusAmenities;

	originStopId: string;
	destinationStopId: string;
	departure: ClockTime;
	arrival: ClockTime;
	/** Whole minutes, formatted for display by `formatDuration`. */
	durationMinutes: number;
	distanceKm: number;

	boardingPlatform: string;
	accessibleBoardingPoint: boolean;

	/** Per-passenger fare components. */
	baseFare: Paise;
	taxes: Paise;

	seatsAvailable: number;
	highlights: BusHighlight[];
	routeId: string;
	/** True for the canonical journey defined in the build specification. */
	canonical: boolean;
}

export interface JourneySearchCriteria {
	originStopId: string;
	destinationStopId: string;
	date: IsoDate;
	/** 1–6. Drives one passenger form per seat in a later phase. */
	passengers: number;
	accessibleTravelMode: boolean;
}

/** The on/off facets. Each is independent of the others. */
export type BusFilterKey = 'time' | 'price' | 'ac' | 'access';

/**
 * Coach type is a choice, not a switch.
 *
 * It used to be a single "Seater" toggle that excluded sleepers, which meant
 * there was no way to ask *for* a sleeper at all — and once sleeper services
 * became bookable that was a hole rather than a simplification. Three named
 * states say what you get, and "all" is a real answer rather than the absence
 * of one.
 */
export type CoachFilter = 'all' | 'seater' | 'sleeper';

export interface BusFilters extends Record<BusFilterKey, boolean> {
	coach: CoachFilter;
}

export interface BusSearchResponse {
	criteria: JourneySearchCriteria;
	results: BusResult[];
	/** Total matching the criteria before client-side filter chips apply. */
	totalCount: number;
}
