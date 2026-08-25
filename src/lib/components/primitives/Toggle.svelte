<script lang="ts">
	interface Props {
		id: string;
		/** Accessible name. Pass `labelledBy` instead when a heading names it. */
		label?: string;
		labelledBy?: string;
		describedBy?: string;
		checked: boolean;
		disabled?: boolean;
		class?: string;
		onchange?: (checked: boolean) => void;
	}

	let {
		id,
		label,
		labelledBy,
		describedBy,
		checked = $bindable(),
		disabled = false,
		class: className = '',
		onchange
	}: Props = $props();

	function toggle() {
		if (disabled) return;
		checked = !checked;
		onchange?.(checked);
	}
</script>

<!-- A real switch role rather than a styled checkbox, so screen readers
     announce on/off rather than checked/unchecked. -->
<button
	{id}
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label={labelledBy ? undefined : label}
	aria-labelledby={labelledBy}
	aria-describedby={describedBy}
	{disabled}
	onclick={toggle}
	class={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px]
		disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
>
	<span
		class="relative block h-6 w-11 rounded-full transition-colors duration-150
			{checked ? 'bg-primary' : 'bg-border-strong'}"
	>
		<span
			class="absolute top-0.5 left-0.5 block h-5 w-5 rounded-full bg-white shadow-sm
				transition-transform duration-150 {checked ? 'translate-x-5' : 'translate-x-0'}"
		></span>
	</span>
</button>
