import assert from 'node:assert/strict';
import { stopFixtures } from '../src/lib/mocks/stops.mock.js';
import { deriveOffers, findDerivedOffer } from '../src/lib/services/timetable.service.js';

const date = '2026-09-15';
let corridors = 0;

for (const origin of stopFixtures) {
    for (const destination of stopFixtures) {
        if (origin.id === destination.id)
            continue;

        const offers = deriveOffers({
            originStopId: origin.id,
            destinationStopId: destination.id,
            date,
            passengers: 1,
            accessibleTravelMode: false
        });

        assert.ok(offers.length >= 3, `${origin.id} → ${destination.id} needs at least three demo services`);
        assert.equal(new Set(offers.map((offer) => offer.id)).size, offers.length, 'service ids must be unique');

        for (const offer of offers) {
            assert.equal(offer.originStopId, origin.id);
            assert.equal(offer.destinationStopId, destination.id);
            assert.ok(offer.durationMinutes > 0, `${offer.id} needs a duration`);
            assert.ok(offer.distanceKm > 0, `${offer.id} needs a distance`);
            assert.ok(offer.baseFare > 0, `${offer.id} needs a fare`);
            assert.ok(offer.seatsAvailable > 0, `${offer.id} needs selectable seats`);
        }

        const restored = findDerivedOffer(offers[0].id);
        assert.equal(restored?.id, offers[0].id, 'a demo service must survive a booking-page reload');
        corridors++;
    }
}

const nextDate = deriveOffers({
    originStopId: stopFixtures[0].id,
    destinationStopId: stopFixtures[1].id,
    date: '2026-09-16',
    passengers: 1,
    accessibleTravelMode: false
});
const firstDate = deriveOffers({
    originStopId: stopFixtures[0].id,
    destinationStopId: stopFixtures[1].id,
    date,
    passengers: 1,
    accessibleTravelMode: false
});
assert.notEqual(nextDate[0].id, firstDate[0].id, 'different service dates need different booking ids');
assert.deepEqual(deriveOffers({
    originStopId: stopFixtures[0].id,
    destinationStopId: stopFixtures[0].id,
    date,
    passengers: 1,
    accessibleTravelMode: false
}), [], 'the same stop at both ends must remain invalid');

console.log(`Verified universal traveller timetable coverage for ${corridors} selectable corridors.`);
