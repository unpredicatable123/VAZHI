import type { ClockTime, IsoDate, Paise } from './common';
import type { SeatLayout } from './transit';

/**
 * Booking domain model.
 *
 * PRIVACY BOUNDARY
 * ----------------
 * `PassengerDetails` is the only type in the codebase that carries personal
 * information. It exists exclusively inside the in-memory passenger store.
 * It must never be:
 *   - written to localStorage, sessionStorage, IndexedDB, or cookies
 *   - encoded into a URL, query string, or route parameter
 *   - placed in a `*.mock.ts` fixture
 *   - logged, or sent to any analytics sink
 *   - copied into `BookingDraft`, which is the shared non-identifying state
 *   - rendered through `{@html}`
 *
 * Everything else in this file is non-identifying: seat geometry, area-level
 * comfort signals, and money.
 */

/** e.g. "5C" — row number followed by column letter. */
export type SeatId = string;

/** A and D sit by the windows, B and C beside the aisle. */
export type SeatColumn = 'A' | 'B' | 'C' | 'D';

type SeatAvailability = 'available' | 'unavailable';

/**
 * Area-level comfort signals.
 *
 * These describe a *region of the deck*, never an occupant. `womenNearby` in
 * particular is an anonymous aggregate and is only ever attached to seats a
 * traveller can actually select, so it can never imply who is sitting in a
 * taken seat.
 */
interface SeatSignals {
	window: boolean;
	aisle: boolean;
	accessible: boolean;
	nearEntrance: boolean;
	quieter: boolean;
	womenNearby: boolean;
}

/** Which tier a sleeper berth sits on. Absent on a seater deck. */
export type BerthLevel = 'lower' | 'upper';

export interface Seat {
	id: SeatId;
	row: number;
	column: SeatColumn;
	availability: SeatAvailability;
	signals: SeatSignals;
	/**
	 * Set only on a sleeper deck. A sleeper is two decks of berths stacked in
	 * the same body, so a berth needs to say which one it is on — the plan
	 * cannot show that by position the way a seater deck shows a window seat.
	 */
	berth?: BerthLevel;
}

/**
 * What kind of plan a vehicle needs.
 *
 * A seater is one floor read from above. A sleeper is two tiers of berths, so
 * it is drawn as two plans side by side and cannot share the seater layout.
 */
export type DeckKind = 'seater' | 'sleeper';

export interface SeatDeck {
	busId: string;
	kind: DeckKind;
	layout: SeatLayout;
	rows: number;
	/** Columns on the left of the aisle, then the right. */
	leftColumns: SeatColumn[];
	rightColumns: SeatColumn[];
	seats: Seat[];
}

/** Visual state a seat renders in. Derived, never stored. */
export type SeatState = 'available' | 'unavailable' | 'selected' | 'recommended';

export type SeatTypePreference = 'any' | 'window' | 'aisle';

export type AssistanceKind = 'mobility' | 'visual' | 'hearing';

/** Comfort preferences steer the recommendation engine. Non-identifying. */
export interface ComfortPreferences {
	seatType: SeatTypePreference;
	assistance: AssistanceKind[];
}

export const defaultComfortPreferences: ComfortPreferences = {
	seatType: 'any',
	assistance: []
};

export type ConcessionCategory = 'none' | 'senior' | 'student' | 'pwd';

export type AccessibilityRequirement =
	| 'none'
	| 'wheelchair'
	| 'mobility'
	| 'visual'
	| 'hearing';

export type Gender = 'female' | 'male' | 'other';

/**
 * PII. Memory-only — see the privacy boundary note at the top of this file.
 *
 * Deliberately excluded: phone, email, address, Aadhaar or any government ID,
 * photo, and medical information. None of those are collected anywhere.
 */
export interface PassengerDetails {
	fullName: string;
	/** 1–120, validated before the draft can advance. */
	age: number | null;
	gender: Gender | '';
	concession: ConcessionCategory;
	accessibility: AccessibilityRequirement;
}

