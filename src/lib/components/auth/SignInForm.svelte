<script>
import { goto } from '$app/navigation';
import { page } from '$app/state';
import Button from '$components/primitives/Button.svelte';
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
import { demoCredentialHints } from '$lib/mocks/accounts.mock';
import { normaliseDriverId, requiresDutyId, signIn } from '$services/auth.service';
import { session } from '$stores/session.svelte';
import { toasts } from '$stores/toast.svelte';
import { roleHome } from '$types/auth';
import { safeRedirectTarget } from '$utils/route-access';
let { role } = $props();
let identifier = $state('');
let driverId = $state('');
let password = $state('');
let revealPassword = $state(false);
let submitting = $state(false);
let errorMessage = $state('');
/** Which field the error belongs to, so only that one is marked. */
let errorField = $state(null);
/** Both crew roles present a depot badge as a second credential. */
const needsDutyId = $derived(requiresDutyId(role));
const hint = $derived(demoCredentialHints[role]);
/** One icon per role, so the door a person is at is obvious at a glance. */
const roleIcon = $derived(role === 'conductor'
    ? 'clipboard'
    : role === 'driver'
        ? 'steering'
        : role === 'operations'
            ? 'hub'
            : 'person');
const identifierIcon = $derived(role === 'traveller' ? 'person' : role === 'operations' ? 'hub' : 'user-check');
/** A duty or controller id is data, so it reads in the mono data face. */
const monoIdentifier = $derived(role !== 'traveller');
const fieldIds = {
    identifier: 'signin-identifier',
    driverId: 'signin-driver-id',
    password: 'signin-password'
};
const labels = $derived.by(() => {
    switch (role) {
        case 'conductor':
            return {
                title: m.auth_conductor_title(),
                subtitle: m.auth_conductor_subtitle(),
                identifier: m.auth_conductor_identifier(),
                identifierHint: m.auth_conductor_identifier_hint()
            };
        case 'driver':
            return {
                title: m.auth_driver_title(),
                subtitle: m.auth_driver_subtitle(),
                identifier: m.auth_driver_identifier(),
                identifierHint: m.auth_driver_identifier_hint()
            };
        case 'operations':
            return {
                title: m.auth_operations_title(),
                subtitle: m.auth_operations_subtitle(),
                identifier: m.auth_operations_identifier(),
                identifierHint: m.auth_operations_identifier_hint()
            };
        default:
            return {
                title: m.auth_traveller_title(),
                subtitle: m.auth_traveller_subtitle(),
                identifier: m.auth_traveller_identifier(),
                identifierHint: m.auth_traveller_identifier_hint()
            };
    }
});
/** One field style, so the inputs cannot drift apart. */
function fieldClass(field, extra = '') {
    const invalid = errorField === field;
    return `h-12 w-full rounded-[8px] border bg-background py-2 pr-3 pl-11 text-body text-text
			placeholder:text-text-faint transition-colors focus:border-primary focus:outline-none
			focus:ring-2 focus:ring-primary/45
			${invalid ? 'border-danger' : 'border-border-strong'} ${extra}`;
}
function resolveError(key) {
    switch (key) {
        case 'auth_error_missing_fields':
            return { message: m.auth_error_missing_fields(), field: 'identifier' };
        case 'auth_error_driver_id_required':
            return { message: m.auth_error_driver_id_required(), field: 'driverId' };
        case 'auth_error_driver_id_format':
            return { message: m.auth_error_driver_id_format(), field: 'driverId' };
        default:
            return { message: m.auth_error_invalid(), field: 'identifier' };
    }
}
function fillDemo() {
    identifier = hint.identifier;
    password = hint.password;
    driverId = hint.driverId ?? '';
    errorMessage = '';
    errorField = null;
}
async function onsubmit(event) {
    event.preventDefault();
    errorMessage = '';
    errorField = null;
    submitting = true;
    const result = await signIn(role, {
        identifier,
        password,
        driverId: needsDutyId ? driverId : undefined
    });
    submitting = false;
    if (result.status === 'error') {
        const resolved = resolveError(result.error.messageKey);
        errorMessage = resolved.message;
        errorField = resolved.field;
        // A rejected password is discarded rather than left on screen. A
        // mistyped duty ID is kept so it can be corrected in place.
        if (resolved.field !== 'driverId')
            password = '';
        document.getElementById(fieldIds[resolved.field])?.focus();
        return;
    }
    session.start(result.data);
    toasts.show(m.role_signed_in_as({ name: result.data.displayName }), 'success');
    const target = safeRedirectTarget(page.url.searchParams.get('redirectTo'), roleHome[result.data.role]);
    await goto(target, { replaceState: true });
}
</script>

