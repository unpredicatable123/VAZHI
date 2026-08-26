import { crewFixtures } from './crew.mock';
/** Roster name for a duty ID, so the account table has one source for names. */
function crewName(id) {
    return crewFixtures.find((member) => member.id === id)?.name ?? id;
}
export const demoAccounts = [
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
export const demoCredentialHints = {
    traveller: { identifier: 'demo@vazhi.app', password: 'demo123' },
    conductor: { identifier: 'CON-023', password: 'demo123', driverId: 'TN-DVR-4471' },
    driver: { identifier: 'DRV-014', password: 'demo123', driverId: 'TN-DVR-2288' },
    operations: { identifier: 'OPS-01', password: 'demo123' }
};
