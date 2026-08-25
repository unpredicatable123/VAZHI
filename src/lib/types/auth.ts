/**
 * Role and session model.
 *
 * Authentication is provided by Firebase Auth. Role claims are issued by
 * trusted callable functions: travellers may register themselves, while crew
 * and operations roles are provisioned administratively.
 *
 * PRIVACY: a `Session` deliberately holds no personal data beyond the roster
 * label the crew member is known by on duty. `displayName` is an operational
 * label ("Demo traveller", "Ravi Kumar" on a depot roster) and there is no
 * field for an email address, phone number, or crew duty credential.
 */

export type UserRole = 'traveller' | 'conductor' | 'driver' | 'operations';

/** Every role, in the order the role chooser lists them. */
export const userRoles: UserRole[] = ['traveller', 'conductor', 'driver', 'operations'];

export interface Session {
	role: UserRole;
	/**
	 * Account identifier: an email for a traveller, a duty ID for crew
	 * ("CON-023", "DRV-014"), a controller ID for operations. This is the key
	 * that resolves a crew member to their trip assignment.
	 */
	id: string;
	/**
	 * Label shown in the UI. For a traveller this is an operational label with
	 * no personal content; for crew it is the roster name they are addressed by
	 * on duty, which is the whole point of greeting a driver by name.
	 */
	displayName: string;
}

export interface Credentials {
	/** Email, phone, or crew duty id depending on the role being signed in. */
	identifier: string;
	password: string;
	/**
	 * Crew duty ID, required for a conductor or driver sign-in.
	 *
	 * PRIVACY: this is a credential, not a profile attribute. It is verified
	 * during the sign-in call and then dropped — there is deliberately no
	 * matching field on `Session`, so it cannot reach storage, a URL, a
	 * fixture, or a log by way of the signed-in user.
	 */
	driverId?: string;
}

/**
 * What a route requires of the current session.
 *
 * `public` is open to everyone; `guest-only` bounces an already-signed-in user
 * to their own home; a role value rejects every other role.
 */
export type RouteAccess = 'public' | 'guest-only' | UserRole;

/** Where each role lands after signing in. */
export const roleHome: Record<UserRole, string> = {
	traveller: '/',
	conductor: '/conductor',
	driver: '/driver',
	operations: '/operations'
};
