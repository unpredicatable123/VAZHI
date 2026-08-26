<script>
import Icon from './Icon.svelte';
let { id, label, value = $bindable(), type = 'text', placeholder, icon, error, hint, required = false, readonly = false, min, list, autocomplete = 'off', class: className = '', oninput } = $props();
const errorId = $derived(`${id}-error`);
const hintId = $derived(`${id}-hint`);
const describedBy = $derived([error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined);
</script>

<div class={`flex flex-col gap-2 ${className}`}>
	<label class="text-caps uppercase text-text-muted" for={id}>
		{label}{#if required}<span aria-hidden="true" class="text-danger"> *</span>{/if}
	</label>

	<div class="relative flex items-center">
		{#if icon}
			<span class="pointer-events-none absolute left-3 text-text-muted">
				<Icon name={icon} size={20} />
			</span>
		{/if}
		<input
			{id}
			{type}
			{placeholder}
			{readonly}
			{required}
			{min}
			{list}
			{autocomplete}
			bind:value
			{oninput}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={describedBy}
			class="h-11 w-full rounded-[8px] border bg-background py-2 pr-3 text-body text-text
				placeholder:text-text-faint transition-colors
				focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/45
				{icon ? 'pl-11' : 'pl-3'}
				{error ? 'border-danger' : 'border-border-strong'}"
		/>
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
