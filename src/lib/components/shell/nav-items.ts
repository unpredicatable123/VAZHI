import type { IconName } from '$components/primitives/icons';
import * as m from '$lib/paraglide/messages';
import type { UserRole } from '$types/auth';

export interface NavItem {
	href: string;
	icon: IconName;
	label: () => string;
	/** Mobile bottom navigation carries the four core destinations only. */
	mobile: boolean;
}

/**
 * Global navigation. Booking steps deliberately never appear here — progress
 * through a booking is shown by `BookingProgress` instead (spec section 7).
 *
 * The traveller set is the default shell. Each operational role gets its own
 * set further down, rendered by `WorkspaceNav`, so a workspace destination
 * never appears in the traveller shell and a booking destination never appears
 * in a workspace.
 */
export const navItems: NavItem[] = [
	{ href: '/', icon: 'home', label: () => m.nav_home(), mobile: true },
	{ href: '/explore', icon: 'explore', label: () => m.nav_explore(), mobile: true },
	{ href: '/trips', icon: 'ticket', label: () => m.nav_my_trips(), mobile: true },
	{ href: '/help', icon: 'help', label: () => m.nav_help(), mobile: false }
];

/**
 * Destinations for a signed-out visitor: discovery is public, so only the
 * account-bound entries are withheld until sign-in.
 */
export const guestNavItems: NavItem[] = [
	{ href: '/', icon: 'home', label: () => m.nav_home(), mobile: true },
	{ href: '/explore', icon: 'explore', label: () => m.nav_explore(), mobile: true },
	{ href: '/help', icon: 'help', label: () => m.nav_help(), mobile: false }
];

export function isActive(pathname: string, href: string): boolean {
	if (href === '/') return pathname === '/';
	return pathname === href || pathname.startsWith(`${href}/`);
}

/* ------------------------------------------------------------ profile menu */

/**
 * Links in the profile menu.
 *
 * The account destinations under `/account` are traveller-only, so offering
 * them to a driver or a controller would send them into a route the guard
 * immediately bounces them out of — a dead end with a warning toast on the way
 * back. Crew and controllers get the two public destinations instead, and the
 * menu keeps its language, theme, and sign-out controls for everyone.
 */
export interface ProfileLink {
	href: string;
	icon: IconName;
	label: () => string;
}

const accountLinks: ProfileLink[] = [
	{ href: '/account/profile', icon: 'person', label: () => m.profile_my_profile() },
	{ href: '/account/preferences', icon: 'sliders', label: () => m.profile_travel_preferences() },
	{ href: '/account/transactions', icon: 'payments', label: () => m.profile_transactions() },
	{
		href: '/account/preferences#accessible-travel-mode',
		icon: 'accessible',
		label: () => m.profile_accessible_mode()
	},
	{
		href: '/account/preferences#prefs-notify',
		icon: 'bell',
		label: () => m.profile_notifications()
	}
];

const supportLinks: ProfileLink[] = [
	{ href: '/help', icon: 'help', label: () => m.profile_help_support() },
	{ href: '/privacy', icon: 'shield', label: () => m.profile_privacy_safety() }
];

/** `null` covers a signed-out visitor, who may still open an account page. */
export function profileLinksFor(role: UserRole | null): ProfileLink[] {
	if (role === null || role === 'traveller') return [...accountLinks, ...supportLinks];
	return supportLinks;
}

/* --------------------------------------------------- operational workspaces */

/**
 * Navigation for one operational workspace.
 *
 * Every crew and controller destination in the app is declared here, beside the
 * traveller set, so there is one file to read to know where a role can go. The
 * shape has no `mobile` flag because a workspace bar carries all of its
 * destinations on both breakpoints — a conductor at the door and a controller
 * at a desk need the same tools.
 */
interface WorkspaceNavItem {
	href: string;
	icon: IconName;
	label: () => string;
}

const conductorNavItems: WorkspaceNavItem[] = [
	{ href: '/conductor', icon: 'gauge', label: () => m.conductor_nav_dashboard() },
	{ href: '/conductor/trip', icon: 'bus', label: () => m.conductor_nav_trip() },
	{ href: '/conductor/passengers', icon: 'seat', label: () => m.conductor_nav_passengers() },
	{ href: '/conductor/verify', icon: 'scan', label: () => m.conductor_nav_verify() },
	{ href: '/conductor/security', icon: 'lock', label: () => m.crew_nav_security() }
];

const driverNavItems: WorkspaceNavItem[] = [
	{ href: '/driver', icon: 'gauge', label: () => m.driver_nav_dashboard() },
	{ href: '/driver/trip', icon: 'bus', label: () => m.driver_nav_trip() },
	{ href: '/driver/stops', icon: 'list', label: () => m.driver_nav_stops() },
	{ href: '/driver/status', icon: 'route', label: () => m.driver_nav_status() },
	{ href: '/driver/security', icon: 'lock', label: () => m.crew_nav_security() }
];

const operationsNavItems: WorkspaceNavItem[] = [
	{ href: '/operations', icon: 'gauge', label: () => m.ops_nav_dashboard() },
	{ href: '/operations/trips', icon: 'route', label: () => m.ops_nav_trips() },
	{ href: '/operations/refunds', icon: 'payments', label: () => 'Refund Approvals' },
	{ href: '/operations/buses', icon: 'bus', label: () => m.ops_nav_buses() },
	{ href: '/operations/drivers', icon: 'steering', label: () => m.ops_nav_drivers() },
	{ href: '/operations/conductors', icon: 'clipboard', label: () => m.ops_nav_conductors() },
	{ href: '/operations/assignments', icon: 'sliders', label: () => m.ops_nav_assignments() }
];

export interface WorkspaceNav {
	/** Accessible name for the navigation landmark. */
	label: () => string;
	/** Workspace root, which must not light up on every child route. */
	root: string;
	items: WorkspaceNavItem[];
}

/** The workspace a role works in, or `null` for a traveller. */
export function workspaceNavFor(role: UserRole): WorkspaceNav | null {
	switch (role) {
		case 'conductor':
			return {
				label: () => m.conductor_workspace(),
				root: '/conductor',
				items: conductorNavItems
			};
		case 'driver':
			return { label: () => m.driver_workspace(), root: '/driver', items: driverNavItems };
		case 'operations':
			return {
				label: () => m.ops_workspace(),
				root: '/operations',
				items: operationsNavItems
			};
		default:
			return null;
	}
}
