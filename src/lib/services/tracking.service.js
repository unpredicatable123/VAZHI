import { getRouteGeometry, routeIdForJourney } from './routes.service';
/**
 * Simulated live tracking.
 *
 * SIMULATION ONLY. Nothing here contacts a vehicle telemetry feed, a TNSTC or
 * government API, or any network service. The position is interpolated along
 * the route geometry already bundled in `static/geo`, driven purely by the
 * clock, and every snapshot is flagged `simulated: true` so the UI can say so.
 */
const SIMULATED_SPEED_KMH = 68;
/** Minutes since midnight, from an `HH:mm` string. */
function minutesOf(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}
function clockOf(totalMinutes) {
    const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
    const hours = Math.floor(wrapped / 60);
    const minutes = Math.round(wrapped % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
/**
 * Fraction of the journey completed right now.
 *
 * Before departure this is 0 and after arrival it is 1, so the screen is
 * coherent whatever time of day it is opened.
 */
function journeyProgress(booking, now) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const start = minutesOf(booking.departure);
    const end = minutesOf(booking.arrival);
    if (end <= start)
        return 0;
    return Math.min(1, Math.max(0, (nowMinutes - start) / (end - start)));
}
/** Walks the route line to the point at `fraction` of its total length. */
function positionAlong(geometry, fraction) {
    const line = geometry.lines[0]?.geometry.coordinates ?? [];
    if (line.length === 0)
        return [0, 0];
    if (line.length === 1 || fraction <= 0)
        return line[0];
    if (fraction >= 1)
        return line[line.length - 1];
    const segmentLengths = [];
    let total = 0;
    for (let i = 1; i < line.length; i++) {
        const dx = line[i][0] - line[i - 1][0];
        const dy = line[i][1] - line[i - 1][1];
        const length = Math.hypot(dx, dy);
        segmentLengths.push(length);
        total += length;
    }
    let travelled = total * fraction;
    for (let i = 0; i < segmentLengths.length; i++) {
        if (travelled <= segmentLengths[i]) {
            const ratio = segmentLengths[i] === 0 ? 0 : travelled / segmentLengths[i];
            return [
                line[i][0] + (line[i + 1][0] - line[i][0]) * ratio,
                line[i][1] + (line[i + 1][1] - line[i][1]) * ratio
            ];
        }
        travelled -= segmentLengths[i];
    }
    return line[line.length - 1];
}
/**
 * The intermediate stops shown in the progress stepper, marked departed,
 * next, or upcoming from the current progress.
 */
function buildStops(booking, geometry, progress) {
    const points = geometry.stops;
    const start = minutesOf(booking.departure);
    const end = minutesOf(booking.arrival);
    const span = Math.max(1, end - start);
    const stops = points.map((feature, index) => {
        const fraction = points.length <= 1 ? 0 : index / (points.length - 1);
        return {
            stopId: feature.properties.stopId,
            name: feature.properties.name,
            fraction,
            time: clockOf(start + span * fraction)
        };
    });
    // Terminal names come from the booking so they always read as the
    // canonical stop names rather than the geometry's shorthand.
    if (stops.length > 0)
        stops[0].name = booking.originName;
    if (stops.length > 1)
        stops[stops.length - 1].name = booking.destinationName;
    const nextIndex = stops.findIndex((stop) => stop.fraction > progress);
    return stops.map((stop, index) => ({
        stopId: stop.stopId,
        name: stop.name,
        time: stop.time,
        state: nextIndex === -1
            ? 'departed'
            : index < nextIndex
                ? 'departed'
                : index === nextIndex
                    ? 'next'
                    : 'upcoming'
    }));
}
export async function getTrackingSnapshot(booking, fetcher = globalThis.fetch, now = new Date()) {
    // The corridor comes from the booking, so tracking follows the journey that
    // was actually booked rather than one hard-coded route.
    const geometryResult = await getRouteGeometry(routeIdForJourney(booking.originStopId, booking.destinationStopId), fetcher);
    if (geometryResult.status === 'error') {
        return { status: 'error', error: geometryResult.error };
    }
    const geometry = geometryResult.data;
    const progress = journeyProgress(booking, now);
    // Distances always sum to the canonical route length.
    const covered = Math.round(booking.distanceKm * progress);
    const remaining = booking.distanceKm - covered;
    return {
        status: 'ok',
        data: {
            pnr: booking.pnr,
            progress,
            distanceCoveredKm: covered,
            distanceRemainingKm: remaining,
            speedKmh: progress > 0 && progress < 1 ? SIMULATED_SPEED_KMH : 0,
            etaArrival: booking.arrival,
            delay: 'on_time',
            delayMinutes: 0,
            position: positionAlong(geometry, progress),
            stops: buildStops(booking, geometry, progress),
            simulated: true
        }
    };
}
