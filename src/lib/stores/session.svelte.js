import { observeSession } from '$services/auth.service';
/**
 * Whether two sessions describe the same signed-in person.
 *
 * Compares by value, not by reference. `Session` is three fields and this
 * compares all three; a fourth added to the type must be added here too, or a
 * change to it would go unnoticed.
 */
function sameSession(a, b) {
    if (a === b)
        return true;
    if (!a || !b)
        return false;
    return a.role === b.role && a.id === b.id && a.displayName === b.displayName;
}
/**
 * The single source of truth for who is signed in.
 *
 * Centralised on purpose: no page or component decides for itself whether
 * someone is authenticated. Route protection reads this store through
 * `route-access`, and sign-out clears it in one place.
 *
 * Holds no personal data — see the note on `Session`.
 */
class SessionStore {
    current = $state(null);
    /** True once persisted state has been read; guards must wait for it. */
    initialised = $state(false);
    #unsubscribe = null;
    get role() {
        return this.current?.role ?? null;
    }
    get isSignedIn() {
        return this.current !== null;
    }
    is(role) {
        return this.current?.role === role;
    }
    init() {
        if (this.initialised)
            return;
        if (this.#unsubscribe)
            return;
        this.#unsubscribe = observeSession((value) => {
            // Only publish a genuine change. Firebase re-runs this observer on
            // every ID token refresh — roughly hourly, and again on tab focus —
            // each time handing back a freshly built Session object. Assigning it
            // blindly changed the signal's identity even when the same person was
            // still signed in, which woke every `$effect` that reads the session
            // and made each mounted screen refetch all of its data for nothing.
            if (!sameSession(this.current, value))
                this.current = value;
            this.initialised = true;
        });
    }
    start(session) {
        this.current = session;
    }
    /**
     * Ends the session. Callers are responsible for also clearing any
     * role-specific working state — see `endSession` in `session.actions`.
     */
    end() {
        this.current = null;
    }
}
export const session = new SessionStore();
