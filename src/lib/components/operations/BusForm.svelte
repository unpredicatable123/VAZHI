<script lang="ts">
	import Button from '$components/primitives/Button.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import Input from '$components/primitives/Input.svelte';
	import Select from '$components/primitives/Select.svelte';
	import Toggle from '$components/primitives/Toggle.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { BusDraft, BusIssue, BusFieldError } from '$services/fleet.service';
	import type { Bus } from '$types/fleet';
	import type { CabinClass, SeatLayout } from '$types/transit';

	/**
	 * Add or edit a vehicle.
	 *
	 * Vehicle facts only — plate, operator, class, capacity, fittings. There is
	 * deliberately no route, no departure, and no crew on this form, because a
	 * bus does not have any of those: they belong to the trip it is assigned to.
	 * That is the rule the whole trip model rests on, and a form is the easiest
	 * place to break it by accident.
	 *
	 * A sleeper is selected by class here; the seat plan follows from it, which
	 * is what gives the booking flow its two-tier berth canvas.
	 */

	interface Props {
		/** The vehicle being edited, or `null` when adding. */
		editing: Bus | null;
		issues?: BusIssue[];
		saving?: boolean;
		onsave: (draft: BusDraft) => void;
		oncancel: () => void;
	}

	let { editing, issues = [], saving = false, onsave, oncancel }: Props = $props();

	let registrationNumber = $state('');
	let operator = $state('');
	let serviceType = $state('');
	let cabinClass = $state<string>('ultra_deluxe');
	let seatLayout = $state<string>('2+2');
	let totalSeats = $state('44');
	let airConditioned = $state(true);
	let chargingPoints = $state(true);
	let restStop = $state(true);
	let accessibleBoardingPoint = $state(false);

	/*
		Seeds the fields, and re-seeds when the form is pointed at a different
		vehicle. This is the only place `editing` is read into the fields:
		initialising from it as well would capture just the first value, so
		opening Edit on a second row would keep the first row's details.
	*/
	$effect(() => {
		registrationNumber = editing?.registrationNumber ?? '';
		operator = editing?.operator ?? '';
		serviceType = editing?.serviceType ?? '';
		cabinClass = editing?.cabinClass ?? 'ultra_deluxe';
		seatLayout = editing?.seatLayout ?? '2+2';
		totalSeats = String(editing?.totalSeats ?? 44);
		airConditioned = editing?.amenities.airConditioned ?? true;
		chargingPoints = editing?.amenities.chargingPoints ?? true;
		restStop = editing?.amenities.restStop ?? true;
		accessibleBoardingPoint = editing?.accessibleBoardingPoint ?? false;
	});

	/* A sleeper is 2+1 in practice, so choosing the class moves the layout with
	   it rather than leaving an implausible combination selected. */
	$effect(() => {
		if (cabinClass === 'sleeper') seatLayout = '2+1';
	});

	function errorFor(field: BusFieldError): string | undefined {
		const issue = issues.find((entry) => entry.field === field);
		if (!issue) return undefined;
		switch (issue.messageKey) {
			case 'ops_bus_error_plate_required':
				return m.ops_bus_error_plate_required();
			case 'ops_bus_error_plate_format':
				return m.ops_bus_error_plate_format();
			case 'ops_bus_error_plate_taken':
				return m.ops_bus_error_plate_taken();
			case 'ops_bus_error_operator':
				return m.ops_bus_error_operator();
			case 'ops_bus_error_service_type':
				return m.ops_bus_error_service_type();
			case 'ops_bus_error_seats':
				return m.ops_bus_error_seats();
			default:
				return undefined;
		}
	}

	const classOptions = [
		{ value: 'express', label: m.ops_class_express() },
		{ value: 'deluxe', label: m.ops_class_deluxe() },
		{ value: 'ultra_deluxe', label: m.ops_class_ultra_deluxe() },
		{ value: 'sleeper', label: m.ops_class_sleeper() }
	];

	const layoutOptions = [
		{ value: '2+2', label: '2+2' },
		{ value: '2+1', label: '2+1' }
	];

	function submit(event: SubmitEvent) {
		event.preventDefault();
		onsave({
			id: editing?.id,
			registrationNumber,
			operator,
			serviceType,
			cabinClass: cabinClass as CabinClass,
			seatLayout: seatLayout as SeatLayout,
			totalSeats: Number.parseInt(totalSeats, 10),
			airConditioned,
			chargingPoints,
			restStop,
			accessibleBoardingPoint
		});
	}
