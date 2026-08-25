import { routeFixtures } from '$lib/mocks/routes.mock';
import { stopFixtures } from '$lib/mocks/stops.mock';
import type { ServiceResult } from '$types/common';
import type { RouteGeometry, StopFeature } from '$types/geo';
import type { RouteStop, TransitRoute } from '$types/fleet';
import { fetchJson } from './transport';
import { smoothPath, waypointsBetween } from './network.service';

/**
 * Route geometry.
 *
 * Two corridors ship a hand-drawn polyline under `static/geo`; every other
 * corridor is drawn from the coordinates its stops already carry. That is what
 * lets the map show the journey the traveller actually asked about instead of
 * falling back to one hard-coded route — the bug this module exists to prevent.
 *
 * Nothing here contacts a tile server, basemap host, or third-party image URL.
 * The bundled files and the fixture coordinates are the only sources.
 */

const GEO_PATHS: Record<string, string> = {
	'salem-chennai': '/geo/salem-chennai.json',
	'tn-network': '/geo/tn-network.json'
};

const cache = new Map<string, RouteGeometry>();

/**
 * Identifier for a corridor that has no route fixture.
 *
 * Encoded rather than looked up, so a search between any two stops still names
 * a corridor the map can resolve. `corridorId` and `parseCorridorId` are the
 * only two places that know the shape.
 */
const CORRIDOR_PREFIX = 'corridor:';

export function corridorId(originStopId: string, destinationStopId: string): string {
	return `${CORRIDOR_PREFIX}${originStopId}~${destinationStopId}`;
}

function parseCorridorId(routeId: string): [string, string] | null {
	if (!routeId.startsWith(CORRIDOR_PREFIX)) return null;
	const [origin, destination] = routeId.slice(CORRIDOR_PREFIX.length).split('~');
	if (!origin || !destination) return null;
	return [origin, destination];
}

const REVERSED_SUFFIX = ':reversed';
const SEGMENT_PREFIX = 'segment:';

function reversedId(routeId: string): string {
	return `${routeId}${REVERSED_SUFFIX}`;
}

/**
 * Identifier for part of a corridor.
 *
 * A journey is very often a sub-span of a longer route — Coimbatore → Salem
 * rides the Coimbatore → Chennai corridor but gets off less than half way. The
 * corridor is the right thing to draw *along*, but only between the two stops
 * the traveller actually chose, so the span is encoded into the id and the
 * route is sliced when it is resolved.
 */
function segmentId(routeId: string, originStopId: string, destinationStopId: string): string {
	return `${SEGMENT_PREFIX}${routeId}:${originStopId}~${destinationStopId}`;
}

/** A fixture id never contains a colon, so the first one splits the id cleanly. */
function parseSegmentId(routeId: string): { baseId: string; from: string; to: string } | null {
	if (!routeId.startsWith(SEGMENT_PREFIX)) return null;
	const rest = routeId.slice(SEGMENT_PREFIX.length);
	const separator = rest.indexOf(':');
	if (separator === -1) return null;
	const [from, to] = rest.slice(separator + 1).split('~');
	if (!from || !to) return null;
	return { baseId: rest.slice(0, separator), from, to };
}

/**
 * The corridor to draw for a journey between two stops.
 *
 * Prefers a real route, in this order:
 *
 *  1. a corridor whose own termini are the two stops — the whole route, and the
 *     only case that can use a bundled hand-drawn polyline as-is;
 *  2. the same corridor worked in the opposite direction;
 *  3. a corridor that calls at both stops, sliced to just that span, so a
 *     journey ending half way along never draws the rest of the line;
 *  4. an ad-hoc corridor between the two stops when nothing serves them.
 */
export function routeIdForJourney(originStopId: string, destinationStopId: string): string {
	if (originStopId === destinationStopId) return corridorId(originStopId, destinationStopId);

	for (const route of routeFixtures) {
		const from = route.stops.findIndex((stop) => stop.stopId === originStopId);
		const to = route.stops.findIndex((stop) => stop.stopId === destinationStopId);
		if (from === -1 || to === -1) continue;

		const last = route.stops.length - 1;
		if (from === 0 && to === last) return route.id;
		if (from === last && to === 0) return reversedId(route.id);

		// Part of the corridor: carry the span so the map draws only that much.
		return segmentId(route.id, originStopId, destinationStopId);
	}

	return corridorId(originStopId, destinationStopId);
}

