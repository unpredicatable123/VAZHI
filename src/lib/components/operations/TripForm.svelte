<script>
import Button from '$components/primitives/Button.svelte';
import Icon from '$components/primitives/Icon.svelte';
import Input from '$components/primitives/Input.svelte';
import Select from '$components/primitives/Select.svelte';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { crewInRole, listCrew } from '$services/crew.service';
import { listBuses } from '$services/fleet.service';
import { findConflicts, findRoute, listRoutes, syncTrips } from '$services/trips.service';
import { placeName, todayIso } from '$utils/format';
let { onsave, issues = [], conflicts = [], saving = false } = $props();
const locale = $derived(getLocale());
let routes = $state([]);
let buses = $state([]);
const drivers = $derived(crewInRole('driver'));
const conductors = $derived(crewInRole('conductor'));
let routeId = $state('');
let serviceDate = $state(todayIso());
let busId = $state('');
let driverId = $state('');
let conductorId = $state('');
let departureTime = $state('09:00');
let arrivalTime = $state('14:00');
let platform = $state('');
$effect(() => {
    void (async () => {
        const [routeResult, busResult] = await Promise.all([
            listRoutes(),
            listBuses(),
            listCrew(),
            syncTrips()
        ]);
        if (routeResult.status === 'ok') {
            routes = routeResult.data;
            if (routeId === '')
                routeId = routes[0]?.id ?? '';
        }
        if (busResult.status === 'ok') {
            buses = busResult.data;
        }
    })();
});
function getBusStatus(busIdCandidate) {
    if (!serviceDate || !/^\d{2}:\d{2}$/.test(departureTime) || !/^\d{2}:\d{2}$/.test(arrivalTime)) {
        return { available: true };
    }
    const testDraft = {
        routeId,
        serviceDate,
        busId: busIdCandidate,
        driverId: '',
        conductorId: '',
        departureTime,
        arrivalTime,
        platform: ''
    };
    const clashes = findConflicts(testDraft);
    const clash = clashes.find((c) => c.kind === 'bus');
    if (clash) {
        return { available: false, detail: `On Duty (${clash.tripCode})` };
    }
    return { available: true };
}
function getDriverStatus(driverIdCandidate) {
    if (!serviceDate || !/^\d{2}:\d{2}$/.test(departureTime) || !/^\d{2}:\d{2}$/.test(arrivalTime)) {
        return { available: true };
    }
    const testDraft = {
        routeId,
        serviceDate,
        busId: '',
        driverId: driverIdCandidate,
        conductorId: '',
        departureTime,
        arrivalTime,
        platform: ''
    };
    const clashes = findConflicts(testDraft);
    const clash = clashes.find((c) => c.kind === 'driver');
    if (clash) {
        return { available: false, detail: `On Duty (${clash.tripCode})` };
    }
    return { available: true };
}
function getConductorStatus(conductorIdCandidate) {
    if (!serviceDate || !/^\d{2}:\d{2}$/.test(departureTime) || !/^\d{2}:\d{2}$/.test(arrivalTime)) {
        return { available: true };
    }
    const testDraft = {
        routeId,
        serviceDate,
        busId: '',
        driverId: '',
        conductorId: conductorIdCandidate,
        departureTime,
        arrivalTime,
        platform: ''
    };
    const clashes = findConflicts(testDraft);
    const clash = clashes.find((c) => c.kind === 'conductor');
    if (clash) {
        return { available: false, detail: `On Duty (${clash.tripCode})` };
    }
    return { available: true };
}
const routeOptions = $derived(routes.map((route) => ({ value: route.id, label: placeName(route, locale) })));
const busOptions = $derived(buses
    .map((bus) => {
    const status = getBusStatus(bus.id);
    return {
        value: bus.id,
        label: status.available
            ? `✓ [Available] ${bus.registrationNumber} — ${bus.serviceType}`
            : `⚠️ [${status.detail}] ${bus.registrationNumber} — ${bus.serviceType}`,
        available: status.available
    };
})
    .sort((a, b) => (a.available === b.available ? 0 : a.available ? -1 : 1)));
