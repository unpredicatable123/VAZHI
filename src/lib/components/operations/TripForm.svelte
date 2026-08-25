<script lang="ts">
	import Button from '$components/primitives/Button.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import Input from '$components/primitives/Input.svelte';
	import Select from '$components/primitives/Select.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { crewInRole } from '$services/crew.service';
	import { listBuses } from '$services/fleet.service';
	import { findConflicts, findRoute, listRoutes } from '$services/trips.service';
	import type {
		Bus,
		TransitRoute,
		TripConflict,
		TripDraft,
		TripFieldError,
		TripValidationIssue
	} from '$types/fleet';
	import type { Locale } from '$types/preferences';
	import { placeName, todayIso } from '$utils/format';

	/**
	 * Schedule a running.
	 *
	 * This form is the model made visible. The controller picks a corridor, a
	 * date, a vehicle, and a crew, and those four independent choices become one
	 * trip. Nothing is written onto the vehicle — which is exactly why the same
	 * plate can be picked again tomorrow for a different corridor.
	 *
	 * The field order follows the operational order a controller works in:
	 * route → date → bus → driver → conductor → times → platform. Conflicts are
	 * checked live as the choices change, because finding out at save time that
	 * a driver is already out is the wrong moment to find out.
	 */

	interface Props {
		/** Called with a validated draft. Errors come back through `issues`. */
		onsave: (draft: TripDraft) => void;
		/** Field-level problems reported by the service. */
		issues?: TripValidationIssue[];
		/** Double-bookings reported by the service on the last save attempt. */
		conflicts?: TripConflict[];
		saving?: boolean;
	}

	let { onsave, issues = [], conflicts = [], saving = false }: Props = $props();

	const locale = $derived(getLocale() as Locale);

	let routes = $state<TransitRoute[]>([]);
	let buses = $state<Bus[]>([]);
	const drivers = crewInRole('driver');
	const conductors = crewInRole('conductor');

	let routeId = $state('');
	let serviceDate = $state(todayIso());
	let busId = $state('');
	let driverId = $state('');
	let conductorId = $state('');
	let departureTime = $state('09:00');
	let arrivalTime = $state('14:00');
	let platform = $state('');

	// Loading the reference data here rather than in the page keeps the form
	// self-contained: it is the only thing that needs the full fleet list.
	$effect(() => {
		void (async () => {
			const [routeResult, busResult] = await Promise.all([listRoutes(), listBuses()]);
			if (routeResult.status === 'ok') {
				routes = routeResult.data;
				if (routeId === '') routeId = routes[0]?.id ?? '';
			}
			if (busResult.status === 'ok') {
				buses = busResult.data;
				if (busId === '') busId = buses[0]?.id ?? '';
			}
		})();
	});

	$effect(() => {
		if (driverId === '') driverId = drivers[0]?.id ?? '';
		if (conductorId === '') conductorId = conductors[0]?.id ?? '';
	});

	const draft: TripDraft = $derived({
		routeId,
		serviceDate,
		busId,
		driverId,
		conductorId,
		departureTime,
		arrivalTime,
		platform
	});

	/**
	 * Conflicts as the controller types.
	 *
	 * Only run once every resource is chosen, so an incomplete form does not
	 * shout about a clash it cannot yet have.
	 */
	const liveConflicts = $derived(
		routeId && busId && driverId && conductorId && /^\d{2}:\d{2}$/.test(departureTime)
			? findConflicts(draft)
			: []
	);

	const shownConflicts = $derived(liveConflicts.length > 0 ? liveConflicts : conflicts);

	const selectedRoute = $derived(findRoute(routeId));

	function errorFor(field: TripFieldError): string | undefined {
		const issue = issues.find((entry) => entry.field === field);
		if (!issue) return undefined;
		switch (issue.messageKey) {
			case 'ops_trip_error_route':
				return m.ops_trip_error_route();
			case 'ops_trip_error_date':
				return m.ops_trip_error_date();
			case 'ops_trip_error_bus':
				return m.ops_trip_error_bus();
			case 'ops_trip_error_driver':
				return m.ops_trip_error_driver();
			case 'ops_trip_error_conductor':
				return m.ops_trip_error_conductor();
			case 'ops_trip_error_departure':
				return m.ops_trip_error_departure();
			case 'ops_trip_error_arrival':
				return m.ops_trip_error_arrival();
			case 'ops_trip_error_same_time':
				return m.ops_trip_error_same_time();
			default:
				return undefined;
		}
	}

	function conflictLabel(conflict: TripConflict): string {
		if (conflict.kind === 'bus') return m.ops_conflict_bus({ trip: conflict.tripCode });
		if (conflict.kind === 'driver') return m.ops_conflict_driver({ trip: conflict.tripCode });
		return m.ops_conflict_conductor({ trip: conflict.tripCode });
	}

	const routeOptions = $derived(
		routes.map((route) => ({ value: route.id, label: placeName(route, locale) }))
	);
	const busOptions = $derived(
		buses.map((bus) => ({
			value: bus.id,
			label: `${bus.registrationNumber} — ${bus.serviceType}`
		}))
	);
	const driverOptions = drivers.map((member) => ({
		value: member.id,
		label: `${member.id} — ${member.name}`
	}));
	const conductorOptions = conductors.map((member) => ({
		value: member.id,
		label: `${member.id} — ${member.name}`
	}));

	function submit(event: SubmitEvent) {
		event.preventDefault();
		onsave(draft);
	}
