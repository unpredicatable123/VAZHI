/**
 * Shared plumbing for the mock service layer.
 *
 * When these services move onto a real API this module becomes the fetch
 * wrapper (base URL, headers, error mapping) and the call sites stay unchanged.
 */
const MOCK_LATENCY_MS = 220;
/** Gives pages a realistic loading state to render against. */
export function simulateLatency(ms = MOCK_LATENCY_MS) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Loads a bundled JSON asset from `static/`.
 *
 * `fetchJson` takes the SvelteKit-provided `fetch` so the call also works
 * during prerender.
 */
export async function fetchJson(path, fetcher = globalThis.fetch) {
    const response = await fetcher(path);
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return (await response.json());
}
