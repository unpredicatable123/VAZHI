/**
 * Confirmed bookings, for this page's lifetime.
 *
 * Purely in memory. Bookings are persisted in Firestore and read back by
 * `bookings.service`, so nothing here needs to survive a reload — this store
 * exists so the confirmation screen can show the booking it just made without
 * a round trip. It used to write to `localStorage` behind an allowlist; that
 * became redundant once bookings had a real home.
 *
 * Passenger details remain in their own, strictly memory-only store.
 */
class BookingsStore {
    confirmed = $state([]);
    initialised = $state(false);
    init() {
        if (this.initialised)
            return;
        this.confirmed = [];
        this.initialised = true;
    }
    add(booking) {
        this.confirmed = [booking, ...this.confirmed.filter((b) => b.pnr !== booking.pnr)];
    }
    find(pnr) {
        return this.confirmed.find((booking) => booking.pnr === pnr);
    }
    /** Marks a booking cancelled without removing it from the trip history. */
    cancel(pnr) {
        this.confirmed = this.confirmed.map((booking) => booking.pnr === pnr ? { ...booking, status: 'cancelled' } : booking);
    }
    clear() {
        this.confirmed = [];
    }
}
export const bookings = new BookingsStore();
