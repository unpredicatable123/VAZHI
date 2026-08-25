<script lang="ts">
	/**
	 * The aisle between the two seat blocks.
	 *
	 * Carries the row numbers, so a seat can be found by counting down the
	 * coach from the door — the way a passenger or a conductor actually does
	 * it — and the tread pattern keeps it reading as floor rather than as a gap
	 * between two grids.
	 */

	interface Props {
		rows: number[];
	}

	let { rows }: Props = $props();
</script>

<div class="coach-gangway flex gap-1.5 rounded-[4px] py-0.5">
	{#each rows as row (row)}
		<span
			class="text-mono-data flex h-5 w-11 items-center justify-center rounded-[3px] bg-surface
				text-[10px] font-semibold text-text-muted"
			aria-hidden="true"
		>
			{row}
		</span>
	{/each}
</div>

<style>
	.coach-gangway {
		background-image: repeating-linear-gradient(
			90deg,
			var(--c-border) 0,
			var(--c-border) 1px,
			transparent 1px,
			transparent 7px
		);
		background-color: color-mix(in srgb, var(--c-surface) 60%, transparent);
	}
</style>