/**
 * Length of a run of stops, as the sum of the hops between them.
 *
 * Uses the routed detour factor: the run already passes through the towns the
 * road goes through, so each hop is close to a straight road.
 */
function pathLengthKm(stops: RouteStop[]): number {
	let total = 0;
	for (let i = 1; i < stops.length; i++) {
		total += roadDistanceKm(stops[i - 1].coordinates, stops[i].coordinates, ROUTED_DETOUR);
	}
	return total;
}

/**
 * Re-labels a run of stops so the first is an origin and the last a destination.
 *
 * A stop that was a mid-corridor timing point becomes a terminus when the span
 * ends there, and the map draws terminus pins differently from intermediate
 * ones.
 */
function reRole(stops: RouteStop[]): RouteStop[] {
	return stops.map((stop, index) => ({
		...stop,
		role:
			index === 0
				? ('origin' as const)
				: index === stops.length - 1
					? ('destination' as const)
					: ('intermediate' as const)
	}));
}

/**
 * The route record behind an id, including the two derived forms.
 *
 * A reversed route is the fixture with its stops turned around and its roles
 * corrected, so the running order reads correctly from the other end. An ad-hoc
 * corridor is built from the two stops' own coordinates.
 */
export function resolveRoute(routeId: string): TransitRoute | null {
	const direct = routeFixtures.find((route) => route.id === routeId);
	if (direct) return direct;

	if (routeId.endsWith(REVERSED_SUFFIX)) {
		const base = routeFixtures.find(
			(route) => route.id === routeId.slice(0, -REVERSED_SUFFIX.length)
		);
		if (!base) return null;

		const stops = reRole([...base.stops].reverse());

		return {
			id: routeId,
			// The corridor is the same road; only the direction of travel flips.
			name: `${stops[0].name} → ${stops[stops.length - 1].name}`,
			nameTa: `${stops[0].nameTa} → ${stops[stops.length - 1].nameTa}`,
			stops,
			distanceKm: base.distanceKm
		};
	}

	const segment = parseSegmentId(routeId);
	if (segment) {
		const base = routeFixtures.find((route) => route.id === segment.baseId);
		if (!base) return null;

		const from = base.stops.findIndex((stop) => stop.stopId === segment.from);
		const to = base.stops.findIndex((stop) => stop.stopId === segment.to);
		if (from === -1 || to === -1 || from === to) return null;

		// Slice to the span actually travelled, then turn it round if the
		// journey runs against the corridor's own direction.
		const span =
			from < to
				? base.stops.slice(from, to + 1)
				: base.stops.slice(to, from + 1).reverse();
		const stops = reRole(span);

		// Apportion the corridor's authored distance across the span rather than
		// re-estimating it, so a part journey stays consistent with the whole.
		const wholeLength = pathLengthKm(base.stops);
		const spanLength = pathLengthKm(stops);
		const distanceKm =
			wholeLength > 0
				? Math.max(1, Math.round((base.distanceKm * spanLength) / wholeLength))
				: Math.round(spanLength);

		return {
			id: routeId,
			name: `${stops[0].name} → ${stops[stops.length - 1].name}`,
			nameTa: `${stops[0].nameTa} → ${stops[stops.length - 1].nameTa}`,
			stops,
			distanceKm
		};
	}

	const pair = parseCorridorId(routeId);
	if (!pair) return null;

	const [originId, destinationId] = pair;
	const origin = stopFixtures.find((stop) => stop.id === originId);
	const destination = stopFixtures.find((stop) => stop.id === destinationId);
	if (!origin || !destination) return null;

	/*
		Route across the bundled road graph rather than ruling a line between the
		two stops. Tiruppur to Salem comes back through Erode, because that is
		where the road goes, so the drawn line bends at a real place instead of
		cutting across open country.
	*/
	const waypoints = waypointsBetween(origin.coordinates, destination.coordinates);

	const stops: RouteStop[] = [
		{
			stopId: origin.id,
			name: origin.name,
			nameTa: origin.nameTa,
			role: 'origin',
			coordinates: origin.coordinates
		},
		...waypoints.map(
			(town): RouteStop => ({
				stopId: `network:${town.id}`,
				name: town.name,
				nameTa: town.nameTa,
				role: 'intermediate',
				coordinates: town.coordinates
			})
		),
		{
			stopId: destination.id,
			name: destination.name,
			nameTa: destination.nameTa,
			role: 'destination',
			coordinates: destination.coordinates
		}
	];

	return {
		id: routeId,
		name: `${origin.name} → ${destination.name}`,
		nameTa: `${origin.nameTa} → ${destination.nameTa}`,
		stops,
		// Along the routed path, not the crow-flies line, so a dog-leg through a
		// junction town is reflected in the distance quoted for the journey.
		distanceKm: Math.max(1, Math.round(pathLengthKm(stops)))
	};
}

