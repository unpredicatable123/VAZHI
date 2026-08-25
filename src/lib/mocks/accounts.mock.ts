import { crewFixtures } from './crew.mock';
import type { UserRole } from '$types/auth';

/**
 * Demo accounts seeded into Firebase Authentication for role-flow verification.
 *
 * THESE ARE NOT REAL PEOPLE. They exist so the four role experiences can be
 * demonstrated against the Firebase backend. Replace or disable them before
 * production use.
 *
 * `displayName` for a traveller is an operational label with no personal
 * content. For crew it is the roster name from `crew.mock`, so a driver is
 * greeted the way a depot would greet them; that name is invented for the
 * demonstration and describes no real person.
 *
 * `driverId` models the crew duty ID a state transport corporation prints on a
 * depot badge, and is required for both crew roles. The values below are
 * invented placeholders in an invented format; they are NOT real government
 * identity records, are not derived from any real register, and identify no
 * person. Each is treated purely as a second credential: checked at sign-in and
 * then discarded, never written into the `Session`, storage, a URL, or a log.
 *
 * The crew identifiers are the duty IDs the trip fixtures roster onto trips,
 * which is what makes `DRV-014` and `CON-023` land on the same trip when they
 * each sign in. `COND001`, the conductor identifier earlier builds used, is
 * kept as an alias so an existing bookmark or stored session still works.
 */

export interface DemoAccount {
	role: UserRole;
	/** Email, phone, crew duty id, or controller id. Matched case-insensitively. */
	identifier: string;
	/** Additional identifiers that resolve to the same demo account. */
	aliases: string[];
	password: string;
	displayName: string;
	/** Crew duty ID, crew accounts only. Credential, never stored. */
	driverId?: string;
}

/** Roster name for a duty ID, so the account table has one source for names. */
function crewName(id: string): string {
	return crewFixtures.find((member) => member.id === id)?.name ?? id;
}

export const demoAccounts: DemoAccount[] = [
	{
		role: 'traveller',
		identifier: 'demo@vazhi.app',
		aliases: ['9876500000'],
		password: 'demo123',
		displayName: 'Demo traveller'
	},
	{
		role: 'conductor',
		identifier: 'CON-023',
		aliases: ['COND001'],
		password: 'demo123',
		displayName: crewName('CON-023'),
		driverId: 'TN-DVR-4471'
	},
	{
		role: 'driver',
		identifier: 'DRV-014',
		aliases: [],
		password: 'demo123',
		displayName: crewName('DRV-014'),
		driverId: 'TN-DVR-2288'
	},
	// Additional-route crew accounts. The shared fill button intentionally
	// remains on the canonical pair; these credentials are documented for the
	// explicit Coimbatore → Chennai crew-dashboard test.
	{
		role: 'conductor',
		identifier: 'CON-061',
		aliases: [],
		password: 'demo123',
		displayName: crewName('CON-061'),
		driverId: 'TN-DVR-6101'
	},
	{
		role: 'driver',
		identifier: 'DRV-061',
		aliases: [],
		password: 'demo123',
		displayName: crewName('DRV-061'),
		driverId: 'TN-DVR-6102'
	},
	{
		role: 'operations',
		identifier: 'OPS-01',
		aliases: [],
		password: 'demo123',
		displayName: 'Salem Control'
	}
];

/** Shown on the sign-in screens so a reviewer can get in without guessing. */
export const demoCredentialHints: Record<
	UserRole,
	{ identifier: string; password: string; driverId?: string }
> = {
	traveller: { identifier: 'demo@vazhi.app', password: 'demo123' },
	conductor: { identifier: 'CON-023', password: 'demo123', driverId: 'TN-DVR-4471' },
	driver: { identifier: 'DRV-014', password: 'demo123', driverId: 'TN-DVR-2288' },
	operations: { identifier: 'OPS-01', password: 'demo123' }
};
