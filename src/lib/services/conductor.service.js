import { boarding } from '$stores/boarding.svelte';
import { collection, deleteField, doc, getDoc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { requireFirebase } from '$lib/firebase/client';
import { mapFirebaseError } from '$lib/firebase/errors';
import { durationOf } from './trips.service';
/**
 * Conductor operations.
 *
 * Frontend only: no conductor API, no depot system, no live vehicle feed.
 * Boarding state lives in the boarding store, and the assignment is *derived
 * from the central trip record* — the conductor is given a trip by Operations
 * rather than picking a bus and a route, so the vehicle, corridor, date, and
 * times on this screen are the same ones the driver and the controller see.
 *
 * Nothing returned from this module carries passenger identity.
 */
/** Flattens the trip a conductor is rostered onto into the display shape. */
function assignmentFromTrip(conductorId, view) {
    const { trip, bus, route } = view;
    const origin = view.boardingStop ?? route.stops[0];
    const destination = view.destinationStop ?? route.stops[route.stops.length - 1];
    return {
        conductorId,
        tripId: trip.id,
        tripCode: trip.code,
        status: trip.status,
        busId: trip.busId,
        serviceName: trip.serviceName,
        vehicleNumber: bus.registrationNumber,
        originStopId: trip.boardingStopId,
        destinationStopId: trip.destinationStopId,
        originName: origin?.name ?? trip.boardingStopId,
        originNameTa: origin?.nameTa ?? trip.boardingStopId,
        destinationName: destination?.name ?? trip.destinationStopId,
        destinationNameTa: destination?.nameTa ?? trip.destinationStopId,
        departure: trip.departureTime,
        arrival: trip.arrivalTime,
        durationMinutes: view.durationMinutes,
        distanceKm: view.distanceKm,
        boardingPlatform: trip.platform ?? '--',
        travelDate: trip.serviceDate,
        capacity: bus.totalSeats,
        seatLayout: bus.seatLayout
    };
}
/**
 * The trip this conductor is working, remembered for the shift.
 *
 * `getAssignedTrip` is a callable, so it always needs the network. Calling it
 * again on every manifest read and every boarding mark put a round trip in
 * front of work Firestore can otherwise serve from its own cache — which is
 * precisely the situation a conductor at a stand with a weak signal is in.
 * Resolved once, reused after that, and forgotten when the session ends.
 */
let assignedTripId = null;
async function currentTripId() {
    if (assignedTripId)
        return assignedTripId;
    const { functions } = requireFirebase();
    const assigned = await httpsCallable(functions, 'getAssignedTrip')({});
    assignedTripId = assigned.data.trip.id;
    return assignedTripId;
}
/** Clears the remembered assignment. Called when a session ends. */
export function forgetAssignment() {
    assignedTripId = null;
}
export async function getAssignment(conductorId) {
    try {
        const { db, functions } = requireFirebase();
        const assigned = await httpsCallable(functions, 'getAssignedTrip')({});
        const trip = assigned.data.trip;
        assignedTripId = trip.id;
        const [busDoc, routeDoc] = await Promise.all([
            getDoc(doc(db, 'buses', trip.busId)),
            getDoc(doc(db, 'routes', trip.routeId))
        ]);
        if (!busDoc.exists() || !routeDoc.exists())
            return { status: 'error', error: { code: 'not_found', messageKey: 'assignment_none_body' } };
        const bus = { id: busDoc.id, ...busDoc.data() };
        const route = { id: routeDoc.id, ...routeDoc.data() };
        const view = {
            trip, bus, route,
            boardingStop: route.stops.find((stop) => stop.stopId === trip.boardingStopId),
            destinationStop: route.stops.find((stop) => stop.stopId === trip.destinationStopId),
            durationMinutes: durationOf(trip.departureTime, trip.arrivalTime),
            distanceKm: trip.distanceKm ?? route.distanceKm
        };
        return { status: 'ok', data: assignmentFromTrip(conductorId, view) };
    }
    catch (error) {
        return { status: 'error', error: mapFirebaseError(error, 'assignment_none_body') };
    }
}
export async function getManifest() {
    try {
        const { db } = requireFirebase();
        const tripId = await currentTripId();
        const snapshot = await getDocs(collection(db, 'trips', tripId, 'manifest'));
        const raw = snapshot.docs.map((entry) => entry.data());
        const groupSizes = new Map();
        raw.forEach((entry) => groupSizes.set(String(entry.pnr), (groupSizes.get(String(entry.pnr)) ?? 0) + 1));
        const entries = raw.map((entry) => manifestFromData(entry, groupSizes.get(String(entry.pnr)) ?? 1));
        boarding.entries = entries;
        boarding.initialised = true;
        return { status: 'ok', data: entries };
    }
    catch (error) {
        return { status: 'error', error: mapFirebaseError(error, 'tracking_error_body') };
    }
}
function manifestFromData(entry, groupSize) {
    return {
        bookingId: typeof entry.bookingId === 'string' ? entry.bookingId : undefined,
        pnr: String(entry.pnr),
        seatId: String(entry.seatId),
        ticketStatus: entry.ticketStatus === 'cancelled' ? 'cancelled' : 'valid',
        boardingStatus: entry.boardingStatus === 'boarded' ? 'boarded' : 'pending',
        boardedAt: entry.boardedAt?.toDate?.().toISOString?.(),
        groupSize
    };
}
export function totalsFor(entries, capacity) {
    const valid = entries.filter((entry) => entry.ticketStatus === 'valid');
    const boarded = valid.filter((entry) => entry.boardingStatus === 'boarded').length;
    const cancelled = entries.length - valid.length;
    return {
        booked: entries.length,
        boarded,
        pending: valid.length - boarded,
        cancelled,
        available: capacity - entries.length
    };
}
/**
 * Verifies a booking reference against the manifest.
 *
 * Returns one of the four demo outcomes and, for a group booking, every seat
 * under the reference so they can board together.
 */
export async function verifyPnr(pnr) {
    const trimmed = pnr.trim();
    if (trimmed === '') {
        return {
            status: 'error',
            error: { code: 'invalid_request', messageKey: 'verify_error_empty' }
        };
    }
    try {
        const { functions } = requireFirebase();
        const response = await httpsCallable(functions, 'verifyPnr')({ pnr: trimmed });
        return { status: 'ok', data: response.data };
    }
    catch (error) {
        return { status: 'error', error: mapFirebaseError(error, 'verify_error_empty') };
    }
}
export async function markBoarded(pnr) {
    return updateBoarding(pnr, 'boarded');
}
export async function markPending(pnr) {
    return updateBoarding(pnr, 'pending');
}
async function updateBoarding(pnr, status) {
    try {
        const { db } = requireFirebase();
        const tripId = await currentTripId();
        const matches = await getDocs(query(collection(db, 'trips', tripId, 'manifest'), where('pnr', '==', pnr.trim().toUpperCase())));
        const batch = writeBatch(db);
        matches.docs.forEach((entry) => batch.update(entry.ref, {
            boardingStatus: status,
            boarded: status === 'boarded',
            boardedAt: status === 'boarded' ? serverTimestamp() : deleteField()
        }));
        await batch.commit();
        await getManifest();
        return { status: 'ok', data: boarding.entries.filter((entry) => entry.pnr === pnr.trim().toUpperCase()) };
    }
    catch (error) {
        return { status: 'error', error: mapFirebaseError(error, 'tracking_error_body') };
    }
}
/**
 * Operational state for one seat on the coach view.
 *
 * Derived from the deck and the manifest, so the conductor's grid can never
 * disagree with the traveller-facing seat map.
 */
export function seatBoardingState(seatId, deck, entries) {
    const entry = entries.find((candidate) => candidate.seatId === seatId);
    if (!entry) {
        const seat = deck?.seats.find((candidate) => candidate.id === seatId);
        return seat?.availability === 'available' ? 'available' : 'pending';
    }
    if (entry.ticketStatus === 'cancelled')
        return 'cancelled';
    return entry.boardingStatus === 'boarded' ? 'boarded' : 'pending';
}
/**
 * The conductor's three-phase view of a trip status.
 *
 * The trip itself carries the full six-state lifecycle a driver advances; the
 * boarding screens only need to know whether the doors are open, the service is
 * running, or it is over. Deriving one from the other means a status the driver
 * sets is immediately what the conductor sees.
 */
function phaseFor(status) {
    if (status === 'completed')
        return 'arrived';
    if (status === 'departed' || status === 'in-transit')
        return 'departed';
    return 'boarding';
}
