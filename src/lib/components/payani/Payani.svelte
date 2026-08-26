<script>
import { onMount, tick } from 'svelte';
import { page } from '$app/state';
import Icon from '$components/primitives/Icon.svelte';
import Spinner from '$components/primitives/Spinner.svelte';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { SUGGESTED_TOPICS, matchTopic, questionLocale } from '$services/payani.service';
import { session } from '$stores/session.svelte';
import { isWorkspacePath } from '$utils/route-access';
/** A question, not an essay — long input is a paste, not a query. */
const MAX_QUESTION_CHARS = 300;
let open = $state(false);
let question = $state('');
let turns = $state([]);
let pending = $state(false);
let panel = $state(null);
let input = $state(null);
let launcher = $state(null);
let log = $state(null);
let speechSupported = $state(false);
let speechLocale = $state('en');
let listening = $state(false);
let speechMessage = $state('');
let recognition = null;
/** Travellers only, and not while they are inside a workspace shell. */
const available = $derived(session.current?.role === 'traveller' && !isWorkspacePath(page.url.pathname));
onMount(() => {
    speechSupported = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    speechLocale = getLocale() === 'ta' ? 'ta' : 'en';
    return stopListening;
});
/**
 * The starter questions, shown until the first exchange.
 *
 * Twelve rather than four: they double as a statement of what Payani is for,
 * and someone who does not know what to ask learns the shape of the app from
 * reading them.
 */
const questionFor = {
    book: m.payani_q_book,
    pnr: m.payani_q_pnr,
    seat: m.payani_q_seat,
    cancel: m.payani_q_cancel,
    ticket: m.payani_q_ticket,
    boarding: m.payani_q_boarding,
    payment: m.payani_q_payment,
    refund: m.payani_q_refund,
    sleeper: m.payani_q_sleeper,
    luggage: m.payani_q_luggage,
    missed: m.payani_q_late,
    vazhi: m.payani_q_vazhi
};
const suggestions = $derived(SUGGESTED_TOPICS.map((topic) => ({ topic, label: questionFor[topic]?.() ?? topic })).filter((entry) => entry.label !== entry.topic));
/**
 * The written answer for a topic.
 *
 * One entry per topic in `PayaniTopic`; an unmatched question falls to
 * `payani_a_unknown`, which says so rather than guessing.
 */
const answerFor = {
    greeting: m.payani_a_greeting,
    thanks: m.payani_a_thanks,
    book: m.payani_a_book,
    search: m.payani_a_search,
    seat: m.payani_a_seat,
    sleeper: m.payani_a_sleeper,
    payment: m.payani_a_payment,
    pnr: m.payani_a_pnr,
    ticket: m.payani_a_ticket,
    qr: m.payani_a_qr,
    boarding: m.payani_a_boarding,
    cancel: m.payani_a_cancel,
    refund: m.payani_a_refund,
    track: m.payani_a_track,
    transactions: m.payani_a_transactions,
    account: m.payani_a_account,
    language: m.payani_a_language,
    accessible: m.payani_a_accessible,
    concession: m.payani_a_concession,
    luggage: m.payani_a_luggage,
    missed: m.payani_a_missed,
    vazhi: m.payani_a_vazhi,
    help: m.payani_a_help,
    cannot: m.payani_a_cannot
};
async function openPanel() {
    open = true;
    await tick();
    input?.focus();
}
function closePanel() {
    stopListening();
    open = false;
    launcher?.focus();
}

function stopListening() {
    recognition?.stop();
    recognition = null;
    listening = false;
}

function voiceErrorMessage(code) {
    if (code === 'not-allowed' || code === 'service-not-allowed')
        return m.payani_voice_denied();
    if (code === 'no-speech')
        return m.payani_voice_no_speech();
    return m.payani_voice_unavailable();
}

