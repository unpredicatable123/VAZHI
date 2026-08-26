// The conductor workspace depends on the signed-in session and in-memory
// boarding state, so it renders on the client through the SPA fallback rather
// than being prerendered with fixture data.
export const prerender = false;
