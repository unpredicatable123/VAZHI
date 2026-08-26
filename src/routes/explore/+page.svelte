<script>
import { untrack } from 'svelte';
import { page } from '$app/state';
import BookingProgress from '$components/journey/BookingProgress.svelte';
import BusResultList from '$components/transit/BusResultList.svelte';
import RouteSummaryCard from '$components/transit/RouteSummaryCard.svelte';
import SearchFilters from '$components/transit/SearchFilters.svelte';
import TransitMap from '$components/transit/TransitMap.svelte';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { applyFilters, emptyFilters, searchBuses } from '$services/search.service';
import { routeIdForJourney } from '$services/routes.service';
import { preferences } from '$stores/preferences.svelte';
import { journeySearch } from '$stores/search.svelte';
import { formatJourneyDate } from '$utils/format';
let { data } = $props();
function criteriaKey(value) {
    return [
        value.originStopId,
        value.destinationStopId,
        value.date,
        value.passengers,
        value.accessibleTravelMode
    ].join('|');
}
// Seeded from the load function so the prerendered markup already lists the
// canonical service rather than an empty shell. `seed` is read once on
// purpose: it is the starting point that later searches replace.
const seed = untrack(() => data);
let results = $state(seed.initialResults);
let requestState = $state(seed.initialResults.length > 0 ? 'ready' : 'empty');
let loadedKey = $state(criteriaKey(seed.initialCriteria));
let filters = $state({ ...emptyFilters });
const locale = $derived(getLocale());
// Only non-identifying route criteria are ever read from the URL.
$effect(() => {
    journeySearch.hydrateFromParams(page.url.searchParams);
});
const criteria = $derived({
    originStopId: journeySearch.originStopId,
    destinationStopId: journeySearch.destinationStopId,
    date: journeySearch.date,
    passengers: journeySearch.passengers,
    accessibleTravelMode: preferences.accessibleTravelMode
});
const searchParams = $derived(journeySearch.toParams().toString());
/**
 * The corridor the map draws.
 *
 * Derived from the criteria rather than pinned to one route, so the map
 * follows the journey the traveller actually searched for. `routeIdForJourney`
 * prefers a real route — in either direction — and falls back to an ad-hoc
 * corridor between the two stops when none covers the pair.
 */
const mapRouteId = $derived(routeIdForJourney(criteria.originStopId, criteria.destinationStopId));
const originStop = $derived(data.stops.find((stop) => stop.id === criteria.originStopId));
const destinationStop = $derived(data.stops.find((stop) => stop.id === criteria.destinationStopId));
const passengerLabel = $derived(criteria.passengers === 1
    ? m.search_passengers_option_one()
    : m.search_passengers_option({ count: criteria.passengers }));
const journeySummary = $derived(m.explore_journey_summary({
    date: formatJourneyDate(criteria.date, locale),
    passengers: passengerLabel
}));
const visibleResults = $derived(applyFilters(results, filters));
async function runSearch(value) {
    const key = criteriaKey(value);
    loadedKey = key;
    // Refreshing in place: any results already on screen stay put, so changing
    // the criteria never blanks the list.
    if (results.length === 0)
        requestState = 'loading';
    const response = await searchBuses(value);
    // A newer search started while this one was in flight.
    if (loadedKey !== key)
        return;
    if (response.status === 'error') {
        requestState = 'error';
        results = [];
        return;
    }
    results = response.data.results;
    requestState = results.length === 0 ? 'empty' : 'ready';
}
$effect(() => {
    const next = criteria;
    if (criteriaKey(next) === loadedKey)
        return;
    runSearch(next);
});
function toggleFilter(key) {
    filters = { ...filters, [key]: !filters[key] };
}
function setCoach(value) {
    filters = { ...filters, coach: value };
}
function clearFilters() {
    filters = { ...emptyFilters };
}
const listState = $derived(requestState === 'ready' && visibleResults.length === 0 ? 'empty' : requestState);
// No results at all means the corridor carries no timetable in this build;
// results that the chips hid is a different problem with a different fix.
const emptyReason = $derived(results.length === 0 ? 'no-service' : 'filters');
/** Returns the search to the corridor this demonstration build serves. */
function showDemoRoute() {
    journeySearch.originStopId = 'salem-new-bus-stand';
    journeySearch.destinationStopId = 'chennai-cmbt';
    clearFilters();
}
</script>

<svelte:head>
	<title>{m.explore_page_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex flex-1 flex-col md:flex-row">
	<!-- Map rail: full-width banner on mobile, sticky third on desktop. -->
	<div
		class="relative border-b border-border md:sticky md:top-16 md:h-[calc(100vh-4rem)]
			md:w-1/3 md:shrink-0 md:border-r md:border-b-0"
	>
		<TransitMap
			routeId={mapRouteId}
			label={m.map_label()}
			class="h-[260px] w-full md:h-full"
			overlay={mapOverlay}
		/>
	</div>

	<!-- Results -->
	<div class="flex w-full flex-col gap-6 px-4 py-6 md:w-2/3 md:px-6 md:py-8">
		<div class="flex flex-col gap-4">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<h1 class="text-headline-sm text-text md:text-headline">
					{m.explore_results_title()}
				</h1>
				<p class="text-body-sm text-text-muted" aria-live="polite">
					{#if requestState === 'ready' || requestState === 'empty'}
						{visibleResults.length === 1
							? m.explore_results_count_one()
							: m.explore_results_count({ count: visibleResults.length })}
					{/if}
				</p>
			</div>

			<SearchFilters
				{filters}
				{results}
				ontoggle={toggleFilter}
				oncoach={setCoach}
				onclear={clearFilters}
			/>
		</div>

		<BusResultList
			state={listState}
			results={visibleResults}
			stops={data.stops}
			{searchParams}
			onRetry={() => runSearch(criteria)}
			onClearFilters={clearFilters}
			{emptyReason}
			onShowDemoRoute={showDemoRoute}
		/>
	</div>
</div>

{#snippet mapOverlay(_geometry)}
	<RouteSummaryCard
		origin={originStop}
		destination={destinationStop}
		summary={journeySummary}
		editHref={`/?${searchParams}`}
	/>
	<BookingProgress current={1} variant="bar" class="pointer-events-auto mt-auto" />
{/snippet}