function toggleListening() {
    if (listening) {
        stopListening();
        return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        speechSupported = false;
        return;
    }
    const current = new SpeechRecognition();
    const existingQuestion = question.trim();
    recognition = current;
    speechMessage = '';
    current.lang = speechLocale === 'ta' ? 'ta-IN' : 'en-IN';
    current.continuous = false;
    current.interimResults = true;
    current.maxAlternatives = 1;
    current.onstart = () => {
        listening = true;
    };
    current.onresult = (event) => {
        let transcript = '';
        for (let index = 0; index < event.results.length; index++)
            transcript += event.results[index][0]?.transcript ?? '';
        question = `${existingQuestion}${existingQuestion && transcript ? ' ' : ''}${transcript}`
            .trim()
            .slice(0, MAX_QUESTION_CHARS);
    };
    current.onerror = (event) => {
        speechMessage = voiceErrorMessage(event.error);
    };
    current.onend = () => {
        if (recognition === current)
            recognition = null;
        listening = false;
        void tick().then(() => input?.focus());
    };
    try {
        current.start();
    }
    catch {
        recognition = null;
        listening = false;
        speechMessage = m.payani_voice_unavailable();
    }
}
/** Escape closes from anywhere inside the panel. */
function onKeydown(event) {
    if (event.key === 'Escape' && open) {
        event.stopPropagation();
        closePanel();
    }
}
/** Enter sends; Shift+Enter is a newline, as in every chat box. */
function onInputKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void ask(question);
    }
}
async function ask(text) {
    const asked = text.trim().slice(0, MAX_QUESTION_CHARS);
    if (asked === '' || pending)
        return;
    question = '';
    turns = [...turns, { role: 'user', content: asked }];
    pending = true;
    await scrollToEnd();
    /*
        A short beat before answering.

        The answer is ready immediately — it is a local lookup — but a reply
        that lands in the same frame as the question reads as a glitch rather
        than a response. This is presentation, not work.
    */
    await new Promise((resolve) => setTimeout(resolve, 260));
    const { topic } = matchTopic(asked);
    const locale = questionLocale(asked) ?? getLocale();
    const reply = topic
        ? answerFor[topic]({}, { locale })
        : m.payani_a_unknown({}, { locale });
    pending = false;
    turns = [...turns, { role: 'assistant', content: reply }];
    await scrollToEnd();
}
async function scrollToEnd() {
    await tick();
    if (log)
        log.scrollTop = log.scrollHeight;
}
const remaining = $derived(MAX_QUESTION_CHARS - question.length);
</script>

