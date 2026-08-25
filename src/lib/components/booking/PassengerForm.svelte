<script lang="ts">
	import Icon from '$components/primitives/Icon.svelte';
	import Select from '$components/primitives/Select.svelte';
	import * as m from '$lib/paraglide/messages';
	import { passengers } from '$stores/passengers.svelte';
	import type {
		AccessibilityRequirement,
		ConcessionCategory,
		Gender,
		PassengerFieldError,
		SeatId
	} from '$types/booking';

	/**
	 * One passenger form, bound to exactly one selected seat.
	 *
	 * PRIVACY: every value typed here is written straight into the in-memory
	 * passenger store and nowhere else. Nothing on this screen is persisted,
	 * placed in the URL, or logged. Field ids are index-based, never derived
	 * from anything a traveller types.
	 */

	interface Props {
		index: number;
		seatId: SeatId;
		/** Errors currently shown for this form, keyed by field. */
		errors: Partial<Record<PassengerFieldError, string>>;
	}

	let { index, seatId, errors }: Props = $props();

	const entry = $derived(passengers.entries[index]);

	const nameId = $derived(`passenger-${index}-name`);
	const ageId = $derived(`passenger-${index}-age`);
	const genderId = $derived(`passenger-${index}-gender`);

	const genderOptions = $derived([
		{ value: '', label: m.passenger_gender_placeholder() },
		{ value: 'female', label: m.passenger_gender_female() },
		{ value: 'male', label: m.passenger_gender_male() },
		{ value: 'other', label: m.passenger_gender_other() }
	]);

	const concessionOptions = $derived([
		{ value: 'none' as const, label: m.passenger_concession_none() },
		{ value: 'senior' as const, label: m.passenger_concession_senior() },
		{ value: 'student' as const, label: m.passenger_concession_student() },
		{ value: 'pwd' as const, label: m.passenger_concession_pwd() }
	]);

	const accessibilityOptions = $derived([
		{ value: 'none', label: m.passenger_accessibility_none() },
		{ value: 'wheelchair', label: m.passenger_accessibility_wheelchair() },
		{ value: 'mobility', label: m.passenger_accessibility_mobility() },
		{ value: 'visual', label: m.passenger_accessibility_visual() },
		{ value: 'hearing', label: m.passenger_accessibility_hearing() }
	]);

	function onName(event: Event & { currentTarget: HTMLInputElement }) {
		passengers.setFullName(index, event.currentTarget.value);
	}

	function onAge(event: Event & { currentTarget: HTMLInputElement }) {
		const raw = event.currentTarget.value.trim();
		passengers.setAge(index, raw === '' ? null : Number(raw));
	}

	function onGender(value: string) {
		passengers.setGender(index, value as Gender | '');
	}

	function onConcession(value: ConcessionCategory) {
		passengers.setConcession(index, value);
	}

	function onAccessibility(value: string) {
		passengers.setAccessibility(index, value as AccessibilityRequirement);
	}
</script>

{#if entry}
	<section
		class="rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
		aria-labelledby="passenger-{index}-title"
	>
		<div class="flex items-center gap-3 border-b border-border pb-3">
			<span
				class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft
					text-primary-soft-text"
			>
				<Icon name="person" size={18} />
			</span>
			<h2 id="passenger-{index}-title" class="text-title text-text">
				{m.passenger_card_title({ number: index + 1, seat: seatId })}
			</h2>
		</div>

		<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Full name -->
			<div class="flex flex-col gap-2 md:col-span-2">
				<label class="text-caps uppercase text-text-muted" for={nameId}>
					{m.passenger_field_name()}<span aria-hidden="true" class="text-danger"> *</span>
				</label>
				<input
					id={nameId}
					type="text"
					required
					autocomplete="off"
					maxlength="80"
					value={entry.fullName}
					oninput={onName}
					placeholder={m.passenger_field_name_placeholder()}
					aria-invalid={errors.fullName ? 'true' : undefined}
					aria-describedby={errors.fullName ? `${nameId}-error` : undefined}
					class="h-11 w-full rounded-[8px] border bg-background px-3 text-body text-text
						placeholder:text-text-faint transition-colors focus:border-primary
						focus:outline-none focus:ring-2 focus:ring-primary/45
						{errors.fullName ? 'border-danger' : 'border-border-strong'}"
				/>
				{#if errors.fullName}
					<p id="{nameId}-error" class="flex items-center gap-1.5 text-body-sm text-danger">
						<Icon name="alert" size={16} />
						{errors.fullName}
					</p>
				{/if}
			</div>

			<!-- Age -->
			<div class="flex flex-col gap-2">
				<label class="text-caps uppercase text-text-muted" for={ageId}>
					{m.passenger_field_age()}<span aria-hidden="true" class="text-danger"> *</span>
				</label>
				<input
					id={ageId}
					type="number"
					required
					inputmode="numeric"
					min="1"
					max="120"
					step="1"
					autocomplete="off"
					value={entry.age ?? ''}
					oninput={onAge}
					placeholder={m.passenger_field_age_placeholder()}
					aria-invalid={errors.age ? 'true' : undefined}
					aria-describedby={errors.age ? `${ageId}-error` : undefined}
					class="h-11 w-full rounded-[8px] border bg-background px-3 text-body text-text
						placeholder:text-text-faint transition-colors focus:border-primary
						focus:outline-none focus:ring-2 focus:ring-primary/45
						{errors.age ? 'border-danger' : 'border-border-strong'}"
				/>
				{#if errors.age}
					<p id="{ageId}-error" class="flex items-center gap-1.5 text-body-sm text-danger">
						<Icon name="alert" size={16} />
						{errors.age}
					</p>
				{/if}
			</div>

			<!-- Gender -->
			<Select
				id={genderId}
				label={m.passenger_field_gender()}
				value={entry.gender}
				options={genderOptions}
				error={errors.gender}
				onchange={onGender}
			/>
		</div>

		<!-- Concession request -->
		<fieldset class="mt-5 border-t border-border pt-4">
			<legend class="mb-2 text-caps uppercase text-text-muted">
				{m.passenger_field_concession()}
			</legend>
			<div class="flex flex-wrap gap-2">
				{#each concessionOptions as option (option.value)}
					{@const active = entry.concession === option.value}
					<label
						class="flex min-h-[44px] cursor-pointer items-center rounded-[8px] border px-4
							text-body-sm transition-colors
							{active
							? 'border-primary bg-primary-soft font-semibold text-primary-soft-text'
							: 'border-border text-text hover:bg-surface-container'}"
					>
						<input
							type="radio"
							name="concession-{index}"
							value={option.value}
							checked={active}
							onchange={() => onConcession(option.value)}
							class="sr-only"
						/>
						{option.label}
					</label>
				{/each}
			</div>
			<p class="mt-2 text-body-sm text-text-faint">{m.passenger_concession_note()}</p>
		</fieldset>

		<!-- Accessibility requirement -->
		<div class="mt-5 border-t border-border pt-4">
			<Select
				id="passenger-{index}-accessibility"
				label={`${m.passenger_field_accessibility()} (${m.passenger_field_accessibility_optional()})`}
				value={entry.accessibility}
				options={accessibilityOptions}
				onchange={onAccessibility}
				class="md:w-2/3"
			/>
			<p class="mt-2 text-body-sm text-text-faint">{m.passenger_accessibility_note()}</p>
		</div>
	</section>
{/if}