export function createEmptyPassenger(): PassengerDetails {
	return {
		fullName: '',
		age: null,
		gender: '',
		concession: 'none',
		accessibility: 'none'
	};
}

export type PassengerFieldError = 'fullName' | 'age' | 'gender';

export interface PassengerValidationIssue {
	/** Index of the passenger form, 0-based. */
	passengerIndex: number;
	field: PassengerFieldError;
	/** Message key resolved through Paraglide at render time. */
	messageKey: string;
}

/**
 * Non-identifying projection of a passenger, safe to render on Review and to
 * pass between components. Carries no name, age, or gender.
 */
export interface PassengerSummary {
	passengerIndex: number;
	seatId: SeatId;
	complete: boolean;
	concession: ConcessionCategory;
	accessibility: AccessibilityRequirement;
}

export interface FareBreakdown {
	passengerCount: number;
	/** Per-passenger components, from the canonical bus record. */
	baseFarePerPassenger: Paise;
	taxesPerPassenger: Paise;
	baseFare: Paise;
	taxes: Paise;
	/**
	 * Concessions are recorded as a request and verified with valid ID at
	 * boarding, so nothing is deducted at booking time. Kept in the breakdown
	 * so the line renders when a concession has been requested.
	 */
	concessionDiscount: Paise;
	concessionRequested: boolean;
	total: Paise;
}

/* -------------------------------------------------------------------------
   Phase 3: payment, confirmation, tickets, trips, tracking, refunds.

   Every type below is deliberately free of personal data. `Booking` in
   particular has no name, age, or gender field, so a confirmed booking cannot
   structurally carry passenger identity even by accident.
   ------------------------------------------------------------------------- */

/**
 * How a payment was made, as reported by Razorpay after the fact.
 *
 * VAZHI does not ask a traveller to choose: the gateway's own window offers all
 * of these, so choosing beforehand constrained nothing and only added a step.
 * `razorpay` is the fallback for when the lookup could not be made — the
 * payment is still verified, it is just unattributed.
 */
type PaymentMethod =
	| 'upi'
	| 'card'
	| 'netbanking'
	| 'wallet'
	| 'emi'
	| 'paylater'
	| 'razorpay';

export type PaymentStatus = 'idle' | 'processing' | 'succeeded' | 'failed';

type BookingStatus = 'confirmed' | 'completed' | 'cancelled';

/** Booking reference shown to the traveller, e.g. "VZ-4E2K19". */
export type Pnr = string;

export interface Booking {
	pnr: Pnr;
	status: BookingStatus;
	/**
	 * The trip this booking is on — the corridor, date, vehicle, and crew all
	 * hang off it. This is the join a conductor uses to find the passengers for
	 * the running they are working.
	 */
	tripId: string;
	/** Vehicle running the trip. Kept for the seat deck lookup. */
	busId: string;
	/** Denormalised journey facts so a ticket renders without extra lookups. */
	serviceName: string;
	vehicleNumber: string;
	originStopId: string;
	destinationStopId: string;
	originName: string;
	destinationName: string;
	departure: ClockTime;
	arrival: ClockTime;
	durationMinutes: number;
	distanceKm: number;
	boardingPlatform: string;
	travelDate: IsoDate;
	/** Seats only — never who is sitting in them. */
	seatIds: SeatId[];
	/** A count, not a roster. */
	passengerCount: number;
	fare: FareBreakdown;
	paymentMethod: PaymentMethod;
	/** ISO timestamp of the payment. */
	bookedAt: string;
	/**
	 * Written by `verifyPayment` once a Razorpay signature has been checked
	 * against the key secret. A booking cannot exist without it, so `paid` is
	 * the only value in practice — the field is here to be read, not trusted
	 * from the client, which has no way to write it.
	 */
	paymentStatus?: 'paid';
	/** Razorpay order this booking was paid against. Traceable in their dashboard. */
	razorpayOrderId?: string;
	/** Razorpay payment id — the reference a traveller quotes to support. */
	razorpayPaymentId?: string;
	/**
	 * Written by the cancel function once a booking is cancelled. Absent on a
	 * booking that still stands, which is what the ledger reads to decide
	 * whether a refund line exists.
	 */
	refund?: BookingRefund;
}

