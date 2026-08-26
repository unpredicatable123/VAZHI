<script>
import Badge from '$components/primitives/Badge.svelte';
import Button from '$components/primitives/Button.svelte';
import EmptyState from '$components/primitives/EmptyState.svelte';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { formatClock, formatJourneyDate } from '$utils/format';
import { crewStatusLabel, crewStatusTone } from '$utils/trip-status';
import { splitOnMatch } from '$utils/highlight';
let { rows, query = '', onedit, onremove, class: className = '' } = $props();
const editable = $derived(onedit !== undefined || onremove !== undefined);
const locale = $derived(getLocale());
</script>

{#if rows.length === 0}
	<EmptyState icon="person" title={m.ops_crew_empty_title()} body={m.ops_crew_empty_body()} />
{:else}
	<div class={className}>
		<!-- Desktop / tablet -->
		<div class="hidden overflow-x-auto rounded-card border border-border bg-surface md:block">
			<table class="w-full border-collapse text-left">
				<caption class="sr-only">{m.ops_crew_table_caption()}</caption>
				<thead>
					<tr class="border-b border-border bg-surface-container">
						<th scope="col" class="px-4 py-3 text-caps uppercase text-text-muted">
							{m.ops_column_crew_id()}
						</th>
						<th scope="col" class="px-4 py-3 text-caps uppercase text-text-muted">
							{m.ops_column_name()}
						</th>
						<th scope="col" class="px-4 py-3 text-caps uppercase text-text-muted">
							{m.ops_column_depot()}
						</th>
						<th scope="col" class="px-4 py-3 text-caps uppercase text-text-muted">
							{m.ops_column_status()}
						</th>
						<th scope="col" class="px-4 py-3 text-caps uppercase text-text-muted">
							{m.ops_column_assignment()}
						</th>
						{#if editable}
							<th scope="col" class="px-4 py-3 text-caps uppercase text-text-muted">
								<span class="sr-only">{m.ops_column_actions()}</span>
							</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.member.id)}
						<tr class="border-b border-border last:border-0">
							<td class="text-mono-data px-4 py-3 text-body-sm font-semibold text-text">
								{#each splitOnMatch(row.member.id, query) as part, index (index)}
									<span class={part.match ? 'rounded-[3px] bg-accent-soft text-text' : ''}
										>{part.text}</span
									>
								{/each}
							</td>
							<td class="px-4 py-3 text-body-sm text-text">
								{#each splitOnMatch(row.member.name, query) as part, index (index)}
									<span class={part.match ? 'rounded-[3px] bg-accent-soft text-text' : ''}
										>{part.text}</span
									>
								{/each}
							</td>
							<td class="px-4 py-3 text-body-sm text-text-muted">
								{#each splitOnMatch(row.member.depot, query) as part, index (index)}
									<span class={part.match ? 'rounded-[3px] bg-accent-soft text-text' : ''}
										>{part.text}</span
									>
								{/each}
							</td>
							<td class="px-4 py-3">
								<Badge tone={crewStatusTone(row.status)} shape="pill">
									{crewStatusLabel(row.status)}
								</Badge>
							</td>
							<td class="px-4 py-3 text-body-sm">
								{#if row.assignment}
									<span class="text-mono-data font-semibold text-text">
										{row.assignment.code}
									</span>
									<span class="block text-text-muted">
										{formatJourneyDate(row.assignment.serviceDate, locale)}
										· {formatClock(row.assignment.departureTime)}
									</span>
								{:else}
									<span class="text-text-faint">{m.ops_no_assignment()}</span>
								{/if}
							</td>
							{#if editable}
								<td class="px-4 py-3">
									<div class="flex justify-end gap-1">
										{#if onedit}
											<Button variant="ghost" onclick={() => onedit(row)}>
												{m.ops_action_edit()}
											</Button>
										{/if}
										{#if onremove}
											<Button variant="ghost" onclick={() => onremove(row)}>
												{m.ops_action_remove()}
											</Button>
										{/if}
									</div>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Mobile -->
		<ul class="flex flex-col gap-3 md:hidden">
			{#each rows as row (row.member.id)}
				<li class="rounded-card border border-border bg-surface p-4 shadow-level-1">
					<div class="flex flex-wrap items-start justify-between gap-2">
						<div>
							<p class="text-mono-data text-body font-semibold text-text">
								{#each splitOnMatch(row.member.id, query) as part, index (index)}
									<span class={part.match ? 'rounded-[3px] bg-accent-soft' : ''}>{part.text}</span>
								{/each}
							</p>
							<p class="text-body-sm text-text">
								{#each splitOnMatch(row.member.name, query) as part, index (index)}
									<span class={part.match ? 'rounded-[3px] bg-accent-soft' : ''}>{part.text}</span>
								{/each}
							</p>
							<p class="text-body-sm text-text-muted">
								{#each splitOnMatch(row.member.depot, query) as part, index (index)}
									<span class={part.match ? 'rounded-[3px] bg-accent-soft' : ''}>{part.text}</span>
								{/each}
							</p>
						</div>
						<Badge tone={crewStatusTone(row.status)} shape="pill">
							{crewStatusLabel(row.status)}
						</Badge>
					</div>
					<div class="mt-3">
						<p class="text-caps uppercase text-text-muted">{m.ops_column_assignment()}</p>
						{#if row.assignment}
							<p class="text-mono-data text-body-sm font-semibold text-text">
								{row.assignment.code}
							</p>
							<p class="text-body-sm text-text-muted">
								{formatJourneyDate(row.assignment.serviceDate, locale)}
								· {formatClock(row.assignment.departureTime)}
							</p>
						{:else}
							<p class="text-body-sm text-text-faint">{m.ops_no_assignment()}</p>
						{/if}
					</div>

					{#if editable}
						<div class="mt-3 flex gap-2 border-t border-border pt-3">
							{#if onedit}
								<Button variant="secondary" onclick={() => onedit(row)}>
									{m.ops_action_edit()}
								</Button>
							{/if}
							{#if onremove}
								<Button variant="ghost" onclick={() => onremove(row)}>
									{m.ops_action_remove()}
								</Button>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
{/if}