/**
 * How much longer a road is than the straight line between two distant points.
 *
 * Applied when nothing is known about the route between them, so it has to
 * absorb the whole detour — going round hills, through junction towns, and so
 * on.
 */
const DIRECT_DETOUR = 1.25;

/**
 * The same factor for one hop of an already-routed path.
 *
 * Much smaller, because the routing has already accounted for the large-scale
 * detour by sending the journey through the towns the road passes. Applying the
 * direct factor to every hop as well double-counts it, and over a six-hop
 * journey the error compounds — Nagercoil to Chennai came out around 12% long
 * before this was split out.
 */
const ROUTED_DETOUR = 1.12;

/**
 * Approximate road distance between two points, in kilometres.
 *
 * Great-circle distance with a detour factor, because roads are not straight
 * lines and an as-the-crow-flies figure would understate every journey. This is
 * an estimate for a demonstration, not a routed distance from a road network.
 */
export function roadDistanceKm(
	a: [number, number],
	b: [number, number],
	detour: number = DIRECT_DETOUR
): number {
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const earthRadiusKm = 6371;
	const [lon1, lat1] = a;
	const [lon2, lat2] = b;

	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

	const straight = 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
	return straight * detour;
}

/**
 * Assembles drawable geometry for a route from a given line.
 *
 * The stop features always come from the route, so the pins mark the stops of
 * the journey rather than every vertex of whatever line was supplied.
 */
function withBounds(route: TransitRoute, line: [number, number][]): RouteGeometry {
	const stops: StopFeature[] = route.stops.map((stop) => ({
		type: 'Feature',
		geometry: { type: 'Point', coordinates: stop.coordinates },
		properties: { stopId: stop.stopId, name: stop.name, role: stop.role }
	}));

	// Round the joins. The spline passes through every input point, so the line
	// still meets each town and terminus exactly; it just stops turning square
	// corners between them.
	const drawn = smoothPath(line);

	// Bound the line and the stops together, so a pin can never sit outside the
	// framed area.
	const points = [...drawn, ...route.stops.map((stop) => stop.coordinates)];
	const lons = points.map(([lon]) => lon);
	const lats = points.map(([, lat]) => lat);
	// A little breathing room so the terminus pins are not against the edge.
	const pad = 0.15;

	return {
		routeId: route.id,
		name: route.name,
		bounds: [
			Math.min(...lons) - pad,
			Math.min(...lats) - pad,
			Math.max(...lons) + pad,
			Math.max(...lats) + pad
		],
		lines: [
			{
				type: 'Feature',
				geometry: { type: 'LineString', coordinates: drawn },
				properties: { routeId: route.id, name: route.name, role: 'active' }
			}
		],
		stops
	};
}

/** Turns a route's own stop coordinates into drawable geometry. */
function geometryFromRoute(route: TransitRoute): RouteGeometry {
	return withBounds(
		route,
		route.stops.map((stop) => stop.coordinates)
	);
}

