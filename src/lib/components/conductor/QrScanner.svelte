<script>
import Button from '$components/primitives/Button.svelte';
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
let { onscan, oncancel } = $props();
let video = $state(null);
let status = $state('starting');
let stream = null;
let frame = 0;
let stopped = false;
/** Releases the camera. Safe to call repeatedly. */
function stop() {
    stopped = true;
    if (frame)
        cancelAnimationFrame(frame);
    frame = 0;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
}
function finish(raw) {
    if (stopped)
        return;
    stop();
    onscan(raw);
}
function cancel() {
    stop();
    oncancel();
}
/*
    Starts the camera and the decode loop, and guarantees the camera is
    released when this component goes away — including when the conductor
    navigates off the page mid-scan.
*/
$effect(() => {
    void start();
    return stop;
});
async function start() {
    if (!navigator.mediaDevices?.getUserMedia) {
        status = 'unsupported';
        return;
    }
    try {
        // The rear camera, because the code is on someone else's phone.
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false
        });
    }
    catch (error) {
        const name = error.name;
        status = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'failed';
        return;
    }
    if (stopped || !video) {
        stop();
        return;
    }
    video.srcObject = stream;
    try {
        await video.play();
    }
    catch {
        status = 'failed';
        return;
    }
    status = 'scanning';
    void decodeLoop();
}
async function decodeLoop() {
    const native = await nativeDetector();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    let jsQR = null;
    if (!native) {
        try {
            jsQR = (await import('jsqr')).default;
        }
        catch {
            status = 'unsupported';
            return;
        }
    }
    const tick = async () => {
        if (stopped || !video || video.readyState !== video.HAVE_ENOUGH_DATA) {
            if (!stopped)
                frame = requestAnimationFrame(() => void tick());
            return;
        }
        try {
            if (native) {
                const codes = await native.detect(video);
                const value = codes[0]?.rawValue;
                if (value)
                    return finish(value);
            }
            else if (jsQR && context) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const image = context.getImageData(0, 0, canvas.width, canvas.height);
                // `attemptBoth` reads codes shown on a screen, which are often
                // inverted by a dark theme — exactly how a VAZHI ticket looks.
                const found = jsQR(image.data, image.width, image.height, {
                    inversionAttempts: 'attemptBoth'
                });
                if (found?.data)
                    return finish(found.data);
            }
        }
        catch {
            // A frame that fails to decode is ordinary; keep looking.
        }
        if (!stopped)
            frame = requestAnimationFrame(() => void tick());
    };
    frame = requestAnimationFrame(() => void tick());
}
/** The native decoder, when this browser has one and can read QR codes. */
async function nativeDetector() {
    const Detector = window.BarcodeDetector;
    if (!Detector)
        return null;
    try {
        const formats = (await Detector.getSupportedFormats?.()) ?? ['qr_code'];
        if (!formats.includes('qr_code'))
            return null;
        return new Detector({ formats: ['qr_code'] });
    }
    catch {
        return null;
    }
}
const message = $derived({
    starting: m.scan_starting(),
    scanning: m.scan_hint(),
    denied: m.scan_denied(),
    unsupported: m.scan_unsupported(),
    failed: m.scan_failed()
}[status]);
const broken = $derived(status === 'denied' || status === 'unsupported' || status === 'failed');
</script>

<div class="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-level-1">
	<div class="flex items-center justify-between gap-3">
		<h3 class="flex items-center gap-2 text-title text-text">
			<span class="text-primary-soft-text"><Icon name="scan" size={20} /></span>
			{m.scan_title()}
		</h3>
	</div>

	{#if !broken}
		<div class="relative overflow-hidden rounded-[8px] bg-[#141716]">
			<!-- svelte-ignore a11y_media_has_caption -- a camera preview has no audio track to caption -->
			<video
				bind:this={video}
				class="block aspect-square w-full object-cover"
				playsinline
				muted
				aria-label={m.scan_title()}
			></video>

			<!-- A frame to aim with. Decorative: the instruction is the text below. -->
			<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
				<div class="h-[62%] w-[62%] rounded-[12px] border-2 border-white/85 shadow-[0_0_0_9999px_rgba(20,23,22,0.45)]"></div>
			</div>
		</div>
	{/if}

	<p class="text-body-sm {broken ? 'text-danger' : 'text-text-muted'}" role={broken ? 'alert' : undefined}>
		{message}
	</p>
	<p class="sr-only" aria-live="polite">{status === 'scanning' ? m.scan_hint() : ''}</p>

	<Button variant="secondary" fullWidth onclick={cancel}>{m.scan_cancel()}</Button>
</div>
