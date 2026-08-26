<script>
import Icon from '$components/primitives/Icon.svelte';
import * as m from '$lib/paraglide/messages';
let { issues, onjump } = $props();
</script>

{#if issues.length > 0}
	<div
		role="alert"
		class="rounded-card border border-danger/40 bg-danger-soft p-4"
	>
		<h2 class="flex items-center gap-2 text-title text-danger">
			<Icon name="alert" size={20} />
			{m.passengers_error_summary_title()}
		</h2>
		<p class="mt-1 text-body-sm text-text">
			{issues.length === 1
				? m.passengers_error_summary_intro_one()
				: m.passengers_error_summary_intro({ count: issues.length })}
		</p>
		<ul class="mt-2 list-inside list-disc space-y-1">
			{#each issues as issue (issue.fieldId)}
				<li class="text-body-sm text-text">
					<button
						type="button"
						onclick={() => onjump(issue.fieldId)}
						class="text-left underline underline-offset-2 hover:text-danger"
					>
						{issue.label}: {issue.message}
					</button>
				</li>
			{/each}
		</ul>
	</div>
{/if}
