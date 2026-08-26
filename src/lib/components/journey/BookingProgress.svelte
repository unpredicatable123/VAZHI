<script>
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
let { current, variant = 'bar', class: className = '' } = $props();
const steps = [
    () => m.step_search(),
    () => m.step_seats(),
    () => m.step_passengers(),
    () => m.step_review(),
    () => m.step_payment(),
    () => m.step_confirmation()
];
const total = steps.length;
const clamped = $derived(Math.min(Math.max(current, 1), total));
</script>

{#if variant === 'bar'}
	<div
		class={`rounded-[8px] border border-border bg-surface/95 px-3 py-2.5 shadow-level-1
			backdrop-blur ${className}`}
		role="group"
		aria-label={m.progress_label()}
	>
		<p class="sr-only">{m.progress_status({ current: clamped, total })}</p>

		<ol class="flex items-center gap-1.5" aria-hidden="true">
			{#each steps as _step, index (index)}
				{@const stepNumber = index + 1}
				{@const done = stepNumber < clamped}
				{@const active = stepNumber === clamped}
				<li class="flex flex-1 items-center gap-1.5 last:flex-none">
					<span
						class="h-2.5 w-2.5 shrink-0 rounded-full border-2
							{active
							? 'animate-pulse border-primary bg-primary'
							: done
								? 'border-primary bg-primary'
								: 'border-border-strong bg-surface'}"
					></span>
					{#if stepNumber < total}
						<span class="h-0.5 flex-1 rounded-full bg-border">
							<span
								class="block h-full rounded-full bg-primary transition-all"
								style="width: {done ? '100%' : '0%'}"
							></span>
						</span>
					{/if}
				</li>
			{/each}
		</ol>

		<!-- Too narrow for five labels: name the current step and count the rest. -->
		<div class="mt-2 flex items-baseline justify-between gap-2">
			<span class="truncate text-caps uppercase font-bold text-primary-soft-text">
				{steps[clamped - 1]()}
			</span>
			<span class="text-mono-data shrink-0 text-[11px] text-text-muted">
				{clamped}/{total}
			</span>
		</div>
	</div>
{:else}
	<div
		class={`rounded-card border border-border bg-surface p-4 shadow-level-1 ${className}`}
		role="group"
		aria-label={m.progress_label()}
	>
		<p class="sr-only">{m.progress_status({ current: clamped, total })}</p>

		<ol class="flex items-start">
			{#each steps as step, index (index)}
				{@const stepNumber = index + 1}
				{@const done = stepNumber < clamped}
				{@const active = stepNumber === clamped}
				<li class="flex min-w-0 flex-1 flex-col items-center">
					<!-- Marker row: connector, dot, connector — so the dot stays
					     centred over its own label whatever the label wraps to. -->
					<div class="flex w-full items-center" aria-hidden="true">
						<span
							class="h-0.5 flex-1 rounded-full {index === 0
								? 'bg-transparent'
								: done || active
									? 'bg-primary'
									: 'bg-border'}"
						></span>

						<span
							class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2
								text-[11px] font-bold
								{done
								? 'border-primary bg-primary text-on-primary'
								: active
									? 'border-primary bg-primary text-on-primary'
									: 'border-border-strong bg-surface text-text-faint'}"
						>
							{#if done}
								<Icon name="check" size={12} strokeWidth={3} />
							{:else}
								{stepNumber}
							{/if}
						</span>

						<span
							class="h-0.5 flex-1 rounded-full {index === total - 1
								? 'bg-transparent'
								: done
									? 'bg-primary'
									: 'bg-border'}"
						></span>
					</div>

					<span
						class="mt-1.5 px-1 text-center text-[10px] leading-tight tracking-wide uppercase
							{active ? 'font-bold text-primary-soft-text' : 'text-text-muted'}"
					>
						{step()}
					</span>
				</li>
			{/each}
		</ol>
	</div>
{/if}
