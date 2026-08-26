import { browser } from '$app/environment';
import { tripFixtures } from '$lib/mocks/trips.mock';
/**
 * Operational trip state — the one place a trip is written to.
 *
 * Two kinds of change survive a reload: a status a driver or controller has
 * set, and a trip Operations has scheduled. Both are non-identifying (a `Trip`
 * has no passenger field at all), which is what makes them safe to persist, and
 * persistence is what lets a driver advance a trip without losing it when the
 * device sleeps.
 *
 * Only the overrides and the created trips are stored, never the whole
 * schedule, so the fixtures stay the source of truth for everything the demo
 * ships with.
 *
 * DEFENCE IN DEPTH: `serialiseTrip` copies named fields one by one rather than
 * spreading, rather than copying whatever the object happens to hold. A field added to
 * `Trip` later cannot reach storage without an obvious, reviewable change here.
 */
const STORAGE_KEY = 'vazhi.trips';
const validStatuses = [
    'scheduled',
    'boarding',
    'departed',
    'in-transit',
    'completed',
    'cancelled'
];
function isStatus(value) {
    return validStatuses.includes(value);
}
/** The complete allowlist of trip fields that may be written to storage. */
function serialiseTrip(trip) {
    return {
        id: trip.id,
        code: trip.code,
        routeId: trip.routeId,
        busId: trip.busId,
        driverId: trip.driverId,
        conductorId: trip.conductorId,
        serviceName: trip.serviceName,
        serviceDate: trip.serviceDate,
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        boardingStopId: trip.boardingStopId,
        destinationStopId: trip.destinationStopId,
        platform: trip.platform,
        status: trip.status,
        baseFare: trip.baseFare,
        taxes: trip.taxes,
        seatsAvailable: trip.seatsAvailable,
        distanceKm: trip.distanceKm,
        sellable: trip.sellable,
        canonical: trip.canonical,
        highlights: [...trip.highlights]
    };
}
function load() {
    const empty = { statusOverrides: {}, created: [] };
    if (!browser)
        return empty;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return empty;
        const parsed = JSON.parse(raw);
        const statusOverrides = {};
        for (const [tripId, status] of Object.entries(parsed.statusOverrides ?? {})) {
            if (isStatus(status))
                statusOverrides[tripId] = status;
        }
        const created = Array.isArray(parsed.created)
            ? parsed.created
                .filter((entry) => entry &&
                typeof entry.id === 'string' &&
                typeof entry.routeId === 'string' &&
                isStatus(entry.status))
                .map((entry) => serialiseTrip(entry))
            : [];
        return { statusOverrides, created };
    }
    catch {
        return empty;
    }
}
class TripsStore {
    /** Statuses set by a driver or controller, keyed by trip id. */
    statusOverrides = $state({});
    /** Trips scheduled through the Operations workspace. */
    created = $state([]);
    initialised = $state(false);
    init() {
        if (this.initialised)
            return;
        this.statusOverrides = {};
        this.created = [];
        this.initialised = true;
    }
    /**
     * Every trip the app knows about: the shipped schedule plus anything
     * Operations has added. A created trip with a fixture id replaces the
     * fixture, so editing never leaves two records for one running.
     */
    get all() {
        const createdIds = new Set(this.created.map((trip) => trip.id));
        return [...this.created, ...tripFixtures().filter((trip) => !createdIds.has(trip.id))];
    }
    overrideFor(tripId) {
        return this.statusOverrides[tripId];
    }
    setStatus(tripId, status) {
        this.statusOverrides = { ...this.statusOverrides, [tripId]: status };
        this.persist();
    }
    add(trip) {
        this.created = [serialiseTrip(trip), ...this.created.filter((entry) => entry.id !== trip.id)];
        this.persist();
    }
    /** Clears operational trip state; used when a crew or controller signs out. */
    reset() {
        this.statusOverrides = {};
        this.created = [];
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
        // Firestore is authoritative; this is only a reactive in-memory cache.
    }
}
export const trips = new TripsStore();
