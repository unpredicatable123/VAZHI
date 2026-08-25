<script lang="ts">
	import EmptyState from '$components/primitives/EmptyState.svelte';
	import ErrorState from '$components/primitives/ErrorState.svelte';
	import Icon from '$components/primitives/Icon.svelte';
	import Skeleton from '$components/primitives/Skeleton.svelte';
	import CrewTable from './CrewTable.svelte';
	import StatTile from './StatTile.svelte';
	import * as m from '$lib/paraglide/messages';
	import Button from '$components/primitives/Button.svelte';
	import CrewForm from './CrewForm.svelte';
	import { deleteCrew, listCrew, saveCrew, searchCrew } from '$services/crew.service';
	import type { CrewAccountCredentials, CrewDraft, CrewIssue } from '$services/crew.service';
	import { allTrips } from '$services/trips.service';
	import { toasts } from '$stores/toast.svelte';
	import type { CrewMember } from '$types/fleet';
	import { assignmentFor } from '$services/trips.service';
	import { session } from '$stores/session.svelte';
	import type { CrewRow } from './crew-row';
	import type { AsyncState } from '$types/common';
	import type { CrewRole, CrewStatus } from '$types/fleet';
	import { crewStatuses } from '$types/fleet';
	import { crewStatusLabel, crewStatusTone, dutyStatusFrom } from '$utils/trip-status';

	/**
	 * A crew roster with its duty summary.
	 *
	 * Driver management and conductor management are the same screen with a
	 * different role, so they are one component rather than two files that drift
	 * apart. The duty status is derived from the trip each crew member holds, so
	 * it agrees with the trip board by construction.
	 *
	 * A roster of this size is a list to search, not a list to read: a
	 * controller arrives knowing a duty ID from a radio call or a name from a
	 * depot sheet, and wants that one person. The search matches either — and
	 * the depot, and the older identifiers — so whichever they have to hand
	 * gets them there.
	 *
	 * PRIVACY: the four columns in `CrewTable` are all this screen has access to.
	 * The search reads the same fields and nothing more.
	 */

	interface Props {
		role: CrewRole;
	}

	let { role }: Props = $props();

	let rows = $state<CrewRow[]>([]);
	let loadState = $state<AsyncState>('loading');
	let query = $state('');

	/** `null` when closed, `'new'` when adding, otherwise the record edited. */
	let editing = $state<CrewMember | 'new' | null>(null);
	let issues = $state<CrewIssue[]>([]);
	let saving = $state(false);
	let issuedCredentials = $state<CrewAccountCredentials | null>(null);

	const editingMember = $derived(editing === 'new' || editing === null ? null : editing);

	const visible = $derived(
		searchCrew(
			rows.map((row) => row.member),
			query
		)
	);
	const visibleRows = $derived(
		rows.filter((row) => visible.some((member) => member.id === row.member.id))
	);

	async function load() {
		loadState = 'loading';
		const result = await listCrew(role);
		if (result.status === 'error') {
			loadState = 'error';
			return;
		}

		rows = result.data.map((member) => {
			const assignment = assignmentFor(member.id, role);
			return {
				member,
				status: dutyStatusFrom(member.status, assignment?.status),
				assignment
			};
		});
		loadState = 'ready';
	}

	$effect(() => {
		if (session.current?.role === 'operations') load();
	});

	function countFor(status: CrewStatus): number {
		return rows.filter((row) => row.status === status).length;
	}

	const searchId = 'crew-search';

	async function save(draft: CrewDraft) {
		saving = true;
		issues = [];
		const result = await saveCrew(draft);
		saving = false;

		if (result.status === 'error') {
			issues = result.issues ?? [];
			toasts.show(
				result.error.messageKey === 'ops_crew_account_new_only'
					? m.ops_crew_account_new_only()
					: m.ops_crew_error_title(),
				'warning'
			);
			return;
		}

		toasts.show(m.ops_crew_saved({ id: result.data.id }), 'success');
		issuedCredentials = result.credentials ?? null;
		editing = null;
		await load();
	}

	async function copyCredentials() {
		if (!issuedCredentials) return;
		const text = [
			`${m.ops_crew_credentials_identifier()}: ${issuedCredentials.identifier}`,
			`${m.ops_crew_credentials_badge()}: ${issuedCredentials.badgeId}`,
			`${m.ops_crew_credentials_password()}: ${issuedCredentials.initialPassword}`
		].join('\n');
		try {
			await navigator.clipboard.writeText(text);
			toasts.show(m.ops_crew_credentials_copied(), 'success');
		} catch {
			toasts.show(m.ops_crew_credentials_copy_failed(), 'warning');
		}
	}

	async function remove(row: CrewRow) {
		/*
			Someone rostered onto a running cannot simply vanish: the trip would
			name a crew member who no longer exists, and their own workspace would
			have nothing to show at sign-in. The refusal names the trips standing
			in the way rather than just failing.
		*/
		const result = await deleteCrew(row.member.id, allTrips());

		if (result.status === 'error') {
			const blocking = result.blockedBy?.map((trip) => trip.code).join(', ');
			toasts.show(
				blocking ? m.ops_crew_in_use_body({ trips: blocking }) : m.ops_crew_error_in_use(),
				'warning'
			);
			return;
		}

		toasts.show(m.ops_crew_removed({ id: row.member.id }), 'success');
		await load();
	}
</script>