/** Index of the polyline vertex closest to a point. */
function nearestVertex(line: [number, number][], point: [number, number]): number {
	let best = 0;
	let bestDistance = Number.POSITIVE_INFINITY;
	for (let i = 0; i < line.length; i++) {
		const dx = line[i][0] - point[0];
		const dy = line[i][1] - point[1];
		const distance = dx * dx + dy * dy;
		if (distance < bestDistance) {
			bestDistance = distance;
			best = i;
		}
	}
	return best;
}

/**
 * Cuts a hand-drawn polyline down to one span of a corridor.
 *
 * Keeps the road shape a bundled route was authored with instead of falling
 * back to straight hops between stops, which is the difference between a line
 * that follows the highway and one that cuts across country. The span's own
 * terminus coordinates replace the first and last vertex so the line starts and
 * ends exactly on the stops rather than at whichever vertex was nearest.
 */
function sliceGeometry(base: RouteGeometry, route: TransitRoute): RouteGeometry {
	const line = (base.lines[0]?.geometry.coordinates ?? []) as [number, number][];
	const first = route.stops[0];
	const last = route.stops[route.stops.length - 1];

	let coordinates: [number, number][];
	if (line.length < 2) {
		coordinates = route.stops.map((stop) => stop.coordinates);
	} else {
		const startIndex = nearestVertex(line, first.coordinates);
		const endIndex = nearestVertex(line, last.coordinates);
		coordinates =
			startIndex <= endIndex
				? line.slice(startIndex, endIndex + 1)
				: line.slice(endIndex, startIndex + 1).reverse();

		if (coordinates.length < 2) coordinates = [first.coordinates, last.coordinates];
		else {
			coordinates = [...coordinates];
			coordinates[0] = first.coordinates;
			coordinates[coordinates.length - 1] = last.coordinates;
		}
	}

	return withBounds(route, coordinates);
}

export async function getRouteGeometry(
	routeId: string,
	fetcher: typeof globalThis.fetch = globalThis.fetch
): Promise<ServiceResult<RouteGeometry>> {
	const cached = cache.get(routeId);
	if (cached) return { status: 'ok', data: cached };

	// A hand-drawn polyline where one exists — it follows the road rather than
	// cutting between stops.
	const path = GEO_PATHS[routeId];
	if (path) {
		try {
			const fetched = await fetchJson<RouteGeometry>(path, fetcher);
			// Smoothed like every other line, so a bundled corridor and a routed
			// one are drawn with the same weight of curve.
			const geometry: RouteGeometry = {
				...fetched,
				lines: fetched.lines.map((line) => ({
					...line,
					geometry: {
						...line.geometry,
						coordinates: smoothPath(line.geometry.coordinates as [number, number][])
					}
				}))
			};
			cache.set(routeId, geometry);
			return { status: 'ok', data: geometry };
		} catch {
			return { status: 'error', error: { code: 'network', messageKey: 'map_unavailable_body' } };
		}
	}

	const route = resolveRoute(routeId);
	if (!route) {
		return { status: 'error', error: { code: 'not_found', messageKey: 'map_unavailable_body' } };
	}

	// A span of, or the reverse of, a corridor that ships a polyline keeps that
	// polyline's shape. Everything else is drawn from the stops themselves.
	const segment = parseSegmentId(routeId);
	const baseId = segment
		? segment.baseId
		: routeId.endsWith(REVERSED_SUFFIX)
			? routeId.slice(0, -REVERSED_SUFFIX.length)
			: null;

	if (baseId && GEO_PATHS[baseId]) {
		const baseGeometry = await getRouteGeometry(baseId, fetcher);
		if (baseGeometry.status === 'ok') {
			const sliced = sliceGeometry(baseGeometry.data, route);
			cache.set(routeId, sliced);
			return { status: 'ok', data: sliced };
		}
	}

	const geometry = geometryFromRoute(route);
	cache.set(routeId, geometry);
	return { status: 'ok', data: geometry };
}
