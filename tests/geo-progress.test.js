import {
    destinationArrivalRadiusMetres,
    distanceMetres,
    isReliableDestinationArrival,
    maximumArrivalAccuracyMetres,
    routeLocationProgress
} from '../src/lib/utils/geo-progress.js';

let pass = 0;
let fail = 0;
function check(label, condition, detail = '') {
    if (condition) {
        pass++;
        console.log(`  ok    ${label}${detail ? ` — ${detail}` : ''}`);
    }
    else {
        fail++;
        console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
    }
}

const stops = [
    { coordinates: [78, 12] },
    { coordinates: [79, 12] },
    { coordinates: [80, 12] }
];

console.log('ROUTE PROJECTION\n');
const quarter = routeLocationProgress(stops, [78.5, 12]);
check('a position on the first leg maps to 25%', Math.abs(quarter.progress - 0.25) < 0.001, String(quarter.progress));
check('remaining distance follows the route', quarter.remainingMetres > quarter.alongMetres);
const offRoute = routeLocationProgress(stops, [79, 12.2]);
check('an off-route phone fix projects onto the corridor', Math.abs(offRoute.progress - 0.5) < 0.001);
check('distance from the corridor is reported', offRoute.distanceToRouteMetres > 20_000);
check('missing stop coordinates are refused', routeLocationProgress([...stops, {}], [79, 12]) === null);

console.log('\nDISTANCE AND ARRIVAL SAFETY\n');
const destination = [80, 12];
check('distance to the same coordinate is zero', distanceMetres(destination, destination) === 0);
const atDestination = routeLocationProgress(stops, destination);
check('the destination maps to 100%', atDestination.progress === 1);
check('an accurate destination fix is accepted', isReliableDestinationArrival(atDestination, 20));
check('an inaccurate fix cannot complete a trip', !isReliableDestinationArrival(atDestination, maximumArrivalAccuracyMetres + 1));
const outsideRadius = { ...atDestination, distanceToDestinationMetres: destinationArrivalRadiusMetres + 1 };
check('a fix outside the arrival radius is refused', !isReliableDestinationArrival(outsideRadius, 20));

console.log(`\n--- ${pass} passed, ${fail} failed ---`);
process.exit(fail ? 1 : 0);
