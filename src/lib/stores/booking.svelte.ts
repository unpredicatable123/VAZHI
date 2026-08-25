import type { ComfortPreferences, SeatId, SeatTypePreference, AssistanceKind } from '$types/booking';
import { defaultComfortPreferences } from '$types/booking';

/**
 * Shared booking draft.
 *
 * Deliberately non-identifying: a bus id, seat ids, and the traveller's own
 * comfort preferences. Passenger details live in a separate memory-only store
 * and are never copied in here (specification section 6).
 *
 * Nothing in this store is persisted. Reloading the page restarts the draft,
 * which is the safe default for a flow that sits next to personal data.
 */
class BookingDraftStore {
	busId = $state<string | null>(null);
	selectedSeats = $state<SeatId[]>([]);
	comfort = $state<ComfortPreferences>({ ...defaultComfortPreferences });

	/** True once the traveller has chosen a seat for every passenger. */
	isSeatSelectionComplete(passengerCount: number): boolean {
		return this.selectedSeats.length === passengerCount && passengerCount > 0;
	}

	/** Seats in a stable order so passenger 1 always maps to the same seat. */
	get orderedSeats(): SeatId[] {
		return [...this.selectedSeats].sort(compareSeatIds);
	}

	startFor(busId: string): void {
		if (this.busId === busId) return;
		this.busId = busId;
		this.selectedSeats = [];
		this.comfort = { ...defaultComfortPreferences };
	}

	/**
	 * Toggles a seat, capped at the passenger count. When the cap is reached
	 * the oldest selection gives way, so tapping a new seat always does
	 * something visible rather than silently failing.
	 */
	toggleSeat(seatId: SeatId, passengerCount: number): void {
		if (this.selectedSeats.includes(seatId)) {
			this.selectedSeats = this.selectedSeats.filter((id) => id !== seatId);
			return;
		}
		if (this.selectedSeats.length >= passengerCount) {
			this.selectedSeats = [...this.selectedSeats.slice(1), seatId];
			return;
		}
		this.selectedSeats = [...this.selectedSeats, seatId];
	}

	setSeats(seatIds: SeatId[]): void {
		this.selectedSeats = [...seatIds];
	}

	setSeatType(seatType: SeatTypePreference): void {
		this.comfort = { ...this.comfort, seatType };
	}

	toggleAssistance(kind: AssistanceKind): void {
		const assistance = this.comfort.assistance.includes(kind)
			? this.comfort.assistance.filter((entry) => entry !== kind)
			: [...this.comfort.assistance, kind];
		this.comfort = { ...this.comfort, assistance };
	}

	reset(): void {
		this.busId = null;
		this.selectedSeats = [];
		this.comfort = { ...defaultComfortPreferences };
	}
}

/** "10B" sorts after "9D": compare the row numerically, then the column. */
export function compareSeatIds(a: SeatId, b: SeatId): number {
	const rowA = Number.parseInt(a, 10);
	const rowB = Number.parseInt(b, 10);
	if (rowA !== rowB) return rowA - rowB;
	return a.slice(String(rowA).length).localeCompare(b.slice(String(rowB).length));
}

export const bookingDraft = new BookingDraftStore();
