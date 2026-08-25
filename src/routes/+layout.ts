// Static adapter: every Phase 1 route is prerendered, with a client-side
// fallback for the parameterised booking routes added in later phases.
export const prerender = true;
export const ssr = true;
export const trailingSlash = 'never';
