import type { ClockTime, IsoDate } from './common';
import type { Pnr, SeatId } from './booking';
import type { TripStatus as FleetTripStatus } from './fleet';

/**
 * Conductor operations model.
 *
 * PRIVACY BOUNDARY. A conductor needs to know which seat a booking holds and
 * whether that booking has boarded — nothing more. There is deliberately no
 * name, age, gender, phone, email, photo, or government ID field anywhere in
 * this file, so the boarding screens cannot expose passenger identity even by
 * accident. The same rule the traveller side follows applies here.
 */

export type TicketStatus = 'valid' | 'cancelled';

export type BoardingStatus = 'pending' | 'boarded';

/**
 * One booked seat on the assigned trip, as the conductor sees it.
 *
 * `pnr` is a booking reference, not a person. `passengerCount` is a count on
 * the parent booking, used only to show group size at the door.
 */
export interface ManifestEntry {
	bookingId?: string;
	pnr: Pnr;
	seatId: SeatId;
	/** Minimal booking snapshot required at the boarding door. */
	ticketStatus: TicketStatus;
	boardingStatus: BoardingStatus;
	/** Set when the seat was marked boarded during this session. */
	boardedAt?: string;
	/** Seats booked together under the same reference. */
	groupSize: number;
}

/** Operational seat state on the conductor's coach view. */
export type SeatBoardingState = 'available' | 'pending' | 'boarded' | 'cancelled';

/**
 * The trip a conductor is rostered onto. Public service data only.
 *
 * A *projection* of a `Trip` (see `types/fleet.ts`) with the vehicle and
 * corridor flattened onto it for display. The conductor does not choose a bus
 * or a route: Operations assigns them a trip, and everything on this record is
 * read from that trip. `tripId` and `tripCode` name it, so the conductor, the
 * driver, and the controller are demonstrably looking at the same running.
 */
export interface ConductorAssignment {
	conductorId: string;
	/** The trip this assignment projects. */
	tripId: string;
	/** Short operational reference, e.g. "TRIP-001". */
	tripCode: string;
	/** Canonical status stored on the shared Trip record. */
	status: FleetTripStatus;
	busId: string;
	serviceName: string;
	vehicleNumber: string;
	/** Termini of this running, for the map and for stop lookups. */
	originStopId: string;
	destinationStopId: string;
	/** Proper nouns carry both spellings, so a stop is never half-translated. */
	originName: string;
	originNameTa: string;
	destinationName: string;
	destinationNameTa: string;
	departure: ClockTime;
	arrival: ClockTime;
	durationMinutes: number;
	distanceKm: number;
	boardingPlatform: string;
	travelDate: IsoDate;
	/** Total seats on the coach. */
	capacity: number;
	/** Seat layout of the vehicle working this trip, e.g. "2+2". */
	seatLayout: string;
}

export type TripPhase = 'boarding' | 'departed' | 'arrived';

export interface TripStatus {
	phase: TripPhase;
	/** Simulated in the browser, like the traveller-side tracking screen. */
	simulated: true;
}

export interface BoardingTotals {
	booked: number;
	boarded: number;
	pending: number;
	cancelled: number;
	available: number;
}

export type VerificationOutcome =
	| 'valid'
	| 'already_boarded'
	| 'cancelled'
	| 'not_found'
	| 'wrong_trip';

export interface VerificationResult {
	outcome: VerificationOutcome;
	/** Present for every outcome except `not_found`. */
	entry?: ManifestEntry;
	/** Every seat under the same reference, so a group boards together. */
	groupEntries?: ManifestEntry[];
}
