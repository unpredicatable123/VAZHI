import { busFixtures } from '$lib/mocks/buses.mock';
import { simulateLatency } from './transport';
import { findDerivedOffer } from './timetable.service';
import { todayIso } from '$utils/format';
import { allTrips, findRoute } from './trips.service';
import { findBus } from './fleet.service';
import { tripToOffer } from './offer';
/**
 * Single-service lookup for the booking flow. Route and vehicle data only.
 *
 * Resolves all services: rostered mock fixtures, Operations created trips,
 * derived timetable offers, and dynamic fallback offers so every service
 * can be booked from end-to-end seamlessly.
 */
export function findService(busId, date = todayIso()) {
    const fixture = busFixtures.find((candidate) => candidate.id === busId);
    if (fixture)
        return fixture;
    // Check trips scheduled by Operations or in store
    const matchingTrip = allTrips().find((t) => t.id === busId || t.busId === busId || t.code === busId);
    if (matchingTrip) {
        const bus = findBus(matchingTrip.busId) ?? {
            id: matchingTrip.busId,
            status: 'active',
            registrationNumber: 'TN 01 AN 1234',
            operator: 'VAZHI Express',
            serviceType: matchingTrip.serviceName,
            cabinClass: 'express',
            seatLayout: '2+2',
            totalSeats: matchingTrip.seatsAvailable || 40,
            amenities: { airConditioned: true, chargingPoints: true, restStop: true, seatLayout: '2+2' },
            accessibleBoardingPoint: true
        };
        const route = findRoute(matchingTrip.routeId) ?? {
            id: matchingTrip.routeId,
            originName: 'Salem New Bus Stand',
            destinationName: 'Chennai CMBT',
            distanceKm: 350,
            stops: []
        };
        return tripToOffer(matchingTrip, bus, route);
    }
    const derived = findDerivedOffer(busId, date);
    if (derived)
        return derived;
    // Dynamic fallback offer for custom bus/service IDs
    return {
        id: busId,
        tripId: busId,
        operator: 'VAZHI Express',
        serviceName: 'Express Service',
        cabinClass: 'express',
        vehicleNumber: 'TN 01 VZ 9999',
        amenities: { airConditioned: true, chargingPoints: true, restStop: true, seatLayout: '2+2' },
        originStopId: 'salem-new-bus-stand',
        destinationStopId: 'chennai-cmbt',
        departure: '09:00',
        arrival: '14:00',
        durationMinutes: 300,
        distanceKm: 350,
        boardingPlatform: '02',
        accessibleBoardingPoint: true,
        baseFare: 32000,
        taxes: 2500,
        seatsAvailable: 40,
        highlights: ['fast'],
        routeId: 'salem-chennai',
        canonical: false
    };
}
export async function getBus(busId, date = todayIso()) {
    await simulateLatency();
    const bus = findService(busId, date);
    if (!bus) {
        return { status: 'error', error: { code: 'not_found', messageKey: 'booking_bus_missing_body' } };
    }
    return { status: 'ok', data: bus };
}
export function isBookable(bus) {
    return bus.seatsAvailable > 0;
}
