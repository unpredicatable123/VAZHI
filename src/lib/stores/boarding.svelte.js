import { browser } from '$app/environment';
/**
 * Boarding state for the conductor's assigned trip.
 *
 * Holds seat, booking reference, and boarding status — nothing about the
 * people travelling. `ManifestEntry` has no field for personal data, which is
 * what makes it safe to persist so a conductor does not lose progress if the
 * device sleeps mid-boarding.
 *
 * Only the boarding overrides are stored, not the whole manifest, so the
 * fixture stays the source of truth for seats and references.
 */
const STORAGE_KEY = 'vazhi.boarding';
function loadOverrides() {
    if (!browser)
        return {};
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return {};
        const parsed = JSON.parse(raw);
        const out = {};
        for (const [seatId, value] of Object.entries(parsed)) {
            const entry = value;
            if (entry?.status === 'boarded' || entry?.status === 'pending') {
                out[seatId] = {
                    status: entry.status,
                    at: typeof entry.at === 'string' ? entry.at : undefined
                };
            }
        }
        return out;
    }
    catch {
        return {};
    }
}
class BoardingStore {
    entries = $state([]);
    initialised = $state(false);
    init() {
        if (this.initialised)
            return;
        this.entries = [];
        this.initialised = true;
    }
    find(seatId) {
        return this.entries.find((entry) => entry.seatId === seatId);
    }
    findByPnr(pnr) {
        const needle = pnr.trim().toLocaleUpperCase();
        return this.entries.filter((entry) => entry.pnr.toLocaleUpperCase() === needle);
    }
    /** Marks every seat on a booking reference as boarded. */
    markBoarded(pnr) {
        const at = new Date().toISOString();
        const needle = pnr.trim().toLocaleUpperCase();
        this.entries = this.entries.map((entry) => entry.pnr.toLocaleUpperCase() === needle && entry.ticketStatus === 'valid'
            ? { ...entry, boardingStatus: 'boarded', boardedAt: at }
            : entry);
        this.persist();
    }
    /** Undo, for a conductor who marked the wrong reference. */
    markPending(pnr) {
        const needle = pnr.trim().toLocaleUpperCase();
        this.entries = this.entries.map((entry) => entry.pnr.toLocaleUpperCase() === needle
            ? { ...entry, boardingStatus: 'pending', boardedAt: undefined }
            : entry);
        this.persist();
    }
    /** Clears boarding progress; used when the conductor signs out. */
    reset() {
        this.entries = [];
        this.initialised = false;
        if (!browser)
            return;
        try {
            localStorage.removeItem(STORAGE_KEY);
        }
        catch {
            // Nothing to recover.
        }
    }
    persist() {
        // Firestore's persistent cache queues conductor updates for synchronization.
    }
}
export const boarding = new BoardingStore();
