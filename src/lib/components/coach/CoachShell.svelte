<script>
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
let { label, floor } = $props();
</script>

<div class="w-full overflow-x-auto pb-1">
	<div
		class="relative mx-auto flex w-max items-stretch rounded-l-[72px] rounded-r-card border-2
			border-border-strong bg-surface-container p-2"
		role="group"
		aria-label={label}
	>
		<!--
			── Front cab ──
			Windscreen across the nose, steering wheel and driver seat on the
			vehicle's right, and the boarding door with the conductor's seat beside
			it on the kerb side.
		-->
		<div
			class="relative flex w-[108px] shrink-0 flex-col justify-between rounded-l-[64px] py-1 pl-4"
		>
			<p class="sr-only">{m.seats_cabin_note()}</p>

			<!-- Windscreen glass, hugging the nose. -->
			<span
				class="pointer-events-none absolute inset-y-4 left-0.5 w-3 rounded-l-[56px] border-y-2
					border-l-[3px] border-accent/70"
				title={m.seats_windscreen()}
				aria-hidden="true"
			></span>

			<!-- Driver: wheel ahead of the seat, on the vehicle's right. -->
			<div class="flex items-center gap-1.5" aria-hidden="true">
				<svg
					width="28"
					height="28"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					class="shrink-0 text-text-muted"
					focusable="false"
				>
					<title>{m.seats_steering()}</title>
					<circle cx="12" cy="12" r="9" />
					<circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
					<path d="M3.2 12h6.4M14.4 12h6.4M12 14.4v6.4" />
				</svg>

				<span
					class="relative flex h-10 w-9 items-center justify-center rounded-[9px] border-2
						border-border-strong bg-surface text-text-muted"
					title={m.seats_driver_seat()}
				>
					<span class="absolute inset-y-1 right-0.5 w-[4px] rounded-[3px] bg-current opacity-45"
					></span>
					<Icon name="person" size={14} />
				</span>
			</div>

			<!-- Direction of travel. -->
			<span class="flex flex-col items-center gap-1 self-center" aria-hidden="true">
				<Icon name="chevron-left" size={16} class="text-primary-soft-text" />
				<span class="text-caps text-text-faint uppercase [writing-mode:vertical-rl] rotate-180">
					{m.seats_front()}
				</span>
			</span>

			<!-- Boarding door and the conductor's seat, kerb side. -->
			<div class="flex items-center gap-1.5" aria-hidden="true">
				<span
					class="flex h-10 w-7 shrink-0 items-center justify-center gap-1 rounded-[7px] border-2
						border-dashed border-primary/70 bg-primary-soft"
					title={m.seats_door()}
				>
					<span class="h-6 w-[3px] rounded-full bg-primary/60"></span>
					<span class="h-6 w-[3px] rounded-full bg-primary/60"></span>
				</span>

				<span
					class="relative flex h-10 w-9 items-center justify-center rounded-[9px] border-2
						border-border-strong bg-surface text-text-muted"
					title={m.seats_conductor_seat()}
				>
					<span class="absolute inset-y-1 right-0.5 w-[4px] rounded-[3px] bg-current opacity-45"
					></span>
					<Icon name="ticket" size={14} />
				</span>
			</div>
		</div>

		<!-- ── Passenger deck ── -->
		<div class="flex flex-col gap-1.5 px-1">
			{@render floor()}
		</div>

		<!-- ── Rear: engine bay ── -->
		<div
			class="flex w-9 shrink-0 flex-col items-center justify-center gap-1 rounded-r-[10px]
				border-l-2 border-dashed border-border pl-1"
			title={m.seats_engine()}
		>
			{#each [0, 1, 2, 3] as vent (vent)}
				<span class="h-0.5 w-5 rounded-full bg-border-strong" aria-hidden="true"></span>
			{/each}
			<span
				class="text-caps mt-1 text-text-faint uppercase [writing-mode:vertical-rl]"
				aria-hidden="true"
			>
				{m.seats_rear()}
			</span>
		</div>
	</div>
</div>
