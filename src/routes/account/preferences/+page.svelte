<script lang="ts">
	import PreferenceRow from '$components/account/PreferenceRow.svelte';
	import AccessibleTravelModeCard from '$components/journey/AccessibleTravelModeCard.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import Select from '$components/primitives/Select.svelte';
	import LanguageSelector from '$components/shell/LanguageSelector.svelte';
	import ThemeSelector from '$components/shell/ThemeSelector.svelte';
	import * as m from '$lib/paraglide/messages';
	import { notifications } from '$stores/notifications.svelte';
	import type { BoardingReminderLead } from '$types/booking';

	/**
	 * Travel Preferences (specification section 8).
	 *
	 * Accessible Travel Mode, language, theme, notification settings, and the
	 * privacy-safe comfort option. Everything here is a device setting: no
	 * phone number, email address, or medical information is requested, and
	 * nothing identifying is stored.
	 *
	 * Changes apply immediately — there is no save step to lose, which is
	 * kinder than the Stitch design's "Save Preferences" button.
	 */

	$effect(() => {
		if (!notifications.initialised) notifications.init();
	});

	const reminderOptions = $derived([
		{ value: 'off', label: m.prefs_reminder_off() },
		{ value: '15', label: m.prefs_reminder_15() },
		{ value: '30', label: m.prefs_reminder_30() },
		{ value: '60', label: m.prefs_reminder_60() }
	]);
</script>

<svelte:head>
	<title>{m.prefs_page_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
	<header>
		<h2 class="text-headline-sm text-text md:text-headline">{m.prefs_heading()}</h2>
		<p class="mt-1 text-body-sm text-text-muted">{m.prefs_subtitle()}</p>
	</header>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- App settings -->
		<section
			class="rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
			aria-labelledby="prefs-app"
		>
			<h3 id="prefs-app" class="border-b border-border pb-3 text-title text-text">
				{m.prefs_app_section()}
			</h3>

			<div class="mt-4 flex flex-col gap-5">
				<div>
					<p class="text-body font-semibold text-text">{m.language_label()}</p>
					<p class="mb-2 text-body-sm text-text-muted">{m.prefs_language_hint()}</p>
					<LanguageSelector variant="menu" hideLegend />
				</div>

				<div>
					<p class="text-body font-semibold text-text">{m.theme_label()}</p>
					<p class="mb-2 text-body-sm text-text-muted">{m.prefs_theme_hint()}</p>
					<ThemeSelector variant="menu" hideLegend />
				</div>
			</div>
		</section>

		<!-- Accessibility and comfort -->
		<section
			class="rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
			aria-labelledby="prefs-access"
		>
			<h3 id="prefs-access" class="border-b border-border pb-3 text-title text-text">
				{m.prefs_access_section()}
			</h3>

			<div class="mt-4 flex flex-col gap-3">
				<AccessibleTravelModeCard
					variant="inline"
					showCompanions
					id="accessible-travel-mode"
				/>

				<PreferenceRow
					id="women-nearby-signals"
					icon="person"
					title={m.prefs_women_nearby_title()}
					hint={m.prefs_women_nearby_hint()}
					checked={notifications.womenNearbySignals}
					onchange={(value) => notifications.setWomenNearbySignals(value)}
				/>
			</div>
		</section>

		<!-- Notifications and boarding -->
		<section
			class="rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
			aria-labelledby="prefs-notify"
		>
			<h3 id="prefs-notify" class="border-b border-border pb-3 text-title text-text">
				{m.prefs_notify_section()}
			</h3>

			<div class="mt-4 flex flex-col gap-2">
				<PreferenceRow
					id="push-enabled"
					icon="bell"
					title={m.prefs_push_title()}
					hint={m.prefs_push_hint()}
					checked={notifications.pushEnabled}
					onchange={(value) => notifications.setPushEnabled(value)}
				/>

				<PreferenceRow
					id="disruption-alerts"
					icon="alert"
					title={m.prefs_disruption_title()}
					hint={m.prefs_disruption_hint()}
					checked={notifications.disruptionAlerts}
					onchange={(value) => notifications.setDisruptionAlerts(value)}
				/>

				<PreferenceRow
					id="boarding-reminder"
					icon="clock"
					title={m.prefs_reminder_title()}
					hint={m.prefs_reminder_hint()}
					control={reminderControl}
				/>
			</div>

			<p class="mt-3 flex items-start gap-2 text-body-sm text-text-faint">
				<span class="mt-0.5 shrink-0"><Icon name="shield" size={16} /></span>
				{m.prefs_notify_no_contact()}
			</p>
		</section>

		<!-- Privacy and safety -->
		<section
			class="rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
			aria-labelledby="prefs-privacy"
		>
			<h3 id="prefs-privacy" class="border-b border-border pb-3 text-title text-text">
				{m.prefs_privacy_section()}
			</h3>

			<div class="mt-4 flex flex-col gap-3">
				<p class="flex items-start gap-2 text-body-sm text-text-muted">
					<span class="mt-0.5 shrink-0 text-primary-soft-text">
						<Icon name="shield" size={18} />
					</span>
					{m.prefs_privacy_body()}
				</p>
				<p class="text-body-sm text-text-muted">{m.prefs_privacy_no_contact()}</p>
				<p class="text-body-sm text-text-faint italic">{m.comfort_map_disclaimer()}</p>
			</div>
		</section>
	</div>

	<p class="text-body-sm text-text-faint">{m.prefs_saved()}</p>
</div>

{#snippet reminderControl()}
	<Select
		id="boarding-reminder-select"
		label={m.prefs_reminder_title()}
		labelHidden
		value={notifications.boardingReminder}
		options={reminderOptions}
		onchange={(value) => notifications.setBoardingReminder(value as BoardingReminderLead)}
		class="w-[180px]"
	/>
{/snippet}