/** Refund state recorded on a cancelled booking. */
interface BookingRefund {
	status: string;
	/** ISO timestamp. Firestore returns a Timestamp; the service normalises it. */
	requestedAt?: string;
}

/* ------------------------------------------------------ transaction ledger */

/**
 * One line in a traveller's transaction history.
 *
 * Derived from booking documents, never stored. A booking produces a payment
 * line; cancelling it produces a refund line against the same reference, so the
 * two sit together in one chronological list the way a bank statement does.
 *
 * PRIVACY: a ledger line carries the journey and the money, never a passenger.
 * The names on a booking stay on the booking.
 */
type LedgerKind = 'payment' | 'refund';

type LedgerStatus = 'paid' | 'refund_pending' | 'refunded';

export interface LedgerEntry {
	/** Stable per line, e.g. `VZ-1A0830-payment`. Used as the keyed-each key. */
	id: string;
	kind: LedgerKind;
	pnr: Pnr;
	/** ISO timestamp the line is sorted by. */
	at: string;
	/** Always positive. The sign is a property of `kind`, not of the number. */
	amount: Paise;
	status: LedgerStatus;
	/** Absent on a refund line: money comes back the way it went out. */
	method?: PaymentMethod;
	/** Enough journey context to recognise the line without opening the ticket. */
	serviceName: string;
	originName: string;
	destinationName: string;
	travelDate: IsoDate;
	seatIds: SeatId[];
}

/** Totals for the ledger summary. */
export interface LedgerTotals {
	paid: Paise;
	refunded: Paise;
	/** What a traveller has actually spent: paid less refunds returned. */
	net: Paise;
	bookings: number;
}

export interface RefundBreakdown {
	totalPaid: Paise;
	cancellationFee: Paise;
	estimatedRefund: Paise;
}

type RefundStepState = 'done' | 'active' | 'pending';

export interface RefundStep {
	id: string;
	/** Message key resolved through Paraglide at render time. */
	titleKey: string;
	state: RefundStepState;
	/** Already-localised detail line, or null when there is nothing to add. */
	detail?: string;
}

export interface RefundRecord {
	refundId: string;
	pnr: Pnr;
	breakdown: RefundBreakdown;
	requestedAt: string;
	expectedBy: IsoDate;
	steps: RefundStep[];
}

export type TripFilter = 'upcoming' | 'completed' | 'cancelled';

type DelayState = 'on_time' | 'delayed';

export interface TrackingStop {
	stopId: string;
	name: string;
	/** Scheduled time at this stop. */
	time: ClockTime;
	state: 'departed' | 'next' | 'upcoming';
}

/**
 * A simulated tracking snapshot.
 *
 * Positions are interpolated from bundled route geometry on the client. No
 * vehicle telemetry, government feed, or transit API is involved.
 */
export interface TrackingSnapshot {
	pnr: Pnr;
	/** 0–1 along the route. */
	progress: number;
	distanceCoveredKm: number;
	distanceRemainingKm: number;
	speedKmh: number;
	etaArrival: ClockTime;
	delay: DelayState;
	delayMinutes: number;
	position: [number, number];
	stops: TrackingStop[];
	/** Always true in this build: the data is generated in the browser. */
	simulated: true;
}

export type BoardingReminderLead = 'off' | '15' | '30' | '60';

/** Device notification settings. Non-identifying, safe to persist. */
export interface NotificationPreferences {
	pushEnabled: boolean;
	disruptionAlerts: boolean;
	boardingReminder: BoardingReminderLead;
	/** Anonymous area-level comfort signals shown during seat selection. */
	womenNearbySignals: boolean;
}

export const defaultNotificationPreferences: NotificationPreferences = {
	pushEnabled: true,
	disruptionAlerts: true,
	boardingReminder: '30',
	womenNearbySignals: true
};
