import { seatDeckFixtures } from '$lib/mocks/seatDecks.mock';
import { busFleetFixtures } from '$lib/mocks/fleet.mock';
import { buildDeck } from './deck.service';
import { findService } from './buses.service';
import type { ServiceResult } from '$types/common';
import type {
	ComfortPreferences,
	Seat,
	SeatDeck,
	SeatId,
	SeatState
} from '$types/booking';
import { simulateLatency } from './transport';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '$lib/firebase/client';

/**
 * Seat deck lookup and recommendation.
 *
 * Nothing here reads or returns passenger information. Recommendations are
 * computed from deck geometry and the traveller's own comfort preferences.
 */

/**
 * The seat or berth plan for a service.
 *
 * The canonical journey keeps its hand-written deck — its availability is
 * tuned so seat 5C is the illustrative seat throughout the flow, and the
 * conductor's boarding plan is built from the same seats. Everything else gets
 * a plan generated from the vehicle actually working the trip, which is what
 * lets every service in the Explorer reach a ticket.
 */
export async function getSeatDeck(busId: string): Promise<ServiceResult<SeatDeck>> {
	await simulateLatency();

	const fixture = seatDeckFixtures[busId];
	if (fixture) return { status: 'ok', data: await overlaySharedAvailability(busId, fixture) };

	const service = findService(busId);
	if (!service) {
		return { status: 'error', error: { code: 'not_found', messageKey: 'seats_error_body' } };
	}

	const bus = busFleetFixtures.find(
		(candidate) => candidate.registrationNumber === service.vehicleNumber
	);

	const deck = buildDeck({
		serviceId: busId,
		kind: service.cabinClass === 'sleeper' ? 'sleeper' : 'seater',
		layout: service.amenities.seatLayout,
		totalSeats: bus?.totalSeats ?? 40,
		seatsAvailable: service.seatsAvailable,
		accessibleBoardingPoint: service.accessibleBoardingPoint
	});

	return {
		status: 'ok',
		data: await overlaySharedAvailability(busId, deck)
	};
}

async function overlaySharedAvailability(tripId: string, deck: SeatDeck): Promise<SeatDeck> {
	try {
		const { functions } = requireFirebase();
		const response = await httpsCallable<{ tripId: string }, { blockedSeatIds: string[] }>(functions, 'getSeatAvailability')({ tripId });
		const blocked = new Set(response.data.blockedSeatIds);
		return {
			...deck,
			seats: deck.seats.map((seat) => blocked.has(seat.id) ? { ...seat, availability: 'unavailable' } : seat)
		};
	} catch {
		return deck;
	}
}

function availableSeats(deck: SeatDeck): Seat[] {
	return deck.seats.filter((seat) => seat.availability === 'available');
}

export function seatsInRow(deck: SeatDeck, row: number): Seat[] {
	return deck.seats.filter((seat) => seat.row === row);
}

/** Rows carry the area signals, so any seat in the row answers for it. */
function rowSignals(deck: SeatDeck, row: number) {
	const seats = seatsInRow(deck, row);
	return {
		quieter: seats.some((seat) => seat.signals.quieter),
		nearEntrance: seats.some((seat) => seat.signals.nearEntrance),
		accessible: seats.some((seat) => seat.signals.accessible),
		womenNearby: seats.some((seat) => seat.signals.womenNearby)
	};
}

/** Whether a seat satisfies an explicit window/aisle choice. */
function matchesSeatType(seat: Seat, seatType: ComfortPreferences['seatType']): boolean {
	if (seatType === 'window') return seat.signals.window;
	if (seatType === 'aisle') return seat.signals.aisle;
	return true;
}

/**
 * Ranks the selectable seats and returns the best `count` of them.
 *
 * SEAT TYPE IS THE FIRST SORT KEY, not a bonus.
 *
 * It used to be worth +25 while Accessible Travel Mode was worth +100, so a
 * setting toggled once on another screen silently overruled the choice the
 * traveller had just made in front of them: asking for a window seat with the
 * mode on returned accessible *aisle* seats, which reads as the control being
 * broken. A preference expressed deliberately, seconds ago, must win over a
 * background setting.
 *
 * Everything else — step-free access, quieter areas, proximity to the entrance
 * — then orders the seats *within* that choice. So Accessible Travel Mode still
 * does its job: with no seat type chosen it surfaces step-free seats first, and
 * when a window is asked for it puts the most accessible window first.
 */
