import { fleet } from '$stores/fleet.svelte';
import type { ServiceResult } from '$types/common';
import type { Bus, Trip } from '$types/fleet';
import type { CabinClass, SeatLayout } from '$types/transit';
import { simulateLatency } from './transport';
import { collection, getDocs, setDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { requireFirebase } from '$lib/firebase/client';
import { mapFirebaseError } from '$lib/firebase/errors';

/**
 * Vehicle management.
 *
 * Reads come from the fleet store, which merges the shipped vehicles with
 * whatever Operations has added, edited, or retired. Writes go through the
 * validation below rather than straight to the store, so a vehicle cannot be
 * saved with a duplicate plate or removed while it is still working.
 *
 * Every function here answers a question about *vehicles*. Where a vehicle is
 * going belongs to `trips.service`, because that is a property of the trip —
 * which is also why deletion takes the trips to check against rather than
 * reaching for them itself: a vehicle knows nothing about its own diary.
 */

export async function listBuses(): Promise<ServiceResult<Bus[]>> {
	try {
		const { db } = requireFirebase();
		const snapshot = await getDocs(collection(db, 'buses'));
		const buses = snapshot.docs
			.map((entry) => ({ id: entry.id, ...entry.data() }) as Bus)
			.filter((bus) => bus.status !== 'retired');
		buses.forEach((bus) => fleet.saveBus(bus));
		return { status: 'ok', data: buses };
	} catch (error) {
		return { status: 'error', error: mapFirebaseError(error, 'ops_bus_error_title') };
	}
}

/** Synchronous lookup for render paths that already hold the fleet. */
export function findBus(id: string): Bus | undefined {
	return fleet.buses.find((bus) => bus.id === id);
}

/** Normalised plate, for comparing two registrations that differ only in spacing. */
function plateKey(registrationNumber: string): string {
	return registrationNumber.replace(/\s+/g, '').toLocaleUpperCase();
}

/**
 * The vehicle behind a registration plate.
 *
 * Plates are what crews and controllers actually say out loud, so a lookup by
 * plate saves the caller from carrying an internal id around.
 */
export function findBusByRegistration(registrationNumber: string): Bus | undefined {
	const needle = plateKey(registrationNumber);
	return fleet.buses.find((bus) => plateKey(bus.registrationNumber) === needle);
}

/* ------------------------------------------------------------- validation */

export type BusFieldError =
	| 'registrationNumber'
	| 'operator'
	| 'serviceType'
	| 'totalSeats'
	| 'cabinClass'
	| 'seatLayout';

export interface BusIssue {
	field: BusFieldError;
	/** Message key resolved through Paraglide at render time. */
	messageKey: string;
}

/** What Operations supplies to add or edit a vehicle. */
export interface BusDraft {
	/** Present when editing; absent when adding. */
	id?: string;
	registrationNumber: string;
	operator: string;
	serviceType: string;
	cabinClass: CabinClass;
	seatLayout: SeatLayout;
	totalSeats: number;
	airConditioned: boolean;
	chargingPoints: boolean;
	restStop: boolean;
	accessibleBoardingPoint: boolean;
}

/**
 * A registration plate, loosely.
 *
 * Deliberately permissive: Indian plates vary by state and series, and a demo
 * that rejects a real plate because the pattern was drawn too tightly is worse
 * than one that accepts an odd-looking one. It checks there is something plate
 * shaped, not that the vehicle exists.
 */
const PLATE_PATTERN = /^[A-Z]{2}[\s-]?\d{1,2}[\s-]?[A-Z]{0,3}[\s-]?\d{1,4}$/i;

export function validateBus(draft: BusDraft): BusIssue[] {
	const issues: BusIssue[] = [];
	const plate = draft.registrationNumber.trim();

	if (plate === '') {
		issues.push({ field: 'registrationNumber', messageKey: 'ops_bus_error_plate_required' });
	} else if (!PLATE_PATTERN.test(plate)) {
		issues.push({ field: 'registrationNumber', messageKey: 'ops_bus_error_plate_format' });
	} else {
		// Two vehicles cannot share a plate, or a crew radioing one in would be
		// describing either of them.
		const clash = findBusByRegistration(plate);
		if (clash && clash.id !== draft.id) {
			issues.push({ field: 'registrationNumber', messageKey: 'ops_bus_error_plate_taken' });
		}
	}

	if (draft.operator.trim() === '') {
		issues.push({ field: 'operator', messageKey: 'ops_bus_error_operator' });
	}
	if (draft.serviceType.trim() === '') {
		issues.push({ field: 'serviceType', messageKey: 'ops_bus_error_service_type' });
	}
	if (!Number.isInteger(draft.totalSeats) || draft.totalSeats < 1 || draft.totalSeats > 80) {
		issues.push({ field: 'totalSeats', messageKey: 'ops_bus_error_seats' });
	}

	return issues;
}

/** Derives a stable id from the plate, so a vehicle reads as itself in a URL. */
function busIdFor(registrationNumber: string): string {
	return `bus-${plateKey(registrationNumber).toLocaleLowerCase()}`;
}

export async function saveBus(draft: BusDraft): Promise<ServiceResult<Bus> & { issues?: BusIssue[] }> {
	await simulateLatency(240);

	const issues = validateBus(draft);
	if (issues.length > 0) {
		return {
			status: 'error',
			error: { code: 'invalid_request', messageKey: 'ops_bus_error_title' },
			issues
		};
	}

	const bus: Bus = {
		// Editing keeps the original id: trips already reference it, and
		// re-deriving it from a corrected plate would orphan them.
		id: draft.id ?? busIdFor(draft.registrationNumber),
		status: 'active',
		registrationNumber: draft.registrationNumber.trim().toLocaleUpperCase(),
		operator: draft.operator.trim(),
		serviceType: draft.serviceType.trim(),
		cabinClass: draft.cabinClass,
		seatLayout: draft.seatLayout,
		totalSeats: draft.totalSeats,
		amenities: {
			airConditioned: draft.airConditioned,
			seatLayout: draft.seatLayout,
			chargingPoints: draft.chargingPoints,
			restStop: draft.restStop
		},
		accessibleBoardingPoint: draft.accessibleBoardingPoint
	};

	try {
		const { db } = requireFirebase();
		await setDoc(doc(db, 'buses', bus.id), { ...bus, updatedAt: serverTimestamp() });
		fleet.saveBus(bus);
		return { status: 'ok', data: bus };
	} catch (error) {
		return { status: 'error', error: mapFirebaseError(error, 'ops_bus_error_title') };
	}
}

/**
 * The trips a vehicle is still committed to.
 *
 * Takes the trips rather than fetching them: `trips.service` already depends on
 * this module to resolve a vehicle, so reaching back the other way would make
 * the two import each other.
 */
export function busCommitments(busId: string, trips: Trip[]): Trip[] {
	return trips.filter((trip) => trip.busId === busId && trip.status !== 'cancelled');
}

export async function deleteBus(
	busId: string,
	trips: Trip[]
): Promise<ServiceResult<null> & { blockedBy?: Trip[] }> {
	await simulateLatency(200);

	if (!findBus(busId)) {
		return { status: 'error', error: { code: 'not_found', messageKey: 'ops_bus_missing' } };
	}

	// A vehicle rostered onto a running cannot simply vanish: the trip, the
	// crew working it, and any traveller holding a ticket all still point at it.
	const blockedBy = busCommitments(busId, trips);
	if (blockedBy.length > 0) {
		return {
			status: 'error',
			error: { code: 'invalid_request', messageKey: 'ops_bus_error_in_use' },
			blockedBy
		};
	}

	try {
		const { db } = requireFirebase();
		await updateDoc(doc(db, 'buses', busId), { status: 'retired', updatedAt: serverTimestamp() });
		fleet.retireBus(busId);
		return { status: 'ok', data: null };
	} catch (error) {
		return { status: 'error', error: mapFirebaseError(error, 'ops_bus_error_title') };
	}
}
