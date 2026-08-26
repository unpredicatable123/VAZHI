// The driver workspace depends on the signed-in session and on trip state held
// in the browser, so it renders on the client through the SPA fallback rather
// than being prerendered with fixture data.
export const prerender = false;