</script>

<form
	class="flex flex-col gap-5 rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
	onsubmit={submit}
	novalidate
>
	<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
		<Select
			id="trip-route"
			label={m.ops_field_route()}
			bind:value={routeId}
			options={routeOptions}
			icon="route"
			error={errorFor('routeId')}
			hint={m.ops_field_route_hint()}
			class="sm:col-span-2"
		/>

		<Input
			id="trip-date"
			label={m.ops_field_date()}
			type="date"
			bind:value={serviceDate}
			icon="calendar"
			error={errorFor('serviceDate')}
			required
		/>

		<Select
			id="trip-bus"
			label={m.ops_field_bus()}
			bind:value={busId}
			options={busOptions}
			icon="bus"
			error={errorFor('busId')}
			hint={m.ops_field_bus_hint()}
		/>

		<Select
			id="trip-driver"
			label={m.ops_field_driver()}
			bind:value={driverId}
			options={driverOptions}
			icon="steering"
			error={errorFor('driverId')}
		/>

		<Select
			id="trip-conductor"
			label={m.ops_field_conductor()}
			bind:value={conductorId}
			options={conductorOptions}
			icon="clipboard"
			error={errorFor('conductorId')}
		/>

		<Input
			id="trip-departure"
			label={m.ops_field_departure()}
			bind:value={departureTime}
			placeholder="09:00"
			icon="clock"
			error={errorFor('departureTime')}
			hint={m.ops_field_time_hint()}
			required
		/>

		<Input
			id="trip-arrival"
			label={m.ops_field_arrival()}
			bind:value={arrivalTime}
			placeholder="14:00"
			icon="clock"
			error={errorFor('arrivalTime')}
			hint={m.ops_field_time_hint()}
			required
		/>

		<Input
			id="trip-platform"
			label={m.ops_field_platform()}
			bind:value={platform}
			placeholder="02"
			icon="pin"
			hint={m.ops_field_platform_hint()}
		/>
	</div>

	{#if selectedRoute}
		<!-- The corridor the choice above commits to, in running order, so a
		     controller can see what they have picked without leaving the form. -->
		<div class="rounded-[8px] bg-surface-container p-4">
			<p class="text-caps uppercase text-text-muted">{m.ops_route_preview()}</p>
			<p class="mt-1 text-body-sm text-text">
				{selectedRoute.stops.map((stop) => placeName(stop, locale)).join(' → ')}
			</p>
		</div>
	{/if}

	{#if shownConflicts.length > 0}
		<div role="alert" class="rounded-[8px] border border-danger/40 bg-danger-soft px-3 py-2">
			<p class="flex items-center gap-2 text-body-sm font-semibold text-danger">
				<Icon name="alert" size={16} />
				{m.ops_conflict_title()}
			</p>
			<ul class="mt-1 flex flex-col gap-0.5">
				{#each shownConflicts as conflict (conflict.kind + conflict.tripId)}
					<li class="text-body-sm text-text">{conflictLabel(conflict)}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<Button
		type="submit"
		size="lg"
		iconLeft="plus"
		loading={saving}
		disabled={shownConflicts.length > 0}
	>
		{m.ops_trip_save()}
	</Button>

	<p class="flex items-start gap-2 text-body-sm text-text-faint">
		<span class="mt-0.5 shrink-0"><Icon name="info" size={16} /></span>
		{m.ops_trip_save_note()}
	</p>
</form>
