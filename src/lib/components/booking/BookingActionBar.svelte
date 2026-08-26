<script>
let { summary, action } = $props();
export {};
</script>

<div
	class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface
		pb-[env(safe-area-inset-bottom)] shadow-level-2 md:sticky md:pb-0"
>
	<div
		class="shell-width flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6
			md:py-4"
	>
		<div class="min-w-0">{@render summary()}</div>
		<div class="shrink-0">{@render action()}</div>
	</div>
</div>
