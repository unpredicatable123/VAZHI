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
    busId = $state(null);
    selectedSeats = $state([]);
    comfort = $state({ ...defaultComfortPreferences });
    /** True once the traveller has chosen a seat for every passenger. */
    isSeatSelectionComplete(passengerCount) {
        return this.selectedSeats.length === passengerCount && passengerCount > 0;
    }
    /** Seats in a stable order so passenger 1 always maps to the same seat. */
    get orderedSeats() {
        return [...this.selectedSeats].sort(compareSeatIds);
    }
    startFor(busId) {
        if (this.busId === busId)
            return;
        this.busId = busId;
        this.selectedSeats = [];
        this.comfort = { ...defaultComfortPreferences };
    }
    /**
     * Toggles a seat, capped at the passenger count. When the cap is reached
     * the oldest selection gives way, so tapping a new seat always does
     * something visible rather than silently failing.
     */
    toggleSeat(seatId, passengerCount) {
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
    setSeats(seatIds) {
        this.selectedSeats = [...seatIds];
    }
    setSeatType(seatType) {
        this.comfort = { ...this.comfort, seatType };
    }
    toggleAssistance(kind) {
        const assistance = this.comfort.assistance.includes(kind)
            ? this.comfort.assistance.filter((entry) => entry !== kind)
            : [...this.comfort.assistance, kind];
        this.comfort = { ...this.comfort, assistance };
    }
    reset() {
        this.busId = null;
        this.selectedSeats = [];
        this.comfort = { ...defaultComfortPreferences };
    }
}
/** "10B" sorts after "9D": compare the row numerically, then the column. */
export function compareSeatIds(a, b) {
    const rowA = Number.parseInt(a, 10);
    const rowB = Number.parseInt(b, 10);
    if (rowA !== rowB)
        return rowA - rowB;
    return a.slice(String(rowA).length).localeCompare(b.slice(String(rowB).length));
}
export const bookingDraft = new BookingDraftStore();
