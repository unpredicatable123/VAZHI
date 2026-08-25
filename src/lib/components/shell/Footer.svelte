<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	const year = new Date().getFullYear();

	const links = [
		{ href: '/privacy', label: () => m.footer_privacy() },
		{ href: '/help', label: () => m.footer_assistance() },
		{ href: '/accessibility', label: () => m.footer_accessibility() }
	];
</script>

<footer class="mt-auto border-t border-border">
	<div
		class="shell-width flex flex-col items-center justify-between gap-3 px-4 py-6
			md:flex-row md:px-6"
	>
		<p class="text-body-sm text-text-muted">{m.footer_rights({ year })}</p>
		<ul class="flex flex-wrap items-center justify-center gap-1">
			{#each links as link (link.href)}
				<li>
					<a
						href={link.href}
						class="flex min-h-[44px] items-center rounded-[8px] px-3 text-body-sm
							text-text-muted transition-colors hover:text-primary-soft-text"
					>
						{link.label()}
					</a>
				</li>
			{/each}
		</ul>
	</div>
</footer>
