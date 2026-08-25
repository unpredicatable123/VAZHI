import assert from 'node:assert/strict';
import { demoAccounts } from '../src/lib/mocks/accounts.mock';
import { busFixtures } from '../src/lib/mocks/buses.mock';
import { busFleetFixtures } from '../src/lib/mocks/fleet.mock';
import { crewFixtures } from '../src/lib/mocks/crew.mock';
import { routeFixtures } from '../src/lib/mocks/routes.mock';
import { stopFixtures } from '../src/lib/mocks/stops.mock';
import { tripFixtures } from '../src/lib/mocks/trips.mock';
import { buildDeck } from '../src/lib/services/deck.service';
import { calculateFare } from '../src/lib/services/fare.service';
import { tripToOffer } from '../src/lib/services/offer';

const corridors = [
	['coimbatore-chennai', 'coimbatore-gandhipuram', 'chennai-cmbt'],
	['madurai-chennai', 'madurai-mattuthavani', 'chennai-cmbt'],
	['bangalore-chennai', 'bangalore-majestic', 'chennai-cmbt'],
	['trichy-chennai', 'trichy-central', 'chennai-cmbt'],
	['salem-bangalore', 'salem-new-bus-stand', 'bangalore-majestic']
] as const;

const trips = tripFixtures();
assert.equal(new Set(trips.map((trip) => trip.id)).size, trips.length, 'trip ids must be unique');
assert.equal(new Set(trips.map((trip) => trip.code)).size, trips.length, 'trip codes must be unique');
assert.equal(
	new Set(busFleetFixtures.map((bus) => bus.id)).size,
	busFleetFixtures.length,
	'bus ids must be unique'
);

for (const [routeId, originStopId, destinationStopId] of corridors) {
	const route = routeFixtures.find((candidate) => candidate.id === routeId);
	assert.ok(route, `${routeId} route must exist`);
	assert.ok(route.distanceKm > 0, `${routeId} must have a distance`);
	assert.ok(stopFixtures.some((stop) => stop.id === originStopId), `${originStopId} must be selectable`);
	assert.ok(
		stopFixtures.some((stop) => stop.id === destinationStopId),
		`${destinationStopId} must be selectable`
	);

	const services = trips.filter(
		(trip) =>
			trip.routeId === routeId &&
			trip.boardingStopId === originStopId &&
			trip.destinationStopId === destinationStopId &&
			trip.sellable &&
			trip.status === 'scheduled'
	);
	assert.ok(services.length >= 2, `${routeId} must expose at least two bookable services`);

	const offers = services.map((trip) => {
		const bus = busFleetFixtures.find((candidate) => candidate.id === trip.busId);
		assert.ok(bus, `${trip.code} must reference a bus`);
		assert.ok(crewFixtures.some((member) => member.id === trip.driverId && member.role === 'driver'));
		assert.ok(
			crewFixtures.some(
				(member) => member.id === trip.conductorId && member.role === 'conductor'
			)
		);

		const offer = tripToOffer(trip, bus, route);
		assert.ok(busFixtures.some((candidate) => candidate.id === trip.id), `${trip.code} must reach Explore`);
		assert.ok(offer.durationMinutes > 0, `${trip.code} duration must be non-zero`);
		assert.ok(offer.distanceKm > 0, `${trip.code} distance must be non-zero`);
		assert.ok(offer.baseFare > 0 && offer.taxes > 0, `${trip.code} fare must be complete`);
		assert.ok(offer.seatsAvailable > 0, `${trip.code} must have seats to book`);
		assert.equal(
			calculateFare(offer, 2).total,
			(offer.baseFare + offer.taxes) * 2,
			`${trip.code} must use the shared booking fare calculation`
		);

		const deck = buildDeck({
			serviceId: trip.id,
			kind: bus.cabinClass === 'sleeper' ? 'sleeper' : 'seater',
			layout: bus.seatLayout,
			totalSeats: bus.totalSeats,
			seatsAvailable: trip.seatsAvailable,
			accessibleBoardingPoint: bus.accessibleBoardingPoint
		});
		assert.equal(
			deck.seats.filter((seat) => seat.availability === 'available').length,
			trip.seatsAvailable,
			`${trip.code} seat plan must match its availability count`
		);
		return offer;
	});

	assert.ok(offers.some((offer) => offer.accessibleBoardingPoint), `${routeId} needs step-free service`);
	assert.ok(offers.some((offer) => offer.amenities.airConditioned), `${routeId} needs an A/C service`);
	assert.ok(offers.some((offer) => !offer.amenities.airConditioned), `${routeId} needs a non-A/C service`);
	assert.ok(offers.some((offer) => offer.cabinClass === 'sleeper'), `${routeId} needs a sleeper`);
	assert.ok(offers.some((offer) => offer.cabinClass !== 'sleeper'), `${routeId} needs a seater`);
}

assert.equal(
	trips.filter(
		(trip) =>
			trip.boardingStopId === 'chennai-cmbt' &&
			trip.destinationStopId === 'madurai-mattuthavani' &&
			trip.sellable
	).length,
	0,
	'Chennai → Madurai remains deliberately unseeded'
);

for (const identifier of ['DRV-061', 'CON-061']) {
	assert.ok(
		demoAccounts.some((account) => account.identifier === identifier),
		`${identifier} needs seeded Firebase credentials`
	);
}

console.log(`Verified ${corridors.length} additional demo corridors and ${trips.length} trip fixtures.`);
