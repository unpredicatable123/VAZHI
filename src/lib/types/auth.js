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
/** Every role, in the order the role chooser lists them. */
export const userRoles = ['traveller', 'conductor', 'driver', 'operations'];
/** Where each role lands after signing in. */
export const roleHome = {
    traveller: '/',
    conductor: '/conductor',
    driver: '/driver',
    operations: '/operations'
};
