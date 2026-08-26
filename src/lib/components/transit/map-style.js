/**
 * Builds a complete MapLibre style in memory.
 *
 * When a MapTiler key is available, its streets raster sits between the offline
 * canvas and the bundled route geometry. The canvas remains in the style so a
 * missing key or unavailable tile service degrades cleanly without losing the
 * route, stops, or vehicle marker.
 */
const palette = {
    light: {
        land: '#F2F2EC',
        haze: '#E7E9E1',
        routeActive: '#4A7C59',
        routeCasing: '#FFFFFF',
        routeNetwork: '#86A789',
        stopFill: '#FFFFFF',
        stopStroke: '#4A7C59',
        terminalFill: '#4A7C59',
        terminalStroke: '#FFFFFF'
    },
    dark: {
        land: '#1B1F1D',
        haze: '#232725',
        routeActive: '#86A789',
        routeCasing: '#141716',
        routeNetwork: '#4A5C4E',
        stopFill: '#141716',
        stopStroke: '#86A789',
        terminalFill: '#86A789',
        terminalStroke: '#141716'
    }
};
export function buildMapStyle(geometry, mode,
/** Simulated vehicle position, when a live-tracking view supplies one. */
vehicle, mapTilerKey) {
    const c = palette[mode];
    const isNetwork = geometry.lines.some((line) => line.properties.role === 'network');
    const basemapSource = {};
    if (mapTilerKey) {
        basemapSource.basemap = {
            type: 'raster',
            tiles: [
                `https://api.maptiler.com/maps/streets-v4/{z}/{x}/{y}.png?key=${encodeURIComponent(mapTilerKey)}`
            ],
            tileSize: 512,
            attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
        };
    }
    return {
        version: 8,
        // No external glyph or sprite host; every layer below is geometry only.
        sources: {
            ...basemapSource,
            routes: {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: geometry.lines }
            },
            stops: {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: geometry.stops }
            },
            vehicle: {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: vehicle
                        ? [
                            {
                                type: 'Feature',
                                geometry: { type: 'Point', coordinates: vehicle },
                                properties: {}
                            }
                        ]
                        : []
                }
            }
        },
        layers: [
            {
                id: 'canvas',
                type: 'background',
                paint: { 'background-color': c.land }
            },
            ...(mapTilerKey
                ? [
                    {
                        id: 'basemap',
                        type: 'raster',
                        source: 'basemap'
                    }
                ]
                : []),
            {
                id: 'route-casing',
                type: 'line',
                source: 'routes',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                    'line-color': c.routeCasing,
                    'line-width': isNetwork ? 4 : 8,
                    'line-opacity': 0.9
                }
            },
            {
                id: 'route-line',
                type: 'line',
                source: 'routes',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                    'line-color': [
                        'match',
                        ['get', 'role'],
                        'active',
                        c.routeActive,
                        c.routeNetwork
                    ],
                    'line-width': isNetwork ? 2 : 5
                }
            },
            {
                id: 'stop-intermediate',
                type: 'circle',
                source: 'stops',
                filter: ['!=', ['get', 'role'], 'origin'],
                paint: {
                    'circle-radius': isNetwork ? 3.5 : 5,
                    'circle-color': c.stopFill,
                    'circle-stroke-color': c.stopStroke,
                    'circle-stroke-width': 2
                }
            },
            {
                id: 'stop-terminal',
                type: 'circle',
                source: 'stops',
                filter: [
                    'any',
                    ['==', ['get', 'role'], 'origin'],
                    ['==', ['get', 'role'], 'destination'],
                    ['==', ['get', 'role'], 'hub']
                ],
                paint: {
                    'circle-radius': isNetwork ? 4.5 : 7,
                    'circle-color': c.terminalFill,
                    'circle-stroke-color': c.terminalStroke,
                    'circle-stroke-width': 2.5
                }
            },
            {
                // Simulated vehicle: a haloed dot so it reads clearly against the
                // route line in both themes.
                id: 'vehicle-halo',
                type: 'circle',
                source: 'vehicle',
                paint: {
                    'circle-radius': 16,
                    'circle-color': c.routeActive,
                    'circle-opacity': 0.2
                }
            },
            {
                id: 'vehicle-dot',
                type: 'circle',
                source: 'vehicle',
                paint: {
                    'circle-radius': 8,
                    'circle-color': c.routeActive,
                    'circle-stroke-color': c.terminalStroke,
                    'circle-stroke-width': 3
                }
            }
        ]
    };
}
