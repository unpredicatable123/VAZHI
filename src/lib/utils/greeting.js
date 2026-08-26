import * as m from '$lib/paraglide/messages';
/**
 * Time-of-day greeting.
 *
 * A crew member opens the app at the start of a duty, so the first line on the
 * screen is a greeting rather than a heading. Kept here so the wording and the
 * cut-off hours are decided once, and so both languages come through Paraglide.
 */
export function greetingFor(now = new Date()) {
    const hour = now.getHours();
    if (hour < 12)
        return m.greeting_morning();
    if (hour < 17)
        return m.greeting_afternoon();
    return m.greeting_evening();
}
