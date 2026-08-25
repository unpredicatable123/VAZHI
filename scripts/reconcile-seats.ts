import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

/**
 * Frees seats whose booking no longer exists.
 *
 * WHY THIS IS NEEDED. Seat occupancy lives in `trips/{tripId}/seats`, not in
 * `bookings` — a seat document is what the seat map reads, and the booking is a
 * separate record. `cancelBooking` deletes both together in one transaction, so
 * the two can never drift apart through the app. Deleting a booking by hand in
 * the Firestore console deletes only one half, and the seat stays occupied for
 * ever with nothing left to explain why.
 *
 * This walks every trip, drops seat documents whose booking is gone or
 * cancelled, clears holds that expired, and corrects `seatsAvailable` to match
 * what is actually left.
 *
 * Reports by default and changes nothing. Pass `--apply` to commit.
 *
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\secure\your-key.json'
 *   npm run firebase:reconcile
 *   npm run firebase:reconcile -- --apply
 *   Remove-Item Env:GOOGLE_APPLICATION_CREDENTIALS
 */

const requireFromFunctions = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, applicationDefault } = requireFromFunctions('firebase-admin/app');
const { getFirestore, Timestamp } = requireFromFunctions('firebase-admin/firestore');

function argument(name: string): string | undefined {
	const withEquals = process.argv.find((value) => value.startsWith(`--${name}=`));
	if (withEquals) return withEquals.slice(name.length + 3);
	const index = process.argv.indexOf(`--${name}`);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

async function projectId(): Promise<string> {
	const named = argument('project');
	if (named) return named;
	const rc = JSON.parse(await readFile(new URL('../.firebaserc', import.meta.url), 'utf8'));
	const value = rc?.projects?.default;
	if (!value) throw new Error('No project in .firebaserc; pass --project=<id>.');
	return value;
}

const apply = process.argv.includes('--apply');

async function main(): Promise<void> {
	if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		throw new Error(
			'Set GOOGLE_APPLICATION_CREDENTIALS to an Admin service-account key first. See FIREBASE.md.'
		);
	}

	initializeApp({ credential: applicationDefault(), projectId: await projectId() });
	const db = getFirestore();

	console.log(apply ? 'RECONCILING (writing)\n' : 'DRY RUN — nothing will be changed\n');

	const trips = await db.collection('trips').get();
	// Bookings are read once and kept, rather than one lookup per seat: a full
	// coach would otherwise cost forty-odd reads per trip.
	const bookings = await db.collection('bookings').get();
	const liveBookings = new Map<string, string>();
	for (const doc of bookings.docs) liveBookings.set(doc.id, String(doc.data().status ?? ''));

	const now = Timestamp.now().toMillis();
	let freed = 0;
	let expired = 0;
	let corrected = 0;

	for (const trip of trips.docs) {
		const seats = await trip.ref.collection('seats').get();
		if (seats.empty) continue;

		const stale: string[] = [];
		let stillBlocked = 0;

		for (const seat of seats.docs) {
			const value = seat.data();
			const state = String(value.state ?? '');

			if (state === 'held') {
				const holdLive =
					value.expiresAt && typeof value.expiresAt.toMillis === 'function'
						? value.expiresAt.toMillis() > now
						: false;
				if (holdLive) stillBlocked++;
				else {
					stale.push(seat.id);
					expired++;
				}
				continue;
			}

			if (state === 'booked') {
				const status = liveBookings.get(String(value.bookingId ?? ''));
				// Gone entirely, or cancelled: either way the seat is free.
				if (status === undefined || status === 'cancelled') {
					stale.push(seat.id);
					freed++;
				} else {
					stillBlocked++;
				}
				continue;
			}

			// An unrecognised state blocks nothing and is left alone.
		}

		// `seatsAvailable` is what the search results and the fare quote read, so
		// it has to agree with the seat documents that are actually left.
		const busSnap = await db.collection('buses').doc(String(trip.data().busId)).get();
		const capacity = Number(busSnap.data()?.totalSeats ?? 0);
		const shouldBe = capacity > 0 ? capacity - stillBlocked : Number(trip.data().seatsAvailable ?? 0);
		const isNow = Number(trip.data().seatsAvailable ?? 0);
		const drifted = capacity > 0 && shouldBe !== isNow;

		if (stale.length === 0 && !drifted) continue;

		console.log(`${trip.id}`);
		if (stale.length) console.log(`  free up ${stale.length} seat(s): ${stale.join(', ')}`);
		if (drifted) console.log(`  seatsAvailable ${isNow} -> ${shouldBe}`);

		if (apply) {
			// Chunked: a Firestore batch takes at most 500 operations.
			for (let i = 0; i < stale.length; i += 400) {
				const batch = db.batch();
				for (const id of stale.slice(i, i + 400)) {
					batch.delete(trip.ref.collection('seats').doc(id));
				}
				await batch.commit();
			}
			if (drifted) {
				await trip.ref.update({ seatsAvailable: shouldBe });
				corrected++;
			}
		} else if (drifted) {
			corrected++;
		}
	}

	console.log(
		`\n${freed} seat(s) held by a deleted or cancelled booking, ` +
			`${expired} expired hold(s), ${corrected} trip count(s) corrected.`
	);
	if (!apply && (freed || expired || corrected)) {
		console.log('Re-run with --apply to make these changes.');
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
