import { networkEdges, networkNodes } from '$lib/mocks/network.mock';
import type { NetworkNode, Position } from '$types/geo';

/**
 * Routing across the intercity road network.
 *
 * WHY. Two stops with no shared corridor used to be joined by one straight line
 * ruled across the state — Tiruppur to Salem cut diagonally over open country
 * instead of going through Erode, which is where the road goes. Walking the
 * bundled road graph instead makes the line bend at the towns the road bends at.
 *
 * WHAT THIS IS NOT. The graph holds town centroids, not surveyed carriageway
 * geometry, so a path through it approximates the corridor rather than tracing
 * the road. Getting the true shape needs real road data, which this build does
 * not fetch from anywhere. The smoothing below rounds the joins so the result
 * reads as a route rather than as a ruler, but it is still an approximation and
 * should not be presented as a surveyed alignment.
 *
 * Everything here is synchronous and pure, so route resolution can run inside a
 * `$derived` without awaiting anything.
 */

const nodeById = new Map<string, NetworkNode>(networkNodes.map((node) => [node.id, node]));

/**
 * How close a town has to be to a stop to count as the same place.
 *
 * ~0.2 degrees, roughly 20 km here. Below that a waypoint would sit on top of
 * the terminus and add nothing to the drawn line.
 */
const SAME_PLACE_SQ = 0.2 * 0.2;

/** Adjacency, built once. The graph is undirected. */
const adjacency = (() => {
	const map = new Map<string, string[]>();
	for (const [a, b] of networkEdges) {
		if (!nodeById.has(a) || !nodeById.has(b)) continue;
		map.set(a, [...(map.get(a) ?? []), b]);
		map.set(b, [...(map.get(b) ?? []), a]);
	}
	return map;
})();

/** Squared planar distance. Fine for comparisons over one state. */
function squaredDistance(a: Position, b: Position): number {
	const dx = a[0] - b[0];
	const dy = a[1] - b[1];
	return dx * dx + dy * dy;
}

/**
 * The network town closest to a point.
 *
 * A bookable stand maps onto the town it sits in — Tiruppur New Bus Stand onto
 * `tiruppur` — so a journey between two stands can be routed across the graph.
 */
export function nearestNetworkNode(point: Position): NetworkNode | null {
	let best: NetworkNode | null = null;
	let bestDistance = Number.POSITIVE_INFINITY;
	for (const node of networkNodes) {
		const distance = squaredDistance(node.coordinates, point);
		if (distance < bestDistance) {
			bestDistance = distance;
			best = node;
		}
	}
	return best;
}

/**
 * Shortest path between two towns, by road distance.
 *
 * Dijkstra over 27 nodes and 31 edges — small enough that the simple
 * linear-scan frontier costs nothing and keeps the code readable.
 */
export function shortestPath(fromId: string, toId: string): NetworkNode[] {
	if (fromId === toId) {
		const single = nodeById.get(fromId);
		return single ? [single] : [];
	}
	if (!nodeById.has(fromId) || !nodeById.has(toId)) return [];

	const distances = new Map<string, number>([[fromId, 0]]);
	const previous = new Map<string, string>();
	const settled = new Set<string>();

	for (;;) {
		let current: string | null = null;
		let currentDistance = Number.POSITIVE_INFINITY;
		for (const [id, distance] of distances) {
			if (settled.has(id)) continue;
			if (distance < currentDistance) {
				currentDistance = distance;
				current = id;
			}
		}
		if (current === null) break;
		if (current === toId) break;

		settled.add(current);
		const here = nodeById.get(current)!;

		for (const neighbourId of adjacency.get(current) ?? []) {
			if (settled.has(neighbourId)) continue;
			const neighbour = nodeById.get(neighbourId);
			if (!neighbour) continue;

			const step = Math.sqrt(squaredDistance(here.coordinates, neighbour.coordinates));
			const candidate = currentDistance + step;
			if (candidate < (distances.get(neighbourId) ?? Number.POSITIVE_INFINITY)) {
				distances.set(neighbourId, candidate);
				previous.set(neighbourId, current);
			}
		}
	}

	if (!distances.has(toId)) return [];

	const path: NetworkNode[] = [];
	let cursor: string | undefined = toId;
	while (cursor !== undefined) {
		const node = nodeById.get(cursor);
		if (node) path.unshift(node);
		cursor = previous.get(cursor);
	}
	return path[0]?.id === fromId ? path : [];
}

