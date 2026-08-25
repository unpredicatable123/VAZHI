import type { Trip } from '$types/fleet';

/**
 * Trip fixtures — where a bus, a corridor, a date, and a crew meet.
 *
 * MOCK SCHEDULE. Nothing here comes from a live timetable or depot system.
 *
 * READ THIS PAIR OF RECORDS FIRST
 * -------------------------------
 * `TRIP-001` and `TRIP-042` both run bus `bus-tn01an1234` — registration
 * TN 01 AN 1234 — and they run it down *different corridors on different
 * dates*:
 *
 *     TRIP-001   today    Salem → Chennai     DRV-014 / CON-023
 *     TRIP-042   +7 days  Salem → Bangalore   DRV-019 / CON-031
 *
 * That pair is the whole reason the trip record exists. If a future change
 * makes it impossible to express, the model has regressed.
 *
 * IDS ARE STABLE. `setc-ultra-deluxe-0830` and the three ids beside it were the
 * bus-result ids of earlier builds and already appear in URLs (`/book/…`), in
 * saved bookings, and as seat-deck keys. They are now trip ids, which is what
 * they always were in effect: one dated service offer. They must not be
 * renamed.
 *
 * Dates are expressed as offsets from today so the fixtures never drift into
 * stale calendar dates.
 *
 * No passenger data appears in this file. A trip knows how many seats remain,
 * never who holds the rest.
 */

/** Local `YYYY-MM-DD`, `offset` days from today. */
function dateOffset(offset: number): string {
	const date = new Date();
	date.setDate(date.getDate() + offset);
	const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
	return local.toISOString().slice(0, 10);
}

/** The canonical demonstration trip, referenced across the whole app. */
const CANONICAL_TRIP_ID = 'setc-ultra-deluxe-0830';

interface CurrentDemoTrip {
	id: string;
	code: string;
	routeId: string;
	busId: string;
	driverId: string;
	conductorId: string;
	serviceName: string;
	departureTime: string;
	arrivalTime: string;
	boardingStopId: string;
	destinationStopId: string;
	platform: string;
	baseFare: number;
	taxes: number;
	seatsAvailable: number;
	highlights?: Trip['highlights'];
}

/** A current-day, fully rostered service offered to travellers. */
function currentDemoTrip(input: CurrentDemoTrip): Trip {
	return {
		...input,
		serviceDate: dateOffset(0),
		status: 'scheduled',
		sellable: true,
		canonical: false,
		highlights: input.highlights ?? []
	};
}