{#if loadState === 'loading'}
	<div class="flex flex-col gap-4" aria-busy="true">
		<Skeleton width="100%" height="96px" radius="card" />
		<Skeleton width="100%" height="360px" radius="card" />
	</div>
{:else if loadState === 'error'}
	<ErrorState title={m.ops_error_title()} body={m.ops_error_body()} onRetry={load} />
{:else}
	{#if issuedCredentials}
		<section
			class="rounded-card border border-primary/35 bg-primary-soft p-5 shadow-level-1"
			aria-labelledby="crew-credentials-title"
		>
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h3 id="crew-credentials-title" class="flex items-center gap-2 text-title text-text">
						<Icon name="shield" size={20} />
						{m.ops_crew_credentials_title()}
					</h3>
					<p class="mt-1 text-body-sm text-text-muted">{m.ops_crew_credentials_body()}</p>
				</div>
				<Button variant="ghost" onclick={() => (issuedCredentials = null)}>
					{m.ops_crew_credentials_dismiss()}
				</Button>
			</div>
			<dl class="mt-4 grid gap-3 sm:grid-cols-3">
				<div class="rounded-[8px] bg-surface p-3">
					<dt class="text-caps uppercase text-text-muted">{m.ops_crew_credentials_identifier()}</dt>
					<dd class="text-mono-data mt-1 break-all text-text">{issuedCredentials.identifier}</dd>
				</div>
				<div class="rounded-[8px] bg-surface p-3">
					<dt class="text-caps uppercase text-text-muted">{m.ops_crew_credentials_badge()}</dt>
					<dd class="text-mono-data mt-1 break-all text-text">{issuedCredentials.badgeId}</dd>
				</div>
				<div class="rounded-[8px] bg-surface p-3">
					<dt class="text-caps uppercase text-text-muted">{m.ops_crew_credentials_password()}</dt>
					<dd class="text-mono-data mt-1 break-all text-text">{issuedCredentials.initialPassword}</dd>
				</div>
			</dl>
			<Button variant="secondary" iconLeft="clipboard" class="mt-4" onclick={copyCredentials}>
				{m.ops_crew_credentials_copy()}
			</Button>
		</section>
	{/if}

	<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		{#each crewStatuses as status (status)}
			<StatTile
				label={crewStatusLabel(status)}
				value={countFor(status)}
				tone={crewStatusTone(status)}
				icon={status === 'off-duty' ? 'clock' : status === 'on-trip' ? 'route' : 'user-check'}
			/>
		{/each}
	</div>

	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-body-sm text-text-muted">{m.ops_crew_privacy_note()}</p>
		{#if editing === null}
			<Button
				iconLeft="plus"
				onclick={() => {
					issues = [];
					editing = 'new';
				}}
			>
				{role === 'driver' ? m.ops_crew_add_driver() : m.ops_crew_add_conductor()}
			</Button>
		{/if}
	</div>

	{#if editing !== null}
		<CrewForm
			{role}
			editing={editingMember}
			{issues}
			{saving}
			onsave={save}
			oncancel={() => {
				editing = null;
				issues = [];
			}}
		/>
	{/if}

	<!-- Search sits directly above the table it filters. -->
	<div class="flex flex-wrap items-center gap-3">
		<!--
			Sized to the content, not the row. A roster search takes a duty ID or a
			name — never more than a couple of dozen characters — so a field
			stretched across the full width just looks like a mistake.
		-->
		<div class="relative flex w-full items-center sm:w-[320px]">
			<span class="pointer-events-none absolute left-3 text-text-muted">
				<Icon name="search" size={18} />
			</span>
			<input
				id={searchId}
				type="search"
				autocomplete="off"
				spellcheck="false"
				bind:value={query}
				aria-label={m.ops_crew_search_label()}
				placeholder={m.ops_crew_search_placeholder()}
				class="h-11 w-full rounded-[8px] border border-border-strong bg-background py-2 pr-10
					pl-10 text-body text-text placeholder:text-text-faint transition-colors
					focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/45"
			/>
			{#if query !== ''}
				<button
					type="button"
					onclick={() => (query = '')}
					aria-label={m.ops_crew_search_clear()}
					title={m.ops_crew_search_clear()}
					class="absolute right-1 flex h-9 w-9 items-center justify-center rounded-[8px]
						text-text-muted transition-colors hover:bg-surface-container hover:text-text"
				>
					<Icon name="close" size={16} />
				</button>
			{/if}
		</div>

		<span class="text-mono-data shrink-0 text-body-sm text-text-muted">
			{m.ops_crew_showing({ count: visibleRows.length, total: rows.length })}
		</span>
	</div>

	<!-- Announced as the roster narrows, without stealing focus from the field. -->
	<p class="sr-only" aria-live="polite">
		{m.ops_crew_showing({ count: visibleRows.length, total: rows.length })}
	</p>

	{#if visibleRows.length === 0 && query !== ''}
		<EmptyState
			icon="search"
			title={m.ops_crew_no_match_title()}
			body={m.ops_crew_no_match_body({ query })}
		/>
	{:else}
		<CrewTable
			rows={visibleRows}
			{query}
			onedit={(row) => {
				issues = [];
				editing = row.member;
			}}
			onremove={remove}
		/>
	{/if}
{/if}

<style>
	/*
		Chrome and Safari draw their own clear button inside `type="search"`,
		which sat next to ours and gave the field two crosses. The native one is
		unstyleable and does not match the rest of the form, so it stands down
		and ours — which matches the theme and carries a label — remains.
	*/
	input[type='search']::-webkit-search-cancel-button,
	input[type='search']::-webkit-search-decoration {
		-webkit-appearance: none;
		appearance: none;
		display: none;
	}
</style>
