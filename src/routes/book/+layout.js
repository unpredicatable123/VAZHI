// The booking routes are parameterised by bus id, so they cannot be
// prerendered by the static adapter. They are served through the SPA fallback
// (200.html) configured in svelte.config.js and render on the client.
export const prerender = false;
