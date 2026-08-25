<script lang="ts">
	import Button from '$components/primitives/Button.svelte';
	import ErrorState from '$components/primitives/ErrorState.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import Skeleton from '$components/primitives/Skeleton.svelte';
	import BusForm from '$components/operations/BusForm.svelte';
	import BusTable from '$components/operations/BusTable.svelte';
	import * as m from '$lib/paraglide/messages';
	import { deleteBus, listBuses, saveBus } from '$services/fleet.service';
	import type { BusDraft, BusIssue } from '$services/fleet.service';
	import { allTrips, currentTripForBus, viewFor } from '$services/trips.service';
	import { session } from '$stores/session.svelte';
	import { toasts } from '$stores/toast.svelte';
	import type { BusRow } from '$components/operations/bus-row';
	import type { AsyncState } from '$types/common';
	import type { Bus } from '$types/fleet';

	/**
	 * Bus management.
	 *
	 * The vehicle records, with what each one is working *looked up through the
	 * trips*. That indirection is the point: the assignment column is a question
	 * answered per day, not a field on the bus, so a vehicle is never pinned to
	 * a corridor here.
	 *
	 * Adding, editing, and retiring all happen on this page rather than behind a
	 * navigation step — a controller correcting a plate should not lose their
	 * place in the list to do it.
	 */

	let rows = $state<BusRow[]>([]);
	let loadState = $state<AsyncState>('loading');

	/** `null` when closed, `'new'` when adding, otherwise the vehicle edited. */
	let editing = $state<Bus | 'new' | null>(null);
	let issues = $state<BusIssue[]>([]);
	let saving = $state(false);

	async function load() {
		loadState = 'loading';
		const result = await listBuses();
		if (result.status === 'error') {
			loadState = 'error';
			return;
		}

		rows = result.data.map((bus) => {
			const trip = currentTripForBus(bus.id);
			const view = trip ? viewFor(trip) : null;
			return { bus, currentTrip: view ?? undefined };
		});
		loadState = 'ready';
	}

	$effect(() => {
		if (session.current?.role === 'operations') load();
	});

	async function save(draft: BusDraft) {
		saving = true;
		issues = [];
		const result = await saveBus(draft);
		saving = false;

		if (result.status === 'error') {
			issues = result.issues ?? [];
			toasts.show(m.ops_bus_error_title(), 'warning');
			return;
		}

		toasts.show(m.ops_bus_saved({ plate: result.data.registrationNumber }), 'success');
		editing = null;
		await load();
	}

	async function remove(bus: Bus) {
		// A vehicle rostered onto a running cannot simply vanish — the trip, its
		// crew, and any ticket all still point at it — so the refusal names the
		// trips standing in the way rather than just failing.
		const result = await deleteBus(bus.id, allTrips());

		if (result.status === 'error') {
			const blocking = result.blockedBy?.map((trip) => trip.code).join(', ');
			toasts.show(
				blocking
					? m.ops_bus_in_use_body({ trips: blocking })
					: m.ops_bus_error_in_use(),
				'warning'
			);
			return;
		}

		toasts.show(m.ops_bus_removed({ plate: bus.registrationNumber }), 'success');
		await load();
	}

	const editingBus = $derived(editing === 'new' || editing === null ? null : editing);
</script>

<svelte:head>
	<title>{m.ops_buses_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
	<header class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h2 class="text-headline-sm text-text md:text-headline">{m.ops_buses_title()}</h2>
			<p class="mt-1 text-body-sm text-text-muted">{m.ops_buses_subtitle()}</p>
		</div>
		{#if editing === null}
			<Button
				iconLeft="plus"
				onclick={() => {
					issues = [];
					editing = 'new';
				}}
			>
				{m.ops_bus_add()}
			</Button>
		{/if}
	</header>

	{#if editing !== null}
		<BusForm
			editing={editingBus}
			{issues}
			{saving}
			onsave={save}
			oncancel={() => {
				editing = null;
				issues = [];
			}}
		/>
	{/if}

	<p
		class="flex items-start gap-2 rounded-[8px] border border-border bg-surface-container p-3
			text-body-sm text-text-muted"
	>
		<span class="mt-0.5 shrink-0 text-primary-soft-text"><Icon name="info" size={16} /></span>
		{m.ops_buses_note()}
	</p>

	{#if loadState === 'loading'}
		<Skeleton width="100%" height="360px" radius="card" />
	{:else if loadState === 'error'}
		<ErrorState title={m.ops_error_title()} body={m.ops_error_body()} onRetry={load} />
	{:else}
		<BusTable
			{rows}
			onedit={(bus) => {
				issues = [];
				editing = bus;
			}}
			onremove={remove}
		/>
	{/if}
</div>
