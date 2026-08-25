<script lang="ts">
	import QRCode from 'qrcode';
	import * as m from '$lib/paraglide/messages';

	/**
	 * Boarding code.
	 *
	 * A real, scannable QR — generated in the browser by the `qrcode` package,
	 * never fetched from an image service, so a ticket renders offline and no
	 * third party is told which booking is being looked at.
	 *
	 * WHAT IT ENCODES. The conductor's own verification URL with the reference
	 * attached, so scanning it at the door opens the check rather than dumping a
	 * bare string into whatever camera app was used. That page prefills the field
	 * and stops — a scan never records a boarding by itself — and it is behind the
	 * conductor role, so a scan by anyone else lands on a sign-in screen rather
	 * than on someone's booking.
	 *
	 * The reference stays printed underneath: cameras fail, screens crack, and a
	 * conductor can always key it in.
	 */

	interface Props {
		pnr: string;
	}

	let { pnr }: Props = $props();

	/**
	 * Absolute, because a QR is read by a camera with no notion of this origin.
	 * Built at render time so the same build works on localhost and in production
	 * without a configured base URL.
	 */
	const target = $derived(
		typeof window === 'undefined'
			? `/conductor/verify?pnr=${encodeURIComponent(pnr)}`
			: `${window.location.origin}/conductor/verify?pnr=${encodeURIComponent(pnr)}`
	);

	let dataUrl = $state('');
	let failed = $state(false);

	/*
		Rendered to a data URL rather than a canvas so the ticket survives being
		saved, printed, or screenshotted. Error correction level M leaves the code
		readable through a scuffed screen without inflating it past the panel.
	*/
	$effect(() => {
		let cancelled = false;
		QRCode.toDataURL(target, {
			errorCorrectionLevel: 'M',
			margin: 1,
			width: 320,
			color: { dark: '#141716', light: '#ffffff' }
		})
			.then((url) => {
				if (cancelled) return;
				dataUrl = url;
				failed = false;
			})
			.catch(() => {
				if (cancelled) return;
				// The reference below is still readable, so this degrades rather
				// than breaking the ticket.
				failed = true;
			});
		return () => {
			cancelled = true;
		};
	});
</script>

<div class="flex flex-col items-center gap-3">
	<div class="rounded-[8px] border border-border bg-white p-3 shadow-level-1">
		{#if dataUrl}
			<img
				src={dataUrl}
				alt={`${m.ticket_code_title()}: ${pnr}`}
				width="160"
				height="160"
				class="block h-[160px] w-[160px]"
			/>
		{:else}
			<!-- Holds the panel's height so the ticket does not jump when the code
			     resolves, and so a failure leaves a quiet space rather than a gap. -->
			<div
				class="flex h-[160px] w-[160px] items-center justify-center rounded-[4px]
					bg-[#f2f2ec] text-[11px] text-[#6e766f]"
				role={failed ? 'note' : undefined}
			>
				{failed ? m.ticket_code_unavailable() : ''}
			</div>
		{/if}

		<p class="mt-3 text-center font-mono text-[15px] font-bold tracking-widest text-[#141716]">
			{pnr}
		</p>
	</div>

	<p class="max-w-[240px] text-center text-body-sm text-text-muted">
		{m.ticket_code_caption()}
	</p>
	<p class="max-w-[280px] text-center text-body-sm text-text-faint">
		{m.ticket_code_preview_note()}
	</p>
</div>
