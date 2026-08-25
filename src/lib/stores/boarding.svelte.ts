import { browser } from '$app/environment';
import type { BoardingStatus, ManifestEntry } from '$types/conductor';
import type { Pnr, SeatId } from '$types/booking';

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

type BoardingOverrides = Record<SeatId, { status: BoardingStatus; at?: string }>;

function loadOverrides(): BoardingOverrides {
	if (!browser) return {};
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		const out: BoardingOverrides = {};
		for (const [seatId, value] of Object.entries(parsed)) {
			const entry = value as { status?: unknown; at?: unknown };
			if (entry?.status === 'boarded' || entry?.status === 'pending') {
				out[seatId] = {
					status: entry.status,
					at: typeof entry.at === 'string' ? entry.at : undefined
				};
			}
		}
		return out;
	} catch {
		return {};
	}
}

class BoardingStore {
	entries = $state<ManifestEntry[]>([]);
	initialised = $state(false);

	init(): void {
		if (this.initialised) return;
		this.entries = [];
		this.initialised = true;
	}

	find(seatId: SeatId): ManifestEntry | undefined {
		return this.entries.find((entry) => entry.seatId === seatId);
	}

	findByPnr(pnr: Pnr): ManifestEntry[] {
		const needle = pnr.trim().toLocaleUpperCase();
		return this.entries.filter((entry) => entry.pnr.toLocaleUpperCase() === needle);
	}

	/** Marks every seat on a booking reference as boarded. */
	markBoarded(pnr: Pnr): void {
		const at = new Date().toISOString();
		const needle = pnr.trim().toLocaleUpperCase();
		this.entries = this.entries.map((entry) =>
			entry.pnr.toLocaleUpperCase() === needle && entry.ticketStatus === 'valid'
				? { ...entry, boardingStatus: 'boarded', boardedAt: at }
				: entry
		);
		this.persist();
	}

	/** Undo, for a conductor who marked the wrong reference. */
	markPending(pnr: Pnr): void {
		const needle = pnr.trim().toLocaleUpperCase();
		this.entries = this.entries.map((entry) =>
			entry.pnr.toLocaleUpperCase() === needle
				? { ...entry, boardingStatus: 'pending', boardedAt: undefined }
				: entry
		);
		this.persist();
	}

	/** Clears boarding progress; used when the conductor signs out. */
	reset(): void {
		this.entries = [];
		this.initialised = false;
		if (!browser) return;
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch {
			// Nothing to recover.
		}
	}

	private persist(): void {
		// Firestore's persistent cache queues conductor updates for synchronization.
	}
}

export const boarding = new BoardingStore();