{#if available}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="pointer-events-none fixed inset-0 z-[60]" onkeydowncapture={onKeydown} role="presentation">
		<!--
			Anchored bottom-right, clearing the mobile bottom bar. The wrapper is
			click-through so it never steals a tap from the page underneath; only
			the launcher and the panel take pointer events.
		-->
		<div class="pointer-events-none absolute right-4 bottom-[104px] flex flex-col items-end gap-3 md:bottom-6">
			{#if open}
				<div
					bind:this={panel}
					class="payani-panel pointer-events-auto flex w-[min(22rem,calc(100vw-2rem))] flex-col
						overflow-hidden rounded-card border border-border bg-surface shadow-level-2"
					role="dialog"
					aria-modal="false"
					aria-labelledby="payani-title"
				>
					<header class="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
						<div class="flex items-center gap-2.5">
							<span
								class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full
									bg-primary-soft text-primary-soft-text"
								aria-hidden="true"
							>
								<Icon name="chat" size={18} />
							</span>
							<span class="flex flex-col leading-tight">
								<span id="payani-title" class="text-body font-semibold text-text">
									{m.payani_name()}
								</span>
								<span class="text-body-sm text-text-muted">{m.payani_tagline()}</span>
							</span>
						</div>
						<button
							type="button"
							onclick={closePanel}
							aria-label={m.payani_close()}
							class="-mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px]
								text-text-muted transition-colors hover:bg-surface-container hover:text-text"
						>
							<Icon name="close" size={18} />
						</button>
					</header>

					<div
						bind:this={log}
						class="flex max-h-[min(26rem,55vh)] min-h-[11rem] flex-col gap-3 overflow-y-auto
							px-4 py-3"
					>
						<p class="text-body-sm text-text">{m.payani_greeting()}</p>

						{#if turns.length === 0}
							<div class="flex flex-col gap-2">
								<p class="text-caps uppercase text-text-muted">{m.payani_suggestions_label()}</p>
								<div class="flex flex-wrap gap-1.5">
									{#each suggestions as suggestion (suggestion.topic)}
										<button
											type="button"
											onclick={() => ask(suggestion.label)}
											class="rounded-full border border-border bg-surface-container px-3 py-1.5
												text-left text-body-sm text-text transition-colors
												hover:border-border-strong hover:bg-surface-container-high"
										>
											{suggestion.label}
										</button>
									{/each}
								</div>
							</div>
						{/if}

						{#each turns as turn, index (index)}
							{#if turn.role === 'user'}
								<div class="flex justify-end">
									<p
										class="max-w-[85%] rounded-[12px] rounded-br-[4px] bg-primary px-3 py-2
											text-body-sm whitespace-pre-wrap text-on-primary"
									>
										<span class="sr-only">{m.payani_you()}: </span>{turn.content}
									</p>
								</div>
							{:else}
								<div class="flex justify-start">
									<p
										class="max-w-[92%] rounded-[12px] rounded-bl-[4px] bg-surface-container px-3
											py-2 text-body-sm whitespace-pre-wrap text-text"
									>
										<span class="sr-only">{m.payani_name()}: </span>{turn.content}
									</p>
								</div>
							{/if}
						{/each}

						{#if pending}
							<p class="flex items-center gap-2 text-body-sm text-text-muted">
								<Spinner size={14} />
								{m.payani_thinking()}
							</p>
						{/if}

					</div>

					<div class="flex flex-col gap-2 border-t border-border px-3 py-3">
						<label class="sr-only" for="payani-input">{m.payani_input_label()}</label>
						{#if speechSupported}
							<div class="flex items-center justify-between gap-2">
								<span class="text-body-sm text-text-muted">{m.payani_voice_label()}</span>
								<div class="flex rounded-full bg-surface-container p-0.5" role="group" aria-label={m.payani_voice_label()}>
									<button
										type="button"
										onclick={() => (speechLocale = 'en')}
										disabled={listening}
										aria-pressed={speechLocale === 'en'}
										class="rounded-full px-2.5 py-1 text-body-sm transition-colors disabled:opacity-50"
										class:bg-surface={speechLocale === 'en'}
										class:text-text={speechLocale === 'en'}
										class:text-text-muted={speechLocale !== 'en'}
									>{m.payani_voice_english()}</button
									>
									<button
										type="button"
										onclick={() => (speechLocale = 'ta')}
										disabled={listening}
										aria-pressed={speechLocale === 'ta'}
										class="rounded-full px-2.5 py-1 text-body-sm transition-colors disabled:opacity-50"
										class:bg-surface={speechLocale === 'ta'}
										class:text-text={speechLocale === 'ta'}
										class:text-text-muted={speechLocale !== 'ta'}
									>{m.payani_voice_tamil()}</button
									>
								</div>
							</div>
						{/if}
						<div class="flex items-end gap-2">
							<textarea
								bind:this={input}
								bind:value={question}
								id="payani-input"
								rows="1"
								maxlength={MAX_QUESTION_CHARS}
								disabled={pending}
								onkeydown={onInputKeydown}
								placeholder={m.payani_input_placeholder()}
								class="max-h-28 min-h-[44px] w-full flex-1 resize-none rounded-[8px] border
									border-border-strong bg-background px-3 py-2.5 text-body-sm text-text
									placeholder:text-text-faint focus:border-primary focus:outline-none
									focus:ring-2 focus:ring-primary/45 disabled:opacity-60"
							></textarea>
							{#if speechSupported}
								<button
									type="button"
									onclick={toggleListening}
									disabled={pending}
									aria-label={listening ? m.payani_voice_stop() : m.payani_voice_start()}
									aria-pressed={listening}
									title={listening ? m.payani_voice_stop() : m.payani_voice_start()}
									class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] border
										border-border-strong text-text-muted transition-colors hover:bg-surface-container
										hover:text-text disabled:cursor-not-allowed disabled:opacity-45"
									class:listening
								>
									<Icon name="microphone" size={19} />
								</button>
							{/if}
							<button
								type="button"
								onclick={() => ask(question)}
								disabled={pending || question.trim() === ''}
								aria-label={m.payani_send()}
								class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px]
									bg-primary text-on-primary transition-colors hover:bg-primary-hover
									disabled:cursor-not-allowed disabled:opacity-45"
							>
								<Icon name="arrow-right" size={18} />
							</button>
						</div>
						{#if listening || speechMessage}
							<p class="text-body-sm" class:text-primary={listening} class:text-danger={!listening} aria-live="polite">
								{listening ? m.payani_voice_listening() : speechMessage}
							</p>
						{/if}
						<p class="text-body-sm text-text-faint">
							{remaining < 60 ? `${remaining}` : m.payani_disclaimer()}
						</p>
					</div>

					<p class="sr-only" aria-live="polite">
						{pending ? m.payani_thinking() : (turns.at(-1)?.role === 'assistant' ? turns.at(-1)?.content : '')}
					</p>
				</div>
			{/if}

			<button
				bind:this={launcher}
				type="button"
				onclick={() => (open ? closePanel() : openPanel())}
				aria-expanded={open}
				aria-label={open ? m.payani_close() : m.payani_open()}
				title={open ? m.payani_close() : m.payani_open()}
				class="payani-launcher pointer-events-auto flex h-12 w-12 items-center justify-center
					rounded-full bg-primary text-on-primary shadow-level-2 transition-colors
					hover:bg-primary-hover focus-visible:outline focus-visible:outline-2
					focus-visible:outline-offset-2 focus-visible:outline-primary"
			>
				<span class="payani-launcher-icon" class:is-open={open}>
					<Icon name={open ? 'close' : 'chat'} size={22} />
				</span>
			</button>
		</div>
	</div>
{/if}

<style>
	/*
		The open and close motion.

		The panel rises and settles rather than appearing; the launcher's glyph
		turns a quarter as it swaps. Both are short — this is a control, not an
		animation — and both stand down entirely under reduced motion, where an
		instant swap is the correct behaviour rather than a degraded one.
	*/
	.payani-panel {
		animation: payani-in 180ms cubic-bezier(0.16, 1, 0.3, 1);
		transform-origin: bottom right;
	}

	@keyframes payani-in {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.97);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.payani-launcher-icon {
		display: inline-flex;
		transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.payani-launcher-icon.is-open {
		transform: rotate(90deg);
	}

	.listening {
		border-color: var(--color-primary);
		background: var(--color-primary-soft);
		color: var(--color-primary-soft-text);
		animation: listening-pulse 1.4s ease-in-out infinite;
	}

	@keyframes listening-pulse {
		50% {
			box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 18%, transparent);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.payani-panel {
			animation: none;
		}

		.payani-launcher-icon {
			transition: none;
		}

		.listening {
			animation: none;
		}
	}
</style>