export function tripFixtures(): Trip[] {
	return [
		/* ------------------------------------------------ today: Salem → Chennai */
		{
			id: CANONICAL_TRIP_ID,
			code: 'TRIP-001',
			routeId: 'salem-chennai',
			busId: 'bus-tn01an1234',
			driverId: 'DRV-014',
			conductorId: 'CON-023',
			serviceName: 'SETC Ultra Deluxe',
			serviceDate: dateOffset(0),
			departureTime: '08:30',
			arrivalTime: '13:45',
			boardingStopId: 'salem-new-bus-stand',
			destinationStopId: 'chennai-cmbt',
			platform: '04',
			status: 'scheduled',
			baseFare: 38000,
			taxes: 3000,
			seatsAvailable: 12,
			sellable: true,
			canonical: true,
			highlights: ['fast']
		},
		{
			id: 'tnstc-ultra-deluxe-1100',
			code: 'TRIP-002',
			routeId: 'salem-chennai',
			busId: 'bus-tn23k4410',
			driverId: 'DRV-022',
			conductorId: 'CON-024',
			serviceName: 'TNSTC Ultra Deluxe',
			serviceDate: dateOffset(0),
			departureTime: '11:00',
			arrivalTime: '16:30',
			boardingStopId: 'salem-new-bus-stand',
			destinationStopId: 'chennai-cmbt',
			platform: '07',
			status: 'scheduled',
			baseFare: 40000,
			taxes: 3000,
			seatsAvailable: 6,
			sellable: true,
			canonical: false,
			highlights: []
		},
		{
			id: 'tnstc-express-0645',
			code: 'TRIP-003',
			routeId: 'salem-chennai',
			busId: 'bus-tn45q7781',
			driverId: 'DRV-031',
			conductorId: 'CON-025',
			serviceName: 'TNSTC Express',
			serviceDate: dateOffset(0),
			departureTime: '06:45',
			arrivalTime: '12:30',
			boardingStopId: 'salem-new-bus-stand',
			destinationStopId: 'chennai-cmbt',
			platform: '11',
			status: 'scheduled',
			baseFare: 27500,
			taxes: 2000,
			seatsAvailable: 21,
			sellable: true,
			canonical: false,
			highlights: []
		},
		{
			// Short-worked down the same corridor: this running boards at Salem
			// Bypass and terminates at Koyambedu, which is why the trip carries
			// its own boarding stop and distance rather than the route defaults.
			id: 'private-ac-sleeper-0915',
			code: 'TRIP-004',
			routeId: 'salem-chennai',
			busId: 'bus-tn30bd5678',
			driverId: 'DRV-041',
			conductorId: 'CON-026',
			serviceName: 'Private Travels A/C Sleeper',
			serviceDate: dateOffset(0),
			departureTime: '09:15',
			arrivalTime: '14:15',
			boardingStopId: 'salem-bypass',
			destinationStopId: 'koyambedu',
			platform: '02',
			status: 'scheduled',
			baseFare: 69500,
			taxes: 5500,
			seatsAvailable: 4,
			distanceKm: 344,
			sellable: true,
			canonical: false,
			highlights: []
		},

		/* ---------------------------------------------- today: Salem → Bangalore */
		{
			id: 'setc-bangalore-0700',
			code: 'TRIP-018',
			routeId: 'salem-bangalore',
			busId: 'bus-tn88z2091',
			driverId: 'DRV-019',
			conductorId: 'CON-031',
			serviceName: 'SETC Ultra Deluxe',
			serviceDate: dateOffset(0),
			departureTime: '07:00',
			arrivalTime: '12:15',
			boardingStopId: 'salem-new-bus-stand',
			destinationStopId: 'bangalore-majestic',
			platform: '02',
			status: 'scheduled',
			baseFare: 32000,
			taxes: 2500,
			seatsAvailable: 18,
			sellable: true,
			canonical: false,
			highlights: []
		},

		/* ------------------------ current-day popular demonstration corridors */
		currentDemoTrip({
			id: 'setc-coimbatore-chennai-0630', code: 'TRIP-101', routeId: 'coimbatore-chennai',
			busId: 'bus-tn38ac6101', driverId: 'DRV-061', conductorId: 'CON-061',
			serviceName: 'SETC A/C Seater', departureTime: '06:30', arrivalTime: '15:15',
			boardingStopId: 'coimbatore-gandhipuram', destinationStopId: 'chennai-cmbt',
			platform: '06', baseFare: 52000, taxes: 3500, seatsAvailable: 16,
			highlights: ['fast']
		}),
		currentDemoTrip({
			id: 'tnstc-coimbatore-chennai-1330', code: 'TRIP-102', routeId: 'coimbatore-chennai',
			busId: 'bus-tn38n7214', driverId: 'DRV-062', conductorId: 'CON-062',
			serviceName: 'TNSTC Express', departureTime: '13:30', arrivalTime: '22:45',
			boardingStopId: 'coimbatore-gandhipuram', destinationStopId: 'chennai-cmbt',
			platform: '08', baseFare: 39000, taxes: 2500, seatsAvailable: 27
		}),
		currentDemoTrip({
			id: 'private-coimbatore-chennai-2130', code: 'TRIP-103', routeId: 'coimbatore-chennai',
			busId: 'bus-tn37ps9090', driverId: 'DRV-063', conductorId: 'CON-063',
			serviceName: 'Private Travels A/C Sleeper', departureTime: '21:30', arrivalTime: '06:15',
			boardingStopId: 'coimbatore-gandhipuram', destinationStopId: 'chennai-cmbt',
			platform: '03', baseFare: 82000, taxes: 6000, seatsAvailable: 9
		}),

		currentDemoTrip({
			id: 'setc-madurai-chennai-0600', code: 'TRIP-104', routeId: 'madurai-chennai',
			busId: 'bus-tn58ac4206', driverId: 'DRV-064', conductorId: 'CON-064',
			serviceName: 'SETC A/C Seater', departureTime: '06:00', arrivalTime: '14:15',
			boardingStopId: 'madurai-mattuthavani', destinationStopId: 'chennai-cmbt',
			platform: '04', baseFare: 48000, taxes: 3500, seatsAvailable: 20,
			highlights: ['fast']
		}),
		currentDemoTrip({
			id: 'tnstc-madurai-chennai-1400', code: 'TRIP-105', routeId: 'madurai-chennai',
			busId: 'bus-tn58n5532', driverId: 'DRV-065', conductorId: 'CON-065',
			serviceName: 'TNSTC Express', departureTime: '14:00', arrivalTime: '22:30',
			boardingStopId: 'madurai-mattuthavani', destinationStopId: 'chennai-cmbt',
			platform: '10', baseFare: 36000, taxes: 2500, seatsAvailable: 31
		}),
		currentDemoTrip({
			id: 'private-madurai-chennai-2145', code: 'TRIP-106', routeId: 'madurai-chennai',
			busId: 'bus-tn59ps7710', driverId: 'DRV-066', conductorId: 'CON-066',
			serviceName: 'Private Travels A/C Sleeper', departureTime: '21:45', arrivalTime: '06:00',
			boardingStopId: 'madurai-mattuthavani', destinationStopId: 'chennai-cmbt',
			platform: '12', baseFare: 76000, taxes: 5500, seatsAvailable: 8
		}),

		currentDemoTrip({
			id: 'setc-bangalore-chennai-0630', code: 'TRIP-107', routeId: 'bangalore-chennai',
			busId: 'bus-ka01ac3812', driverId: 'DRV-067', conductorId: 'CON-067',
			serviceName: 'SETC A/C Seater', departureTime: '06:30', arrivalTime: '13:30',
			boardingStopId: 'bangalore-majestic', destinationStopId: 'chennai-cmbt',
			platform: '18', baseFare: 43000, taxes: 3000, seatsAvailable: 22,
			highlights: ['fast']
		}),
		currentDemoTrip({
			id: 'tnstc-bangalore-chennai-1400', code: 'TRIP-108', routeId: 'bangalore-chennai',
			busId: 'bus-tn21n6408', driverId: 'DRV-068', conductorId: 'CON-068',
			serviceName: 'TNSTC Express', departureTime: '14:00', arrivalTime: '21:30',
			boardingStopId: 'bangalore-majestic', destinationStopId: 'chennai-cmbt',
			platform: '20', baseFare: 33000, taxes: 2500, seatsAvailable: 25
		}),
		currentDemoTrip({
			id: 'private-bangalore-chennai-2200', code: 'TRIP-109', routeId: 'bangalore-chennai',
			busId: 'bus-ka05ps1188', driverId: 'DRV-069', conductorId: 'CON-069',
			serviceName: 'Private Travels A/C Sleeper', departureTime: '22:00', arrivalTime: '05:30',
			boardingStopId: 'bangalore-majestic', destinationStopId: 'chennai-cmbt',
			platform: '15', baseFare: 70000, taxes: 5000, seatsAvailable: 11
		}),

		currentDemoTrip({
			id: 'setc-trichy-chennai-0545', code: 'TRIP-110', routeId: 'trichy-chennai',
			busId: 'bus-tn45ac7312', driverId: 'DRV-070', conductorId: 'CON-070',
			serviceName: 'SETC A/C Seater', departureTime: '05:45', arrivalTime: '11:15',
			boardingStopId: 'trichy-central', destinationStopId: 'chennai-cmbt',
			platform: '01', baseFare: 35000, taxes: 2500, seatsAvailable: 19,
			highlights: ['fast']
		}),
		currentDemoTrip({
			id: 'tnstc-trichy-chennai-1300', code: 'TRIP-111', routeId: 'trichy-chennai',
			busId: 'bus-tn45n8824', driverId: 'DRV-071', conductorId: 'CON-071',
			serviceName: 'TNSTC Express', departureTime: '13:00', arrivalTime: '18:45',
			boardingStopId: 'trichy-central', destinationStopId: 'chennai-cmbt',
			platform: '05', baseFare: 28000, taxes: 2000, seatsAvailable: 29
		}),
		currentDemoTrip({
			id: 'private-trichy-chennai-2215', code: 'TRIP-112', routeId: 'trichy-chennai',
			busId: 'bus-tn48ps6033', driverId: 'DRV-072', conductorId: 'CON-072',
			serviceName: 'Private Travels A/C Sleeper', departureTime: '22:15', arrivalTime: '03:30',
			boardingStopId: 'trichy-central', destinationStopId: 'chennai-cmbt',
			platform: '07', baseFare: 62000, taxes: 4500, seatsAvailable: 7
		}),

		currentDemoTrip({
			id: 'tnstc-salem-bangalore-1330', code: 'TRIP-113', routeId: 'salem-bangalore',
			busId: 'bus-tn30n7182', driverId: 'DRV-073', conductorId: 'CON-073',
			serviceName: 'TNSTC Express', departureTime: '13:30', arrivalTime: '18:45',
			boardingStopId: 'salem-new-bus-stand', destinationStopId: 'bangalore-majestic',
			platform: '05', baseFare: 26000, taxes: 2000, seatsAvailable: 33
		}),
		currentDemoTrip({
			id: 'private-salem-bangalore-2215', code: 'TRIP-114', routeId: 'salem-bangalore',
			busId: 'bus-tn29ps5014', driverId: 'DRV-074', conductorId: 'CON-074',
			serviceName: 'Private Travels A/C Sleeper', departureTime: '22:15', arrivalTime: '03:30',
			boardingStopId: 'salem-new-bus-stand', destinationStopId: 'bangalore-majestic',
			platform: '08', baseFare: 56000, taxes: 4000, seatsAvailable: 10
		}),

		/* ------------------------------------------------------ today: cancelled */
		{
			id: 'tnstc-madurai-2130',
			code: 'TRIP-097',
			routeId: 'madurai-chennai',
			busId: 'bus-tn52g3307',
			driverId: 'DRV-047',
			conductorId: 'CON-035',
			serviceName: 'TNSTC Deluxe',
			serviceDate: dateOffset(0),
			departureTime: '21:30',
			arrivalTime: '05:45',
			boardingStopId: 'madurai-mattuthavani',
			destinationStopId: 'chennai-cmbt',
			platform: '09',
			status: 'cancelled',
			baseFare: 34000,
			taxes: 2500,
			seatsAvailable: 44,
			sellable: false,
			canonical: false,
			highlights: []
		},

		/* -------------------------------------------------- yesterday: completed */
		{
			id: 'tnstc-deluxe-1430-prev',
			code: 'TRIP-096',
			routeId: 'coimbatore-chennai',
			busId: 'bus-tn52g3307',
			driverId: 'DRV-052',
			conductorId: 'CON-038',
			serviceName: 'TNSTC Deluxe',
			serviceDate: dateOffset(-1),
			departureTime: '14:30',
			arrivalTime: '23:10',
			boardingStopId: 'coimbatore-gandhipuram',
			destinationStopId: 'chennai-cmbt',
			platform: '05',
			status: 'completed',
			baseFare: 45000,
			taxes: 3500,
			seatsAvailable: 0,
			sellable: false,
			canonical: false,
			highlights: []
		},

		/* ---------------------------------------------------- tomorrow: scheduled */
		{
			id: 'setc-ultra-deluxe-0830-d1',
			code: 'TRIP-021',
			routeId: 'salem-chennai',
			busId: 'bus-tn01an1234',
			driverId: 'DRV-014',
			conductorId: 'CON-023',
			serviceName: 'SETC Ultra Deluxe',
			serviceDate: dateOffset(1),
			departureTime: '08:30',
			arrivalTime: '13:45',
			boardingStopId: 'salem-new-bus-stand',
			destinationStopId: 'chennai-cmbt',
			platform: '04',
			status: 'scheduled',
			baseFare: 38000,
			taxes: 3000,
			seatsAvailable: 31,
			// Only today's departures fill the traveller timetable in this build,
			// so a future running is scheduled but not yet on sale.
			sellable: false,
			canonical: false,
			highlights: []
		},

		/* ------------------ +7 days: the same bus, a different corridor ---------
		   TN 01 AN 1234 ran Salem → Chennai as TRIP-001 above. Here it runs
		   Salem → Bangalore with a different driver and conductor. Same vehicle,
		   different route, different crew, different date. */
		{
			id: 'setc-bangalore-0915',
			code: 'TRIP-042',
			routeId: 'salem-bangalore',
			busId: 'bus-tn01an1234',
			driverId: 'DRV-019',
			conductorId: 'CON-031',
			serviceName: 'SETC Ultra Deluxe',
			serviceDate: dateOffset(7),
			departureTime: '09:15',
			arrivalTime: '15:00',
			boardingStopId: 'salem-new-bus-stand',
			destinationStopId: 'bangalore-majestic',
			platform: '02',
			status: 'scheduled',
			baseFare: 32000,
			taxes: 2500,
			seatsAvailable: 40,
			sellable: false,
			canonical: false,
			highlights: []
		}
	];
}