</script>

<form
	class="flex flex-col gap-5 rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
	onsubmit={submit}
	novalidate
>
	<h3 class="flex items-center gap-2 text-title text-text">
		<span class="text-primary-soft-text"><Icon name="bus" size={20} /></span>
		{editing ? m.ops_bus_edit() : m.ops_bus_add()}
	</h3>

	<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
		<Input
			id="bus-plate"
			label={m.ops_field_plate()}
			bind:value={registrationNumber}
			placeholder="TN 01 AN 1234"
			icon="id-card"
			error={errorFor('registrationNumber')}
			required
		/>

		<Input
			id="bus-operator"
			label={m.ops_field_operator()}
			bind:value={operator}
			placeholder="SETC"
			icon="hub"
			error={errorFor('operator')}
			required
		/>

		<Input
			id="bus-service-type"
			label={m.ops_field_service_type()}
			bind:value={serviceType}
			placeholder="SETC Ultra Deluxe"
			icon="bus"
			error={errorFor('serviceType')}
			required
			class="sm:col-span-2"
		/>

		<Select
			id="bus-class"
			label={m.ops_field_cabin_class()}
			bind:value={cabinClass}
			options={classOptions}
			icon="seat"
		/>

		<Select
			id="bus-layout"
			label={m.ops_field_layout()}
			bind:value={seatLayout}
			options={layoutOptions}
			icon="sliders"
		/>

		<Input
			id="bus-seats"
			label={m.ops_field_total_seats()}
			type="number"
			bind:value={totalSeats}
			icon="seat"
			error={errorFor('totalSeats')}
			required
		/>
	</div>

	<!--
		Each fitting names itself on screen and the switch points at that name with
		`labelledBy`. `Toggle` is a bare switch — its `label` prop only sets an
		accessible name and renders nothing — so a row without visible text beside
		it is a blank row, which is what these were.
	-->
	<fieldset class="flex flex-col gap-1 border-t border-border pt-4">
		<legend class="text-caps uppercase text-text-muted">{m.ops_field_fittings()}</legend>

		<div class="flex items-center justify-between gap-4 py-1">
			<span id="bus-ac-label" class="text-body text-text">{m.amenity_ac()}</span>
			<Toggle id="bus-ac" labelledBy="bus-ac-label" bind:checked={airConditioned} />
		</div>

		<div class="flex items-center justify-between gap-4 py-1">
			<span id="bus-charging-label" class="text-body text-text">{m.amenity_charging()}</span>
			<Toggle id="bus-charging" labelledBy="bus-charging-label" bind:checked={chargingPoints} />
		</div>

		<div class="flex items-center justify-between gap-4 py-1">
			<span id="bus-rest-label" class="text-body text-text">{m.amenity_rest_stop()}</span>
			<Toggle id="bus-rest" labelledBy="bus-rest-label" bind:checked={restStop} />
		</div>

		<div class="flex items-center justify-between gap-4 py-1">
			<span id="bus-accessible-label" class="text-body text-text">{m.amenity_accessible()}</span>
			<Toggle
				id="bus-accessible"
				labelledBy="bus-accessible-label"
				bind:checked={accessibleBoardingPoint}
			/>
		</div>
	</fieldset>

	<div class="flex flex-wrap gap-3">
		<Button type="submit" iconLeft="check" loading={saving}>{m.ops_action_save()}</Button>
		<Button variant="ghost" onclick={oncancel}>{m.ops_action_cancel()}</Button>
	</div>
</form>