<div class="relative w-full max-w-md">
	<!-- Ambient wash behind the card so it lifts off the page rather than
	     sitting flat on it. Decorative only. -->
	<div
		class="auth-glow pointer-events-none absolute -inset-6 -z-10 rounded-[40px]"
		aria-hidden="true"
	></div>

	<form
		class="relative flex w-full flex-col gap-5 overflow-hidden rounded-card border border-border
			bg-surface p-6 shadow-level-2 md:p-8"
		{onsubmit}
		novalidate
	>
		<!-- Hairline of brand colour along the top edge. -->
		<span
			class="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary
				via-accent to-primary/40"
			aria-hidden="true"
		></span>

		<div class="flex flex-col items-center gap-2 pt-1 text-center">
			<span
				class="flex h-14 w-14 items-center justify-center rounded-[18px] bg-linear-to-br
					from-primary-soft to-accent-soft text-primary-soft-text ring-1 ring-primary/20"
			>
				<Icon name={roleIcon} size={26} />
			</span>
			<h2 class="text-headline-sm text-text">{labels.title}</h2>
			<p class="text-body-sm text-text-muted">{labels.subtitle}</p>
		</div>

		{#if errorMessage}
			<div role="alert" class="rounded-[8px] border border-danger/40 bg-danger-soft px-3 py-2">
				<p class="flex items-center gap-2 text-body-sm font-semibold text-danger">
					<Icon name="alert" size={16} />
					{m.auth_error_title()}
				</p>
				<p class="mt-1 text-body-sm text-text">{errorMessage}</p>
			</div>
		{/if}

		<div class="flex flex-col gap-2">
			<label class="text-caps uppercase text-text-muted" for="signin-identifier">
				{labels.identifier}
			</label>
			<div class="relative flex items-center">
				<span class="pointer-events-none absolute left-3 text-text-muted">
					<Icon name={identifierIcon} size={20} />
				</span>
				<input
					id="signin-identifier"
					type="text"
					autocomplete={role === 'traveller' ? 'off' : 'username'}
					required
					bind:value={identifier}
					aria-describedby="signin-identifier-hint"
					aria-invalid={errorField === 'identifier' ? 'true' : undefined}
					class={fieldClass('identifier', monoIdentifier ? 'text-mono-data' : '')}
				/>
			</div>
			<p id="signin-identifier-hint" class="text-body-sm text-text-muted">
				{labels.identifierHint}
			</p>
		</div>

		{#if needsDutyId}
			<!-- Crew duty ID: a second credential, printed on the depot badge.
			     Verified by the service and then discarded. -->
			<div class="flex flex-col gap-2">
				<label class="text-caps uppercase text-text-muted" for="signin-driver-id">
					{m.auth_conductor_driver_id()}
				</label>
				<div class="relative flex items-center">
					<span class="pointer-events-none absolute left-3 text-text-muted">
						<Icon name="id-card" size={20} />
					</span>
					<input
						id="signin-driver-id"
						type="text"
						autocomplete="off"
						autocapitalize="characters"
						spellcheck="false"
						maxlength="12"
						required
						placeholder={m.auth_conductor_driver_id_placeholder()}
						bind:value={driverId}
						oninput={() => (driverId = normaliseDriverId(driverId))}
						aria-describedby="signin-driver-id-hint"
						aria-invalid={errorField === 'driverId' ? 'true' : undefined}
						class={fieldClass('driverId', 'text-mono-data tracking-[0.08em]')}
					/>
				</div>
				<p id="signin-driver-id-hint" class="text-body-sm text-text-muted">
					{m.auth_conductor_driver_id_hint()}
				</p>
			</div>
		{/if}

		<div class="flex flex-col gap-2">
			<label class="text-caps uppercase text-text-muted" for="signin-password">
				{m.auth_password()}
			</label>
			<div class="relative flex items-center">
				<span class="pointer-events-none absolute left-3 text-text-muted">
					<Icon name="lock" size={20} />
				</span>
				<input
					id="signin-password"
					type={revealPassword ? 'text' : 'password'}
					autocomplete="current-password"
					required
					bind:value={password}
					aria-invalid={errorField === 'password' ? 'true' : undefined}
					class={fieldClass('password', 'pr-12')}
				/>
				<button
					type="button"
					onclick={() => (revealPassword = !revealPassword)}
					aria-pressed={revealPassword}
					aria-controls="signin-password"
					aria-label={revealPassword ? m.auth_password_hide() : m.auth_password_show()}
					title={revealPassword ? m.auth_password_hide() : m.auth_password_show()}
					class="absolute right-1 flex h-11 w-11 items-center justify-center rounded-[8px]
						text-text-muted transition-colors hover:bg-surface-container hover:text-text"
				>
					<Icon name={revealPassword ? 'eye-off' : 'eye'} size={20} />
				</button>
			</div>
		</div>

		<Button type="submit" size="lg" fullWidth iconLeft="lock" loading={submitting}>
			{m.auth_submit()}
		</Button>

		<p class="sr-only" aria-live="polite">{submitting ? m.auth_signing_in() : ''}</p>

		<!-- Demonstration account, shown so a reviewer never has to guess. -->
		<div class="rounded-[12px] border border-border bg-surface-container p-4">
			<p class="flex items-center gap-2 text-body-sm font-semibold text-text">
				<Icon name="info" size={16} />
				{m.auth_demo_title()}
			</p>
			<p class="mt-1 text-body-sm text-text-muted">{m.auth_demo_seeded_body()}</p>
			<dl class="mt-3 flex flex-col gap-1.5">
				<div class="flex items-baseline justify-between gap-3">
					<dt class="text-body-sm text-text-muted">{m.auth_demo_identifier()}</dt>
					<dd class="text-mono-data text-body-sm text-text">{hint.identifier}</dd>
				</div>
				{#if hint.driverId}
					<div class="flex items-baseline justify-between gap-3">
						<dt class="text-body-sm text-text-muted">{m.auth_demo_driver_id()}</dt>
						<dd class="text-mono-data text-body-sm text-text">{hint.driverId}</dd>
					</div>
				{/if}
				<div class="flex items-baseline justify-between gap-3">
					<dt class="text-body-sm text-text-muted">{m.auth_demo_password()}</dt>
					<dd class="text-mono-data text-body-sm text-text">{hint.password}</dd>
				</div>
			</dl>
			<Button variant="secondary" fullWidth class="mt-3" onclick={fillDemo}>
				{m.auth_demo_fill()}
			</Button>
		</div>

		<div class="flex flex-col gap-2 text-body-sm text-text-faint">
			{#if needsDutyId}
				<p class="flex items-start gap-2">
					<span class="mt-0.5 shrink-0"><Icon name="shield" size={16} /></span>
					{m.auth_driver_id_privacy()}
				</p>
			{/if}
			<p class="flex items-start gap-2">
				<span class="mt-0.5 shrink-0"><Icon name="lock" size={16} /></span>
				{m.auth_account_security_note()}
			</p>
		</div>
	</form>
</div>

<style>
	/* Soft brand halo. Kept in CSS so the colour stops can be mixed against the
	   theme tokens rather than hard-coded. */
	.auth-glow {
		background:
			radial-gradient(
				60% 50% at 20% 0%,
				color-mix(in srgb, var(--c-primary) 14%, transparent),
				transparent 70%
			),
			radial-gradient(
				55% 50% at 90% 100%,
				color-mix(in srgb, var(--c-accent) 20%, transparent),
				transparent 70%
			);
		filter: blur(18px);
	}
</style>
