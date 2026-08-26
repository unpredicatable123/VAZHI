<script>
import * as m from '$lib/paraglide/messages';
let { rows, wheelRows } = $props();
</script>

<div class="flex gap-1.5" aria-hidden="true">
	{#each rows as row (row)}
		<span
			class="h-2.5 w-11 rounded-[3px] {wheelRows.includes(row)
				? 'bg-border-strong ring-1 ring-inset ring-border-strong'
				: 'bg-accent/35 ring-1 ring-inset ring-accent/70'}"
			title={wheelRows.includes(row) ? m.seats_wheel() : m.seats_windows()}
		></span>
	{/each}
</div>
