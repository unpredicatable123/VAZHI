<script>
import Icon from '$components/primitives/Icon.svelte';
import Skeleton from '$components/primitives/Skeleton.svelte';
import * as m from '$lib/paraglide/messages';
import { getRouteGeometry } from '$services/routes.service';
import { preferences } from '$stores/preferences.svelte';
import { theme } from '$stores/theme.svelte';
import { buildMapStyle } from './map-style';
let { routeId, label, interactive = true, class: className = '', overlay, vehicle = null } = $props();
let container = $state(null);
let geometry = $state(null);
let status = $state('loading');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let map = null;
let resizeObserver = null;
const mapTilerKey = import.meta.env.VITE_MAPTILER_KEY?.trim() || undefined;
const padding = $derived(interactive ? 48 : 28);
/**
 * Guards against a remount landing on top of an in-flight one.
 *
 * The route id is now a live prop — the Explorer changes it whenever the
 * journey changes — so the effect can re-run while a previous `mount` is
 * still awaiting geometry or the maplibre import. Each run takes a token and
 * abandons itself if a newer run has started, which stops two map instances
 * ever attaching to the same container.
 */
let mountToken = 0;
async function mount() {
    if (!container)
        return;
    const token = ++mountToken;
    const stale = () => token !== mountToken;
    status = 'loading';
    const result = await getRouteGeometry(routeId, fetch);
    if (stale())
        return;
    if (result.status === 'error') {
        status = 'error';
        return;
    }
    geometry = result.data;
    try {
        // Give the route its first two paints before evaluating MapLibre. Its
        // module and worker setup are sizeable and used to make an immediate
        // post-navigation click feel ignored on slower devices.
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        if (stale())
            return;
        const maplibre = await import('maplibre-gl');
        await import('maplibre-gl/dist/maplibre-gl.css');
        // MapLibre resolves its worker against its own module URL, which Vite
        // does not rewrite for a pre-bundled dependency. Pointing it at the
        // worker Vite emitted keeps the bundle self-contained.
        const { default: workerUrl } = await import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url');
        maplibre.setWorkerUrl(workerUrl);
        if (stale())
            return;
        const instance = new maplibre.Map({
            container,
            style: buildMapStyle(result.data, theme.resolved, vehicle, mapTilerKey),
            bounds: result.data.bounds,
            fitBoundsOptions: { padding },
            attributionControl: { compact: false },
            interactive,
            dragRotate: false,
            pitchWithRotate: false,
            touchZoomRotate: interactive
        });
        // A newer run started while the map was being constructed: throw this
        // one away rather than leaving it attached to the container.
        if (stale()) {
            instance.remove();
            return;
        }
        map = instance;
        map.on('load', () => {
            if (stale())
                return;
            status = 'ready';
        });
        // The rail changes height at the md breakpoint and when the sticky
        // column settles, so track the box rather than measuring once.
        resizeObserver?.disconnect();
        resizeObserver = new ResizeObserver(() => map?.resize());
        resizeObserver.observe(container);
        // The canvas is decorative; the stop list below is the accessible
        // equivalent, so keep it out of the tab order.
        map.getCanvas().setAttribute('tabindex', '-1');
    }
    catch {
        status = 'error';
    }
}
$effect(() => {
    // `routeId` is read inside `mount` before its first await, so a change to
    // it re-runs this effect and redraws the corridor.
    mount();
    return () => {
        // Invalidates any in-flight mount as well as tearing down this one.
        mountToken++;
        resizeObserver?.disconnect();
        resizeObserver = null;
        map?.remove();
        map = null;
    };
});
// Repaint the style when the theme flips, keeping the current viewport.
$effect(() => {
    const mode = theme.resolved;
    if (!map || !geometry || status !== 'ready')
        return;
    map.setStyle(buildMapStyle(geometry, mode, vehicle, mapTilerKey));
});
// Move the simulated vehicle without rebuilding the whole style.
$effect(() => {
    const position = vehicle;
    if (!map || status !== 'ready')
        return;
    const source = map.getSource('vehicle');
    if (!source)
        return;
    source.setData({
        type: 'FeatureCollection',
        features: position
            ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: position }, properties: {} }]
            : []
    });
});
function zoom(delta) {
    if (!map)
        return;
    map.easeTo({
        zoom: map.getZoom() + delta,
        duration: preferences.reducedMotion ? 0 : 250
    });
}
function reset() {
    if (!map || !geometry)
        return;
    map.fitBounds(geometry.bounds, {
        padding,
        duration: preferences.reducedMotion ? 0 : 400
    });
}
</script>

<div class={`relative isolate overflow-hidden ${className}`}>
	<!--
		Sized with h-full rather than absolute inset-0: maplibre-gl.css forces
		`position: relative` on `.maplibregl-map`, which would collapse an
		absolutely positioned container to zero height.
	-->
	<div
		bind:this={container}
		class="h-full w-full"
		role="img"
		aria-label={label}
		aria-busy={status === 'loading'}
	></div>

	{#if status === 'loading'}
		<div class="absolute inset-0 bg-surface-container">
			<Skeleton width="100%" height="100%" radius="sm" />
		</div>
	{/if}

	{#if status === 'error'}
		<div class="absolute inset-0 overflow-y-auto bg-surface-container p-4">
			<div class="flex items-start gap-2 text-text-muted">
				<Icon name="info" size={20} />
				<div>
					<p class="text-body font-semibold text-text">{m.map_unavailable_title()}</p>
					<p class="text-body-sm">{m.map_unavailable_body()}</p>
				</div>
			</div>
			{#if geometry}
				<h3 class="mt-4 text-caps uppercase text-text-muted">{m.map_stops_title()}</h3>
				<ol class="mt-2 space-y-1">
					{#each geometry.stops as stop (stop.properties.stopId)}
						<li class="text-body-sm text-text">{stop.properties.name}</li>
					{/each}
				</ol>
			{/if}
		</div>
	{/if}

	{#if overlay}
		<!-- Overlay children opt back into pointer events individually so the map
		     stays draggable around them. -->
		<div class="pointer-events-none absolute inset-0 flex flex-col gap-3 p-4">
			{@render overlay(geometry)}
		</div>
	{/if}

	{#if interactive && status === 'ready'}
		<div class="absolute top-4 right-4 flex flex-col gap-1 rounded-[8px] border border-border
			bg-surface/95 p-1 shadow-level-1 backdrop-blur">
			<button
				type="button"
				onclick={() => zoom(1)}
				aria-label={m.map_zoom_in()}
				class="flex h-11 w-11 items-center justify-center rounded-[6px] text-text-muted
					hover:bg-surface-container hover:text-text"
			>
				<Icon name="plus" size={18} />
			</button>
			<button
				type="button"
				onclick={() => zoom(-1)}
				aria-label={m.map_zoom_out()}
				class="flex h-11 w-11 items-center justify-center rounded-[6px] text-text-muted
					hover:bg-surface-container hover:text-text"
			>
				<Icon name="minus" size={18} />
			</button>
			<button
				type="button"
				onclick={reset}
				aria-label={m.map_reset()}
				class="flex h-11 w-11 items-center justify-center rounded-[6px] text-text-muted
					hover:bg-surface-container hover:text-text"
			>
				<Icon name="target" size={18} />
			</button>
		</div>
	{/if}
</div>
