/**
 * Vehicle fixtures.
 *
 * MOCK FLEET. These registration plates are invented for the demonstration.
 * They are not drawn from any vehicle register and no transport corporation
 * system is contacted to produce them.
 *
 * ARCHITECTURE: a record here describes a *vehicle* — plate, class, capacity,
 * fittings. Not one of them names a route, a departure time, or a crew member,
 * because a bus does not have a route. `TRIP_FIXTURES` is where a vehicle
 * meets a corridor on a date, and `bus-tn01an1234` below deliberately appears
 * on two different corridors there.
 *
 * This file contains no personal data of any kind and must never gain any.
 */
/** The coach carrying the canonical demonstration journey. */
const CANONICAL_BUS_ID = 'bus-tn01an1234';
function demoVehicle(id, registrationNumber, operator, serviceType, cabinClass, airConditioned, accessibleBoardingPoint) {
    const sleeper = cabinClass === 'sleeper';
    const seatLayout = sleeper ? '2+1' : '2+2';
    return {
        id,
        registrationNumber,
        operator,
        serviceType,
        cabinClass,
        seatLayout,
        totalSeats: sleeper ? 30 : 44,
        amenities: {
            airConditioned,
            seatLayout,
            chargingPoints: airConditioned || cabinClass === 'ultra_deluxe',
            restStop: true
        },
        accessibleBoardingPoint
    };
}
export const busFleetFixtures = [
    {
        id: CANONICAL_BUS_ID,
        registrationNumber: 'TN 01 AN 1234',
        operator: 'SETC',
        serviceType: 'SETC Ultra Deluxe',
        cabinClass: 'ultra_deluxe',
        seatLayout: '2+2',
        totalSeats: 44,
        amenities: {
            airConditioned: true,
            seatLayout: '2+2',
            chargingPoints: true,
            restStop: true
        },
        accessibleBoardingPoint: true
    },
    {
        id: 'bus-tn23k4410',
        registrationNumber: 'TN 23 K 4410',
        operator: 'TNSTC',
        serviceType: 'TNSTC Ultra Deluxe',
        cabinClass: 'ultra_deluxe',
        seatLayout: '2+2',
        totalSeats: 44,
        amenities: {
            airConditioned: true,
            seatLayout: '2+2',
            chargingPoints: true,
            restStop: true
        },
        accessibleBoardingPoint: true
    },
    {
        id: 'bus-tn45q7781',
        registrationNumber: 'TN 45 Q 7781',
        operator: 'TNSTC',
        serviceType: 'TNSTC Express',
        cabinClass: 'express',
        seatLayout: '2+2',
        totalSeats: 44,
        amenities: {
            airConditioned: false,
            seatLayout: '2+2',
            chargingPoints: false,
            restStop: true
        },
        accessibleBoardingPoint: false
    },
    {
        id: 'bus-tn30bd5678',
        registrationNumber: 'TN 30 BD 5678',
        operator: 'Private Travels',
        serviceType: 'Private Travels A/C Sleeper',
        cabinClass: 'sleeper',
        seatLayout: '2+1',
        totalSeats: 30,
        amenities: {
            airConditioned: true,
            seatLayout: '2+1',
            chargingPoints: true,
            restStop: false
        },
        accessibleBoardingPoint: false
    },
    {
        id: 'bus-tn88z2091',
        registrationNumber: 'TN 88 Z 2091',
        operator: 'SETC',
        serviceType: 'SETC Ultra Deluxe',
        cabinClass: 'ultra_deluxe',
        seatLayout: '2+2',
        totalSeats: 44,
        amenities: {
            airConditioned: true,
            seatLayout: '2+2',
            chargingPoints: true,
            restStop: true
        },
        accessibleBoardingPoint: true
    },
    {
        id: 'bus-tn19s4402',
        registrationNumber: 'TN 19 S 4402',
        operator: 'SETC',
        serviceType: 'SETC A/C Sleeper',
        cabinClass: 'sleeper',
        seatLayout: '2+1',
        totalSeats: 30,
        amenities: {
            airConditioned: true,
            seatLayout: '2+1',
            chargingPoints: true,
            restStop: true
        },
        accessibleBoardingPoint: false
    },
    {
        id: 'bus-tn63w8815',
        registrationNumber: 'TN 63 W 8815',
        operator: 'Private Travels',
        serviceType: 'Private Travels Sleeper',
        cabinClass: 'sleeper',
        seatLayout: '2+1',
        totalSeats: 36,
        amenities: {
            airConditioned: true,
            seatLayout: '2+1',
            chargingPoints: true,
            restStop: true
        },
        accessibleBoardingPoint: false
    },
    {
        id: 'bus-tn52g3307',
        registrationNumber: 'TN 52 G 3307',
        operator: 'TNSTC',
        serviceType: 'TNSTC Deluxe',
        cabinClass: 'deluxe',
        seatLayout: '2+2',
        totalSeats: 44,
        amenities: {
            airConditioned: false,
            seatLayout: '2+2',
            chargingPoints: true,
            restStop: true
        },
        accessibleBoardingPoint: true
    },
    // Current-day services on the additional hackathon demonstration routes.
    demoVehicle('bus-tn38ac6101', 'TN 38 AC 6101', 'SETC', 'SETC A/C Seater', 'ultra_deluxe', true, true),
    demoVehicle('bus-tn38n7214', 'TN 38 N 7214', 'TNSTC', 'TNSTC Express', 'express', false, false),
    demoVehicle('bus-tn37ps9090', 'TN 37 PS 9090', 'Private Travels', 'Private Travels A/C Sleeper', 'sleeper', true, false),
    demoVehicle('bus-tn58ac4206', 'TN 58 AC 4206', 'SETC', 'SETC A/C Seater', 'ultra_deluxe', true, true),
    demoVehicle('bus-tn58n5532', 'TN 58 N 5532', 'TNSTC', 'TNSTC Express', 'express', false, false),
    demoVehicle('bus-tn59ps7710', 'TN 59 PS 7710', 'Private Travels', 'Private Travels A/C Sleeper', 'sleeper', true, false),
    demoVehicle('bus-ka01ac3812', 'KA 01 AC 3812', 'SETC', 'SETC A/C Seater', 'ultra_deluxe', true, true),
    demoVehicle('bus-tn21n6408', 'TN 21 N 6408', 'TNSTC', 'TNSTC Express', 'express', false, false),
    demoVehicle('bus-ka05ps1188', 'KA 05 PS 1188', 'Private Travels', 'Private Travels A/C Sleeper', 'sleeper', true, false),
    demoVehicle('bus-tn45ac7312', 'TN 45 AC 7312', 'SETC', 'SETC A/C Seater', 'ultra_deluxe', true, true),
    demoVehicle('bus-tn45n8824', 'TN 45 N 8824', 'TNSTC', 'TNSTC Express', 'express', false, false),
    demoVehicle('bus-tn48ps6033', 'TN 48 PS 6033', 'Private Travels', 'Private Travels A/C Sleeper', 'sleeper', true, false),
    demoVehicle('bus-tn30n7182', 'TN 30 N 7182', 'TNSTC', 'TNSTC Express', 'express', false, false),
    demoVehicle('bus-tn29ps5014', 'TN 29 PS 5014', 'Private Travels', 'Private Travels A/C Sleeper', 'sleeper', true, false)
];