const driverOptions = $derived(drivers
    .map((member) => {
    const status = getDriverStatus(member.id);
    return {
        value: member.id,
        label: status.available
            ? `✓ [Available] ${member.id} — ${member.name}`
            : `⚠️ [${status.detail}] ${member.id} — ${member.name}`,
        available: status.available
    };
})
    .sort((a, b) => (a.available === b.available ? 0 : a.available ? -1 : 1)));
const conductorOptions = $derived(conductors
    .map((member) => {
    const status = getConductorStatus(member.id);
    return {
        value: member.id,
        label: status.available
            ? `✓ [Available] ${member.id} — ${member.name}`
            : `⚠️ [${status.detail}] ${member.id} — ${member.name}`,
        available: status.available
    };
})
    .sort((a, b) => (a.available === b.available ? 0 : a.available ? -1 : 1)));
// Auto-select available resources when options/times change
$effect(() => {
    if (busOptions.length > 0) {
        const currentOpt = busOptions.find((o) => o.value === busId);
        if (!currentOpt || !currentOpt.available) {
            const firstAvail = busOptions.find((o) => o.available);
            if (firstAvail)
                busId = firstAvail.value;
            else if (!busId && busOptions[0])
                busId = busOptions[0].value;
        }
    }
});
$effect(() => {
    if (driverOptions.length > 0) {
        const currentOpt = driverOptions.find((o) => o.value === driverId);
        if (!currentOpt || !currentOpt.available) {
            const firstAvail = driverOptions.find((o) => o.available);
            if (firstAvail)
                driverId = firstAvail.value;
            else if (!driverId && driverOptions[0])
                driverId = driverOptions[0].value;
        }
    }
});
$effect(() => {
    if (conductorOptions.length > 0) {
        const currentOpt = conductorOptions.find((o) => o.value === conductorId);
        if (!currentOpt || !currentOpt.available) {
            const firstAvail = conductorOptions.find((o) => o.available);
            if (firstAvail)
                conductorId = firstAvail.value;
            else if (!conductorId && conductorOptions[0])
                conductorId = conductorOptions[0].value;
        }
    }
});
const draft = $derived({
    routeId,
    serviceDate,
    busId,
    driverId,
    conductorId,
    departureTime,
    arrivalTime,
    platform
});
const liveConflicts = $derived(routeId && busId && driverId && conductorId && /^\d{2}:\d{2}$/.test(departureTime)
    ? findConflicts(draft)
    : []);
const shownConflicts = $derived(liveConflicts.length > 0 ? liveConflicts : conflicts);
const selectedRoute = $derived(findRoute(routeId));
function errorFor(field) {
    const issue = issues.find((entry) => entry.field === field);
    if (!issue)
        return undefined;
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
function conflictLabel(conflict) {
    if (conflict.kind === 'bus')
        return m.ops_conflict_bus({ trip: conflict.tripCode });
    if (conflict.kind === 'driver')
        return m.ops_conflict_driver({ trip: conflict.tripCode });
    return m.ops_conflict_conductor({ trip: conflict.tripCode });
}
function submit(event) {
    event.preventDefault();
    onsave(draft);
}
</script>

<form
	class="flex flex-col gap-5 rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
	onsubmit={submit}
	novalidate
>
	<!-- Availability Summary Indicator -->
	<div class="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-border bg-surface-container p-3 text-body-sm">
		<span class="flex items-center gap-2 font-semibold text-primary-soft-text">
			<Icon name="check" size={18} />
			Resource Availability Status ({serviceDate})
		</span>
		<div class="flex flex-wrap items-center gap-3 text-mono-data text-body-sm">
			<span class="font-bold text-text">{busOptions.filter((o) => o.available).length} Buses Free</span>
			<span class="text-text-muted">•</span>
			<span class="font-bold text-text">{driverOptions.filter((o) => o.available).length} Drivers Free</span>
			<span class="text-text-muted">•</span>
			<span class="font-bold text-text">{conductorOptions.filter((o) => o.available).length} Conductors Free</span>
		</div>
	</div>

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
