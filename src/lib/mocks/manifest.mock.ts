import type { ManifestEntry } from '$types/conductor';

/**
 * Conductor demonstration fixtures.
 *
 * PRIVACY: these records describe seats and booking references only. There is
 * no name, age, gender, contact detail, or identity document here, and
 * `ManifestEntry` has no field that could hold one.
 *
 * The manifest covers the seats the canonical coach already shows as taken, so
 * the conductor view and the traveller seat map agree with each other.
 *
 * The trip a conductor is working is no longer described here: it is derived
 * from the central trip record by `conductor.service`, so the conductor, the
 * driver, and Operations cannot disagree about the same running.
 */

/** Mirrors the twelve selectable seats in `seatDecks.mock`. */
const AVAILABLE_SEATS = [
	'1C',
	'2C',
	'3D',
	'5C',
	'5D',
	'6B',
	'7C',
	'8A',
	'8B',
	'9D',
	'10B',
	'11C'
];

const ROWS = 11;
const COLUMNS = ['A', 'B', 'C', 'D'];

/** Seats already boarded when the demo opens, spread across the coach. */
const PRE_BOARDED = new Set([
	'1A',
	'1B',
	'2A',
	'2D',
	'3A',
	'3B',
	'4A',
	'4B',
	'4C',
	'5A',
	'6A',
	'6C',
	'7A',
	'7B'
]);

/** One booking on the demo trip was cancelled after purchase. */
const CANCELLED = new Set(['9A']);

/** Seats sold on the same reference, so a group boards together. */
const GROUPS: Record<string, string[]> = {
	'1A': ['1A', '1B'],
	'1B': ['1A', '1B'],
	'4A': ['4A', '4B'],
	'4B': ['4A', '4B'],
	'10C': ['10C', '10D'],
	'10D': ['10C', '10D']
};

/**
 * Derives a stable booking reference from the seat, so the same seat always
 * carries the same PNR across reloads. Nothing about a traveller feeds into
 * it — only the seat and the scheduled departure.
 */
function referenceFor(seatId: string): string {
	const group = GROUPS[seatId];
	const anchor = group ? group[0] : seatId;
	return `VZ-${anchor}0830`;
}

export function canonicalManifest(): ManifestEntry[] {
	const entries: ManifestEntry[] = [];

	for (let row = 1; row <= ROWS; row++) {
		for (const column of COLUMNS) {
			const seatId = `${row}${column}`;
			if (AVAILABLE_SEATS.includes(seatId)) continue;

			const group = GROUPS[seatId];
			entries.push({
				pnr: referenceFor(seatId),
				seatId,
				ticketStatus: CANCELLED.has(seatId) ? 'cancelled' : 'valid',
				boardingStatus: PRE_BOARDED.has(seatId) ? 'boarded' : 'pending',
				groupSize: group ? group.length : 1
			});
		}
	}

	return entries;
}
