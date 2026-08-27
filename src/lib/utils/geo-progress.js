const EARTH_RADIUS_METRES = 6_371_000;

function radians(value) {
    return value * Math.PI / 180;
}

/** Great-circle distance between `[longitude, latitude]` points. */
export function distanceMetres(from, to) {
    const lat1 = radians(from[1]);
    const lat2 = radians(to[1]);
    const deltaLat = lat2 - lat1;
    const deltaLon = radians(to[0] - from[0]);
    const a = Math.sin(deltaLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    return 2 * EARTH_RADIUS_METRES * Math.asin(Math.min(1, Math.sqrt(a)));
}

function toLocalMetres(point, latitudeOrigin) {
    return [
        radians(point[0]) * EARTH_RADIUS_METRES * Math.cos(radians(latitudeOrigin)),
        radians(point[1]) * EARTH_RADIUS_METRES
    ];
}

/**
 * Projects a phone location onto the route's stop-to-stop polyline.
 * Route geometry is approximate, so this is progress guidance rather than
 * turn-by-turn navigation.
 */
export function routeLocationProgress(stops, position) {
    const points = stops.map((stop) => stop.coordinates).filter((point) => Array.isArray(point) && point.length === 2);
    if (points.length < 2 || points.length !== stops.length)
        return null;
    const latitudeOrigin = points.reduce((sum, point) => sum + point[1], 0) / points.length;
    const localPoints = points.map((point) => toLocalMetres(point, latitudeOrigin));
    const localPosition = toLocalMetres(position, latitudeOrigin);
    const cumulative = [0];
    for (let index = 1; index < localPoints.length; index++) {
        const dx = localPoints[index][0] - localPoints[index - 1][0];
        const dy = localPoints[index][1] - localPoints[index - 1][1];
        cumulative.push(cumulative[index - 1] + Math.hypot(dx, dy));
    }
    let nearestDistanceSquared = Number.POSITIVE_INFINITY;
    let alongMetres = 0;
    for (let index = 0; index < localPoints.length - 1; index++) {
        const start = localPoints[index];
        const end = localPoints[index + 1];
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const lengthSquared = dx * dx + dy * dy;
        const projection = lengthSquared === 0
            ? 0
            : ((localPosition[0] - start[0]) * dx + (localPosition[1] - start[1]) * dy) / lengthSquared;
        const t = Math.max(0, Math.min(1, projection));
        const projectedX = start[0] + dx * t;
        const projectedY = start[1] + dy * t;
        const distanceSquared = (localPosition[0] - projectedX) ** 2 + (localPosition[1] - projectedY) ** 2;
        if (distanceSquared < nearestDistanceSquared) {
            nearestDistanceSquared = distanceSquared;
            alongMetres = cumulative[index] + Math.sqrt(lengthSquared) * t;
        }
    }
    const totalMetres = cumulative[cumulative.length - 1];
    const progress = totalMetres > 0 ? Math.max(0, Math.min(1, alongMetres / totalMetres)) : 0;
    return {
        progress,
        alongMetres,
        remainingMetres: Math.max(0, totalMetres - alongMetres),
        distanceToRouteMetres: Math.sqrt(nearestDistanceSquared),
        distanceToDestinationMetres: distanceMetres(position, points[points.length - 1])
    };
}

export const destinationArrivalRadiusMetres = 300;
export const maximumArrivalAccuracyMetres = 250;

export function isReliableDestinationArrival(progress, accuracyMetres) {
    return Boolean(progress &&
        Number.isFinite(accuracyMetres) &&
        accuracyMetres <= maximumArrivalAccuracyMetres &&
        progress.distanceToDestinationMetres <= destinationArrivalRadiusMetres);
}
