<script>
import Button from '$components/primitives/Button.svelte';
import Icon from '$components/primitives/Icon.svelte';
import Input from '$components/primitives/Input.svelte';
import Select from '$components/primitives/Select.svelte';
import * as m from '$lib/paraglide/messages';
import { nextCrewId } from '$services/crew.service';
import { crewStatuses } from '$types/fleet';
import { crewStatusLabel } from '$utils/trip-status';
let { role, editing, issues = [], saving = false, onsave, oncancel } = $props();
let id = $state('');
let name = $state('');
let depot = $state('');
let status = $state('available');
let createAccount = $state(false);
let initialPassword = $state('');
let confirmPassword = $state('');
/*
    Seeds the fields, and re-seeds when the form is pointed at a different
    record. This is the only place `editing` is read into the fields:
    initialising from it as well would capture just the first value, so
    opening Edit on a second row would keep the first row's values.
*/
$effect(() => {
    id = editing?.id ?? '';
    name = editing?.name ?? '';
    depot = editing?.depot ?? '';
    status = editing?.status ?? 'available';
    createAccount = false;
    initialPassword = '';
    confirmPassword = '';
});
const suggestedId = $derived(editing ? editing.id : nextCrewId(role));
function errorFor(field) {
    const issue = issues.find((entry) => entry.field === field);
    if (!issue)
        return undefined;
    switch (issue.messageKey) {
        case 'ops_crew_error_name':
            return m.ops_crew_error_name();
        case 'ops_crew_error_depot':
            return m.ops_crew_error_depot();
        case 'ops_crew_error_id_format':
            return m.ops_crew_error_id_format();
        case 'ops_crew_error_id_taken':
            return m.ops_crew_error_id_taken();
        case 'ops_crew_error_password':
            return m.ops_crew_error_password();
        case 'ops_crew_error_password_confirm':
            return m.ops_crew_error_password_confirm();
        default:
            return undefined;
    }
}
const statusOptions = crewStatuses.map((value) => ({
    value,
    label: crewStatusLabel(value)
}));
function submit(event) {
    event.preventDefault();
    onsave({
        id: id.trim() === '' ? undefined : id.trim(),
        editingId: editing?.id,
        role,
        name,
        depot,
        status: status,
        createAccount: !editing && createAccount,
        initialPassword: !editing && createAccount ? initialPassword : undefined,
        confirmPassword: !editing && createAccount ? confirmPassword : undefined
    });
}
</script>

<form
	class="flex flex-col gap-5 rounded-card border border-border bg-surface p-4 shadow-level-1 md:p-6"
	onsubmit={submit}
	novalidate
>
	<h3 class="flex items-center gap-2 text-title text-text">
		<span class="text-primary-soft-text">
			<Icon name={role === 'driver' ? 'steering' : 'clipboard'} size={20} />
		</span>
		{editing
			? m.ops_crew_edit()
			: role === 'driver'
				? m.ops_crew_add_driver()
				: m.ops_crew_add_conductor()}
	</h3>

	<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
		<Input
			id="crew-id"
			label={m.ops_field_duty_id()}
			bind:value={id}
			placeholder={suggestedId}
			icon="id-card"
			error={errorFor('id')}
			hint={editing ? undefined : m.ops_field_duty_id_hint()}
		/>

		<Input
			id="crew-name"
			label={m.ops_field_roster_name()}
			bind:value={name}
			icon="person"
			error={errorFor('name')}
			required
		/>

		<Input
			id="crew-depot"
			label={m.ops_field_depot()}
			bind:value={depot}
			icon="pin"
			error={errorFor('depot')}
			required
		/>

		<Select
			id="crew-status"
			label={m.ops_field_duty_status()}
			bind:value={status}
			options={statusOptions}
			icon="user-check"
		/>
	</div>

	{#if !editing}
		<label class="flex cursor-pointer items-start gap-3 rounded-[12px] border border-border bg-surface-container p-4">
			<input
				type="checkbox"
				bind:checked={createAccount}
				class="mt-1 h-4 w-4 accent-primary"
			/>
			<span>
				<span class="block text-body-sm font-semibold text-text">{m.ops_crew_create_account()}</span>
				<span class="mt-1 block text-body-sm text-text-muted">{m.ops_crew_create_account_hint()}</span>
			</span>
		</label>
		{#if createAccount}
			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
				<Input
					id="crew-initial-password"
					label={m.ops_crew_initial_password()}
					bind:value={initialPassword}
					type="password"
					autocomplete="new-password"
					icon="lock"
					hint={m.ops_crew_initial_password_hint()}
					error={errorFor('password')}
					required
				/>
				<Input
					id="crew-confirm-password"
					label={m.ops_crew_confirm_password()}
					bind:value={confirmPassword}
					type="password"
					autocomplete="new-password"
					icon="lock"
					error={errorFor('confirmPassword')}
					required
				/>
			</div>
		{/if}
	{/if}

	<p class="flex items-start gap-2 text-body-sm text-text-faint">
		<span class="mt-0.5 shrink-0"><Icon name="shield" size={16} /></span>
		{m.ops_crew_form_privacy()}
	</p>

	<div class="flex flex-wrap gap-3">
		<Button type="submit" iconLeft="check" loading={saving}>{m.ops_action_save()}</Button>
		<Button variant="ghost" onclick={oncancel}>{m.ops_action_cancel()}</Button>
	</div>
</form>
