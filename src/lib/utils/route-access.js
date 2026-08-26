import { roleHome } from '$types/auth';
/** Longest prefix wins, so specific rules can sit inside broader ones. */
const rules = [
    // Sign-in screens bounce an already-signed-in user to their own home.
    { prefix: '/login', access: 'guest-only' },
    { prefix: '/register', access: 'guest-only' },
    { prefix: '/conductor/login', access: 'guest-only' },
    { prefix: '/driver/login', access: 'guest-only' },
    { prefix: '/operations/login', access: 'guest-only' },
    // Operational workspaces, one role each.
    { prefix: '/conductor', access: 'conductor' },
    { prefix: '/driver', access: 'driver' },
    { prefix: '/operations', access: 'operations' },
    // Traveller operational surface. Searching begins a booking, so it is
    // gated alongside the rest of the flow.
    { prefix: '/explore', access: 'traveller' },
    { prefix: '/book', access: 'traveller' },
    { prefix: '/booking', access: 'traveller' },
    { prefix: '/ticket', access: 'traveller' },
    { prefix: '/trips', access: 'traveller' },
    { prefix: '/refund', access: 'traveller' },
    { prefix: '/account', access: 'traveller' }
];
function accessFor(pathname) {
    let match = null;
    for (const rule of rules) {
        const matches = pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`);
        if (matches && (!match || rule.prefix.length > match.prefix.length)) {
            match = rule;
        }
    }
    return match?.access ?? 'public';
}
/**
 * Decides where — if anywhere — the current request must be sent instead.
 *
 * Returning `null` means the page may render. The caller performs the
 * navigation; keeping this function pure makes the rules easy to test and
 * impossible to half-apply.
 */
export function redirectFor(pathname, current) {
    const access = accessFor(pathname);
    if (access === 'public')
        return null;
    if (access === 'guest-only') {
        return current ? { to: roleHome[current.role], reason: 'wrong-role' } : null;
    }
    // A role-protected route from here on.
    if (!current) {
        return { to: signInPathFor(access), reason: 'sign-in-required' };
    }
    if (current.role !== access) {
        return { to: roleHome[current.role], reason: 'wrong-role' };
    }
    return null;
}
/** Each role signs in through its own door. */
const signInPaths = {
    traveller: '/login/traveller',
    conductor: '/login/conductor',
    driver: '/login/driver',
    operations: '/login/operations'
};
export function signInPathFor(role) {
    return signInPaths[role];
}
/** Every sign-in screen, so the shell can recognise one without a role. */
export function isSignInPath(pathname) {
    return (pathname.startsWith('/login') ||
        pathname.startsWith('/register') ||
        Object.values(signInPaths).some((path) => pathname === path));
}
/**
 * Whether a path belongs to an operational workspace.
 *
 * The crew and controller workspaces bring their own navigation, so the
 * traveller shell — bottom bar, footer, discovery links — stands down inside
 * them. One predicate rather than a growing chain of `startsWith` calls in the
 * layout.
 */
export function isWorkspacePath(pathname) {
    return ['/conductor', '/driver', '/operations'].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
/**
 * Builds the sign-in URL, preserving where the traveller was heading.
 *
 * Only the path and non-identifying query string are carried, which is all our
 * routes ever put in a URL.
 */
export function withRedirectTo(signInPath, target) {
    if (!target || target === '/')
        return signInPath;
    return `${signInPath}?redirectTo=${encodeURIComponent(target)}`;
}
/**
 * Validates a `redirectTo` value before navigating to it.
 *
 * Only same-origin absolute paths are accepted, so a crafted link cannot use
 * the sign-in screen to bounce someone to another site.
 */
export function safeRedirectTarget(value, fallback) {
    if (!value)
        return fallback;
    if (!value.startsWith('/') || value.startsWith('//'))
        return fallback;
    return value;
}
