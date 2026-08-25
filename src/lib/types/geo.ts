/**
 * Minimal GeoJSON shapes for the map layer.
 *
 * VAZHI renders maps from bundled GeoJSON over a flat generated style, so no
 * tile server, basemap host, or third-party image URL is contacted at runtime.
 */

export type Position = [number, number];

export interface LineStringGeometry {
	type: 'LineString';
	coordinates: Position[];
}

export interface PointGeometry {
	type: 'Point';
	coordinates: Position;
}

export interface RouteFeature {
	type: 'Feature';
	geometry: LineStringGeometry;
	properties: {
		routeId: string;
		name: string;
		/** `active` paints in primary, `network` paints in the light accent. */
		role: 'active' | 'network';
	};
}

export interface StopFeature {
	type: 'Feature';
	geometry: PointGeometry;
	properties: {
		stopId: string;
		name: string;
		role: 'origin' | 'destination' | 'intermediate' | 'hub';
	};
}

export interface RouteGeometry {
	routeId: string;
	name: string;
	/** [west, south, east, north] */
	bounds: [number, number, number, number];
	lines: RouteFeature[];
	stops: StopFeature[];
}

export interface FeatureCollection<F> {
	type: 'FeatureCollection';
	features: F[];
}

/* ------------------------------------------------------------ road network */

/**
 * A town on the intercity road network.
 *
 * A routing waypoint, not a bookable stop: it is somewhere a road passes
 * through, which is what lets a journey between two stops bend at the places
 * the road actually bends.
 */
export interface NetworkNode {
	id: string;
	name: string;
	nameTa: string;
	/** [longitude, latitude] — GeoJSON order. */
	coordinates: Position;
}

/** An undirected road link between two network towns. */
export type NetworkEdge = [string, string];
