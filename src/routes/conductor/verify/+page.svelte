<script lang="ts">
	import { page } from '$app/state';
	import Badge from '$components/primitives/Badge.svelte';
	import QrScanner from '$components/conductor/QrScanner.svelte';
	import Button from '$components/primitives/Button.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import type { IconName } from '$components/primitives/icons';
	import * as m from '$lib/paraglide/messages';
	import { markBoarded, verifyPnr } from '$services/conductor.service';
	import { referenceFromScan } from '$utils/ticket-reference';
	import { toasts } from '$stores/toast.svelte';
	import type { VerificationOutcome, VerificationResult } from '$types/conductor';

	/**
	 * Ticket verification.
	 *
	 * The primary boarding-time task, so it is one field and one button, usable
	 * with the keyboard end to end: type the reference, press Enter, press
	 * Enter again to record boarding.
	 *
	 * PRIVACY: a result shows the seats on the reference and its status. No
	 * passenger identity is returned by the service or rendered here.
	 *
	 * A reference may also arrive as `?pnr=` — that is the URL encoded in the QR
	 * on every ticket, so scanning it lands here with the field already filled.
	 * It is filled but not submitted: the conductor still presses the button, so
	 * a scan can never record a boarding on its own.
	 */

	let pnr = $state('');

	/*
		Prefill from a scanned ticket. Runs once per distinct reference so it
		cannot fight the conductor typing over it, and only while the field is
		untouched.
	*/
	let prefilled = $state('');
	$effect(() => {
		const scanned = page.url.searchParams.get('pnr')?.trim().toLocaleUpperCase() ?? '';
		if (!scanned || scanned === prefilled) return;
		prefilled = scanned;
		pnr = scanned;
	});
	/*
		Scanning is offered on small screens only. A conductor at the door is
		holding a phone; a controller at a desk has a keyboard and the reference in
		front of them, so a camera would be in the way. The control is hidden with
		`md:hidden` rather than sniffed from the user agent, so it follows the
		viewport the way the rest of the shell does.
	*/
	let scanning = $state(false);

	/** A scan fills the field and verifies. Boarding still needs its own button. */
	function onscan(raw: string) {
		scanning = false;
		const reference = referenceFromScan(raw);
		if (!reference) {
			inputError = m.scan_unreadable();
			return;
		}
		pnr = reference;
		inputError = '';
		void check();
	}

	let checking = $state(false);
	let marking = $state(false);
	let result = $state<VerificationResult | null>(null);
	let inputError = $state('');
	let recent = $state<{ pnr: string; outcome: VerificationOutcome }[]>([]);

	let resultRegion = $state<HTMLDivElement | null>(null);

	const outcomeCopy: Record<
		VerificationOutcome,
		{ title: () => string; body: () => string; icon: IconName; tone: string; badge: 'success' | 'warning' | 'danger' }
	> = {
		valid: {
			title: () => m.verify_outcome_valid(),
			body: () => m.verify_outcome_valid_body(),
			icon: 'check',
			tone: 'border-success/40 bg-success-soft',
			badge: 'success'
		},
		already_boarded: {
			title: () => m.verify_outcome_already(),
			body: () => m.verify_outcome_already_body(),
			icon: 'user-check',
			tone: 'border-warning/40 bg-warning-soft',
			badge: 'warning'
		},
		cancelled: {
			title: () => m.verify_outcome_cancelled(),
			body: () => m.verify_outcome_cancelled_body(),
			icon: 'close',
			tone: 'border-danger/40 bg-danger-soft',
			badge: 'danger'
		},
		not_found: {
			title: () => m.verify_outcome_not_found(),
			body: () => m.verify_outcome_not_found_body(),
			icon: 'alert',
			tone: 'border-danger/40 bg-danger-soft',
			badge: 'danger'
		},
		wrong_trip: {
			title: () => m.verify_outcome_not_found(),
			body: () => m.verify_outcome_not_found_body(),
			icon: 'alert',
			tone: 'border-danger/40 bg-danger-soft',
			badge: 'danger'
		}
	};

	function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		void check();
	}

	/** The verification itself, shared by the form and by a scan. */
	async function check() {
		inputError = '';

		if (pnr.trim() === '') {
			inputError = m.verify_error_empty();
			document.getElementById('verify-pnr')?.focus();
			return;
		}

		checking = true;
		const response = await verifyPnr(pnr);
		checking = false;

		if (response.status === 'error') {
			inputError = m.verify_error_empty();
			return;
		}

		result = response.data;
		recent = [
			{ pnr: pnr.trim().toLocaleUpperCase(), outcome: response.data.outcome },
			...recent.filter((item) => item.pnr !== pnr.trim().toLocaleUpperCase())
		].slice(0, 5);

		// Move attention to the result so a screen reader announces the outcome
		// and the boarding action is the next thing in the tab order.
		await Promise.resolve();
		resultRegion?.focus();
	}

	async function board() {
		const entry = result?.entry;
		if (!entry) return;
		marking = true;
		const response = await markBoarded(entry.pnr);
		marking = false;
		if (response.status === 'ok') {
			toasts.show(m.conductor_marked_boarded({ pnr: entry.pnr }), 'success');
			const refreshed = await verifyPnr(entry.pnr);
			if (refreshed.status === 'ok') result = refreshed.data;
		}
	}

	function reset() {
		pnr = '';
		result = null;
		inputError = '';
		document.getElementById('verify-pnr')?.focus();
	}

	const seats = $derived(result?.groupEntries?.map((entry) => entry.seatId).join(', ') ?? '');