/**
 * The towns a journey between two points passes through.
 *
 * The endpoints' own towns are dropped when they duplicate the journey's
 * termini: a journey from Tiruppur New Bus Stand does not need a waypoint
 * labelled Tiruppur a few hundred metres away.
 */
export function waypointsBetween(from: Position, to: Position): NetworkNode[] {
	const start = nearestNetworkNode(from);
	const end = nearestNetworkNode(to);
	if (!start || !end || start.id === end.id) return [];

	const path = shortestPath(start.id, end.id);
	if (path.length < 2) return [];

	/*
		An endpoint town is dropped only when it is effectively the terminus
		itself. Tiruppur New Bus Stand is in Tiruppur, so a waypoint there says
		nothing — but Omalur is a good half hour out of Salem, so Salem is a real
		leg of a journey ending at Omalur and has to stay on the line.
	*/
	const trimmed = [...path];
	if (squaredDistance(trimmed[0].coordinates, from) < SAME_PLACE_SQ) trimmed.shift();
	if (
		trimmed.length > 0 &&
		squaredDistance(trimmed[trimmed.length - 1].coordinates, to) < SAME_PLACE_SQ
	) {
		trimmed.pop();
	}
	return trimmed;
}

/* -------------------------------------------------------------- smoothing */

/** Roughly how many points a drawn line should end up with. */
const TARGET_VERTICES = 160;

/**
 * Rounds a polyline through its own points.
 *
 * A centripetal Catmull-Rom spline: it passes exactly through every input
 * point — so the line still meets each town and each terminus — while curving
 * between them instead of turning a hard corner. The centripetal
 * parameterisation is the variant that will not overshoot into a loop when two
 * points sit close together, which matters here because town spacing is uneven.
 *
 * This makes an approximate corridor *look* like a road. It does not make it
 * one; see the note at the top of this module.
 */
export function smoothPath(points: Position[], segmentsPerSpan?: number): Position[] {
	if (points.length < 3) return [...points];

	/*
		Aim for a similar total vertex count whatever the input density, so a
		three-town path and an already-detailed polyline come out equally smooth
		rather than one being coarse and the other enormous.
	*/
	const spans = points.length - 1;
	const density =
		segmentsPerSpan ?? Math.min(16, Math.max(2, Math.round(TARGET_VERTICES / spans)));

	/*
		Phantom ends, reflected rather than duplicated.

		Duplicating an endpoint puts two identical points next to each other,
		which makes the centripetal knot spacing zero — the guard below then
		fires on the first and last span and the curve silently degrades to the
		straight line it was meant to replace. Reflecting keeps the spacing real.
	*/
	const first = points[0];
	const second = points[1];
	const last = points[points.length - 1];
	const penultimate = points[points.length - 2];

	const padded: Position[] = [
		[2 * first[0] - second[0], 2 * first[1] - second[1]],
		...points,
		[2 * last[0] - penultimate[0], 2 * last[1] - penultimate[1]]
	];
	const out: Position[] = [];

	const knot = (a: Position, b: Position, t: number) =>
		t + Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), 0.5);

	for (let i = 1; i < padded.length - 2; i++) {
		const p0 = padded[i - 1];
		const p1 = padded[i];
		const p2 = padded[i + 1];
		const p3 = padded[i + 2];

		const t0 = 0;
		const t1 = knot(p0, p1, t0);
		const t2 = knot(p1, p2, t1);
		const t3 = knot(p2, p3, t2);

		// Coincident points collapse the parameterisation; fall back to the
		// straight span rather than dividing by zero.
		if (t1 === t0 || t2 === t1 || t3 === t2) {
			out.push(p1);
			continue;
		}

		for (let step = 0; step < density; step++) {
			const t = t1 + ((t2 - t1) * step) / density;

			const a1 = lerp(p0, p1, (t1 - t) / (t1 - t0), (t - t0) / (t1 - t0));
			const a2 = lerp(p1, p2, (t2 - t) / (t2 - t1), (t - t1) / (t2 - t1));
			const a3 = lerp(p2, p3, (t3 - t) / (t3 - t2), (t - t2) / (t3 - t2));

			const b1 = lerp(a1, a2, (t2 - t) / (t2 - t0), (t - t0) / (t2 - t0));
			const b2 = lerp(a2, a3, (t3 - t) / (t3 - t1), (t - t1) / (t3 - t1));

			out.push(lerp(b1, b2, (t2 - t) / (t2 - t1), (t - t1) / (t2 - t1)));
		}
	}

	out.push(points[points.length - 1]);
	return out;
}

/** Weighted blend of two positions. */
function lerp(a: Position, b: Position, wa: number, wb: number): Position {
	return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb];
}
