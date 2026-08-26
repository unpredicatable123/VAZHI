<script>
import Icon from './Icon.svelte';
let { id, label, value = $bindable(), options, icon, error, hint, labelHidden = false, class: className = '', onchange } = $props();
const errorId = $derived(`${id}-error`);
const hintId = $derived(`${id}-hint`);
const describedBy = $derived([error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined);
function handleChange(event) {
    onchange?.(event.currentTarget.value);
}
</script>

<div class={`flex flex-col gap-2 ${className}`}>
	<label class={labelHidden ? 'sr-only' : 'text-caps uppercase text-text-muted'} for={id}>
		{label}
	</label>

	<div class="relative flex items-center">
		{#if icon}
			<span class="pointer-events-none absolute left-3 text-text-muted">
				<Icon name={icon} size={20} />
			</span>
		{/if}
		<select
			{id}
			bind:value
			onchange={handleChange}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={describedBy}
			class="h-11 w-full appearance-none rounded-[8px] border bg-background py-2 pr-10 text-body
				text-text transition-colors focus:border-primary focus:outline-none
				focus:ring-2 focus:ring-primary/45
				{icon ? 'pl-11' : 'pl-3'}
				{error ? 'border-danger' : 'border-border-strong'}"
		>
			{#each options as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
		<span class="pointer-events-none absolute right-3 text-text-muted">
			<Icon name="chevron-down" size={20} />
		</span>
	</div>

	{#if hint && !error}
		<p id={hintId} class="text-body-sm text-text-muted">{hint}</p>
	{/if}
	{#if error}
		<p id={errorId} class="flex items-center gap-1.5 text-body-sm text-danger">
			<Icon name="alert" size={16} />
			{error}
		</p>
	{/if}
</div>