</script>

<svelte:head>
	<title>{m.verify_title()} — {m.app_name()}</title>
</svelte:head>

<div class="shell-width flex w-full flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
	<header>
		<h2 class="text-headline-sm text-text md:text-headline">{m.verify_title()}</h2>
		<p class="mt-1 text-body-sm text-text-muted">{m.verify_subtitle()}</p>
	</header>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<form
			class="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 shadow-level-1
				md:p-6"
			{onsubmit}
			novalidate
		>
			<!-- Phone-sized screens only: a desk has a keyboard and the reference. -->
			<div class="md:hidden">
				{#if scanning}
					<QrScanner {onscan} oncancel={() => (scanning = false)} />
				{:else}
					<Button
						type="button"
						variant="secondary"
						size="lg"
						fullWidth
						iconLeft="scan"
						onclick={() => (scanning = true)}
					>
						{m.scan_open()}
					</Button>
				{/if}
			</div>

			<div class="flex flex-col gap-2">
				<label class="text-caps uppercase text-text-muted" for="verify-pnr">
					{m.verify_input_label()}
				</label>
				<input
					id="verify-pnr"
					type="text"
					inputmode="text"
					autocomplete="off"
					autocapitalize="characters"
					spellcheck="false"
					bind:value={pnr}
					placeholder={m.verify_input_placeholder()}
					aria-describedby="verify-pnr-hint"
					aria-invalid={inputError ? 'true' : undefined}
					class="text-mono-data h-14 w-full rounded-[8px] border bg-background px-4 text-[18px]
						tracking-widest text-text uppercase placeholder:text-text-faint
						placeholder:tracking-normal focus:border-primary focus:outline-none
						focus:ring-2 focus:ring-primary/45
						{inputError ? 'border-danger' : 'border-border-strong'}"
				/>
				<p id="verify-pnr-hint" class="text-body-sm text-text-muted">
					{m.verify_input_hint()}
				</p>
				{#if inputError}
					<p role="alert" class="flex items-center gap-1.5 text-body-sm text-danger">
						<Icon name="alert" size={16} />
						{inputError}
					</p>
				{/if}
			</div>

			<Button type="submit" size="lg" fullWidth iconLeft="scan" loading={checking}>
				{m.verify_submit()}
			</Button>
			<p class="sr-only" aria-live="polite">{checking ? m.verify_checking() : ''}</p>
		</form>

		<div class="flex flex-col gap-4">
			{#if result}
				{@const copy = outcomeCopy[result.outcome]}
				<div
					bind:this={resultRegion}
					tabindex="-1"
					role="status"
					class="flex flex-col gap-3 rounded-card border p-4 md:p-6 {copy.tone}"
				>
					<div class="flex items-start gap-3">
						<span
							class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full
								bg-surface text-text"
						>
							<Icon name={copy.icon} size={22} strokeWidth={2.4} />
						</span>
						<div class="min-w-0">
							<p class="text-title text-text">{copy.title()}</p>
							<p class="mt-0.5 text-body-sm text-text-muted">{copy.body()}</p>
						</div>
					</div>

					{#if result.entry}
						<dl class="grid grid-cols-2 gap-3 rounded-[8px] bg-surface p-3">
							<div>
								<dt class="text-caps uppercase text-text-muted">
									{m.conductor_pnr_column()}
								</dt>
								<dd class="text-mono-data text-body-sm text-text">{result.entry.pnr}</dd>
							</div>
							<div>
								<dt class="text-caps uppercase text-text-muted">
									{m.verify_result_seats()}
								</dt>
								<dd class="text-mono-data text-body-sm text-text">{seats}</dd>
							</div>
						</dl>
					{/if}

					{#if result.outcome === 'valid'}
						<Button size="lg" fullWidth iconLeft="user-check" loading={marking} onclick={board}>
							{m.conductor_mark_boarded()}
						</Button>
					{/if}

					<Button variant="ghost" fullWidth onclick={reset}>{m.verify_clear()}</Button>
				</div>
			{/if}

			<section
				class="rounded-card border border-border bg-surface p-4 shadow-level-1"
				aria-labelledby="verify-recent"
			>
				<h3 id="verify-recent" class="text-title text-text">{m.verify_recent_title()}</h3>
				{#if recent.length === 0}
					<p class="mt-2 text-body-sm text-text-muted">{m.verify_recent_empty()}</p>
				{:else}
					<ul class="mt-3 flex flex-col gap-2">
						{#each recent as item (item.pnr)}
							<li class="flex items-center justify-between gap-3">
								<span class="text-mono-data text-body-sm text-text">{item.pnr}</span>
								<Badge tone={outcomeCopy[item.outcome].badge} shape="pill">
									{outcomeCopy[item.outcome].title()}
								</Badge>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		</div>
	</div>
</div>
