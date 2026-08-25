<script lang="ts">
	import Card from '$components/primitives/Card.svelte';
	import EmptyState from '$components/primitives/EmptyState.svelte';
	import ErrorState from '$components/primitives/ErrorState.svelte';
	import Skeleton from '$components/primitives/Skeleton.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { AsyncState } from '$types/common';
	import type { BusResult, TransitStop } from '$types/transit';
	import BusResultCard from './BusResultCard.svelte';

	interface Props {
		state: AsyncState;
		results: BusResult[];
		stops: TransitStop[];
		searchParams?: string;
		onRetry?: () => void;
		onClearFilters?: () => void;
		/**
		 * Why the list is empty.
		 *
		 * `filters` means the corridor has services but the chips hid them, so
		 * clearing the chips helps. `no-service` means this demonstration build
		 * carries no timetable for the chosen districts, where clearing a filter
		 * would change nothing and offering it would be misleading.
		 */
		emptyReason?: 'filters' | 'no-service';
		onShowDemoRoute?: () => void;
	}

	let {
		state,
		results,
		stops,
		searchParams = '',
		onRetry,
		onClearFilters,
		emptyReason = 'filters',
		onShowDemoRoute
	}: Props = $props();

	function stopFor(id: string): TransitStop | undefined {
		return stops.find((stop) => stop.id === id);
	}
</script>

<div aria-busy={state === 'loading'} class="flex flex-col gap-4">
	{#if state === 'loading' || state === 'idle'}
		<p class="sr-only" aria-live="polite">{m.explore_loading()}</p>
		{#each [0, 1, 2] as placeholder (placeholder)}
			<Card padding="md">
				<div class="flex flex-col gap-4">
					<div class="flex items-center gap-3">
						<Skeleton width="44px" height="44px" radius="sm" />
						<div class="flex flex-1 flex-col gap-2">
							<Skeleton width="55%" height="20px" />
							<Skeleton width="40%" height="14px" />
						</div>
					</div>
					<Skeleton width="100%" height="56px" />
					<div class="flex items-end justify-between gap-4">
						<Skeleton width="30%" height="36px" />
						<Skeleton width="128px" height="44px" />
					</div>
				</div>
			</Card>
		{/each}
	{:else if state === 'error'}
		<ErrorState title={m.explore_error_title()} body={m.explore_error_body()} {onRetry} />
	{:else if results.length === 0 && emptyReason === 'no-service'}
		<EmptyState
			title={m.search_no_service_title()}
			body={m.search_no_service_body()}
			icon="route"
			action={onShowDemoRoute ? demoRouteAction : undefined}
		/>
	{:else if results.length === 0}
		<EmptyState
			title={m.explore_empty_title()}
			body={m.explore_empty_body()}
			icon="bus"
			action={onClearFilters ? clearAction : undefined}
		/>
	{:else}
		{#each results as bus (bus.id)}
			<BusResultCard
				{bus}
				originStop={stopFor(bus.originStopId)}
				destinationStop={stopFor(bus.destinationStopId)}
				{searchParams}
			/>
		{/each}
	{/if}
</div>

{#snippet clearAction()}
	<button
		type="button"
		onclick={onClearFilters}
		class="flex min-h-[44px] items-center rounded-[8px] border-[1.5px] border-primary px-5
			text-body-sm font-semibold text-primary-soft-text hover:bg-primary-soft"
	>
		{m.explore_filters_clear()}
	</button>
{/snippet}

{#snippet demoRouteAction()}
	<button
		type="button"
		onclick={onShowDemoRoute}
		class="flex min-h-[44px] items-center rounded-[8px] border-[1.5px] border-primary px-5
			text-body-sm font-semibold text-primary-soft-text hover:bg-primary-soft"
	>
		{m.search_no_service_action()}
	</button>
{/snippet}
