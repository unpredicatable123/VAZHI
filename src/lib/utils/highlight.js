/**
 * Splitting text so a search match can be marked.
 *
 * WHY. Searching a roster for `DRV` correctly returns every driver, because
 * every duty ID starts with it — and with nothing marked, a full list and an
 * unfiltered list look identical. The search appeared broken when it was doing
 * exactly the right thing. Marking the matched run is what shows it ran.
 *
 * Returns segments rather than markup on purpose. The caller renders each
 * segment as its own element, so nothing here ever goes near `{@html}` and a
 * crew name cannot become an injection vector.
 */
/**
 * Splits `value` around every case-insensitive occurrence of `query`.
 *
 * An empty or unmatched query returns the whole string as a single unmatched
 * segment, so a caller can render the result unconditionally.
 */
export function splitOnMatch(value, query) {
    const needle = query.trim().toLocaleLowerCase();
    if (needle === '')
        return [{ text: value, match: false }];
    const haystack = value.toLocaleLowerCase();
    const segments = [];
    let cursor = 0;
    for (;;) {
        const found = haystack.indexOf(needle, cursor);
        if (found === -1)
            break;
        if (found > cursor)
            segments.push({ text: value.slice(cursor, found), match: false });
        segments.push({ text: value.slice(found, found + needle.length), match: true });
        cursor = found + needle.length;
    }
    if (cursor < value.length)
        segments.push({ text: value.slice(cursor), match: false });
    return segments.length > 0 ? segments : [{ text: value, match: false }];
}