export function recommendSeats(
	deck: SeatDeck,
	preferences: ComfortPreferences,
	count: number,
	accessibleTravelMode: boolean
): SeatId[] {
	const ranked = availableSeats(deck)
		.map((seat) => ({
			seat,
			matchesType: matchesSeatType(seat, preferences.seatType),
			score: scoreSeat(seat, preferences, accessibleTravelMode)
		}))
		.sort((a, b) => {
			// The explicit choice first. When nothing matches it, every seat is
			// equal here and the score decides, so the list is never empty.
			if (a.matchesType !== b.matchesType) return a.matchesType ? -1 : 1;
			if (b.score !== a.score) return b.score - a.score;
			// Stable, predictable tie-break: front of the bus first, then column.
			if (a.seat.row !== b.seat.row) return a.seat.row - b.seat.row;
			return a.seat.column.localeCompare(b.seat.column);
		});

	return ranked.slice(0, Math.max(0, count)).map((entry) => entry.seat.id);
}

function scoreSeat(
	seat: Seat,
	preferences: ComfortPreferences,
	accessibleTravelMode: boolean
): number {
	let score = 0;

	if (accessibleTravelMode) {
		if (seat.signals.accessible) score += 100;
		if (seat.signals.nearEntrance) score += 40;
	}

	if (preferences.assistance.includes('mobility')) {
		if (seat.signals.accessible) score += 30;
		if (seat.signals.nearEntrance) score += 20;
	}
	if (preferences.assistance.includes('visual') && seat.signals.nearEntrance) score += 15;
	if (preferences.assistance.includes('hearing') && seat.signals.quieter) score += 15;

	// Seat type is deliberately not scored here: it is the primary sort key in
	// `recommendSeats`. Scoring it as well would double-count it and reopen the
	// gap that let a background setting outweigh an explicit choice.

	if (seat.signals.quieter) score += 10;
	if (seat.signals.aisle) score += 2;

	return score;
}

/** Visual state for a seat, derived from availability and current selection. */
export function seatState(
	seat: Seat,
	selected: SeatId[],
	recommended: SeatId[]
): SeatState {
	if (selected.includes(seat.id)) return 'selected';
	if (seat.availability === 'unavailable') return 'unavailable';
	if (recommended.includes(seat.id)) return 'recommended';
	return 'available';
}

/**
 * Physical traits that follow from where a row sits in the coach.
 *
 * Derived rather than stored: the front row gains legroom because nothing is
 * in front of it, and the back row cannot recline because the rear wall is
 * behind it. Both are ordinary coach facts, not passenger data.
 */
export function rowTraits(
	deck: SeatDeck,
	row: number
): { extraLegroom: boolean; limitedRecline: boolean } {
	return {
		extraLegroom: row === 1,
		limitedRecline: row === deck.rows
	};
}

export interface ZoneBand {
	id: 'entrance' | 'quieter';
	fromRow: number;
	toRow: number;
}

/**
 * Contiguous runs of rows that share an area signal, so the deck can label its
 * sections instead of tinting every seat a different colour.
 */
export function zoneBands(deck: SeatDeck): ZoneBand[] {
	const bands: ZoneBand[] = [];

	for (const id of ['entrance', 'quieter'] as const) {
		const rowsWith: number[] = [];
		for (let row = 1; row <= deck.rows; row++) {
			const signals = rowSignals(deck, row);
			const present = id === 'entrance' ? signals.nearEntrance : signals.quieter;
			if (present) rowsWith.push(row);
		}
		if (rowsWith.length === 0) continue;

		let start = rowsWith[0];
		let previous = rowsWith[0];
		for (let index = 1; index <= rowsWith.length; index++) {
			const current = rowsWith[index];
			if (current !== previous + 1) {
				bands.push({ id, fromRow: start, toRow: previous });
				start = current;
			}
			previous = current;
		}
	}

	return bands;
}
