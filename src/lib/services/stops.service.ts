import { stopFixtures } from '$lib/mocks/stops.mock';
import type { ServiceResult } from '$types/common';
import type { District, DistrictStopGroup, TransitStop } from '$types/transit';
import { collection, getDocs } from 'firebase/firestore';
import { requireFirebase } from '$lib/firebase/client';
import { mapFirebaseError } from '$lib/firebase/errors';

/**
 * District and stop lookup.
 *
 * Backed by fixtures today; the signatures are the boundary a real HTTP client
 * will slot into without touching any caller. Nothing here describes a person.
 */

export async function listStops(): Promise<ServiceResult<TransitStop[]>> {
	try {
		const { db } = requireFirebase();
		const snapshot = await getDocs(collection(db, 'stops'));
		return { status: 'ok', data: snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as TransitStop) };
	} catch (error) {
		return { status: 'error', error: mapFirebaseError(error, 'tracking_error_body') };
	}
}

export async function listDistricts(): Promise<ServiceResult<District[]>> {
	try {
		const { db } = requireFirebase();
		const snapshot = await getDocs(collection(db, 'districts'));
		return { status: 'ok', data: snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as District) };
	} catch (error) {
		return { status: 'error', error: mapFirebaseError(error, 'tracking_error_body') };
	}
}

/** Synchronous lookup for render paths that already hold the full stop list. */
export function findStop(stops: TransitStop[], id: string): TransitStop | undefined {
	return stops.find((stop) => stop.id === id);
}

/**
 * Whether an id names a stop we actually serve.
 *
 * Used to validate ids arriving from a URL before they reach the search store,
 * so a stale or hand-edited link cannot leave the form pointing at a stop that
 * does not exist.
 */
export function isKnownStopId(id: string | null | undefined): boolean {
	if (!id) return false;
	return stopFixtures.some((stop) => stop.id === id);
}

/** The district a stop belongs to, for grouping and for corridor matching. */
export function districtIdForStop(stopId: string): string | undefined {
	return stopFixtures.find((stop) => stop.id === stopId)?.districtId;
}

/**
 * Matches a stop or its district against a search term.
 *
 * Both spellings of both proper nouns are searched, so "CMBT", "Chennai",
 * "சென்னை", and "Broadway" all find their way to the right stop.
 */
function matches(stop: TransitStop, district: District, needle: string): boolean {
	return [stop.name, stop.nameTa, district.name, district.nameTa].some((value) =>
		value.toLocaleLowerCase().includes(needle)
	);
}

/**
 * Stops grouped under their district, filtered by an optional search term.
 *
 * Pure and synchronous so the selector can call it on every keystroke without
 * a round trip. Districts with no surviving stop are dropped, so the list
 * never shows an empty heading.
 *
 * A district whose own name matches keeps all of its stops — searching
 * "Salem" should offer every Salem stand, not only the ones with "Salem" in
 * their name.
 */
export function groupStopsByDistrict(
	stops: TransitStop[],
	districts: District[],
	query = ''
): DistrictStopGroup[] {
	const needle = query.trim().toLocaleLowerCase();

	return districts
		.map((district) => {
			const inDistrict = stops.filter((stop) => stop.districtId === district.id);
			if (needle === '') return { district, stops: inDistrict };

			const districtMatches = [district.name, district.nameTa].some((value) =>
				value.toLocaleLowerCase().includes(needle)
			);

			return {
				district,
				stops: districtMatches
					? inDistrict
					: inDistrict.filter((stop) => matches(stop, district, needle))
			};
		})
		.filter((group) => group.stops.length > 0);
}
