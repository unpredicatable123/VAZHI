import type { CrewMember } from '$types/fleet';

/**
 * Crew fixtures — drivers and conductors on the demonstration roster.
 *
 * MOCK ROSTER. These duty IDs and names are invented for the demonstration.
 * They are not drawn from any employment record or government register, and no
 * depot system is contacted to produce them.
 *
 * PRIVACY: a crew record carries a duty ID, the roster name the crew member is
 * addressed by on duty, the depot they book on at, and a duty status. There is
 * no field here — and none may be added — for a phone number, home address,
 * date of birth, licence number, government ID, or medical detail. Operations
 * lists exactly these four columns for that reason.
 *
 * `CON-023` carries the alias `COND001`, the identifier the conductor demo
 * account used before crew records existed, so a session or bookmark from an
 * earlier build still resolves to the right crew member.
 */

/** The crew on the canonical demonstration trip. */
const CANONICAL_DRIVER_ID = 'DRV-014';
const CANONICAL_CONDUCTOR_ID = 'CON-023';

function demoCrew(
	id: string,
	role: CrewMember['role'],
	name: string,
	depot: string
): CrewMember {
	return { id, role, name, depot, status: 'assigned', aliases: [] };
}

export const crewFixtures: CrewMember[] = [
	{
		id: CANONICAL_DRIVER_ID,
		role: 'driver',
		name: 'Ravi Kumar',
		depot: 'Salem Depot I',
		status: 'assigned',
		aliases: []
	},
	{
		id: 'DRV-019',
		role: 'driver',
		name: 'Suresh Babu',
		depot: 'Salem Depot I',
		status: 'assigned',
		aliases: []
	},
	{
		id: 'DRV-022',
		role: 'driver',
		name: 'Anand Raj',
		depot: 'Salem Depot II',
		status: 'assigned',
		aliases: []
	},
	{
		id: 'DRV-031',
		role: 'driver',
		name: 'Murugan S',
		depot: 'Erode Depot',
		status: 'assigned',
		aliases: []
	},
	{
		id: 'DRV-041',
		role: 'driver',
		name: 'Karthik V',
		depot: 'Salem Depot II',
		status: 'assigned',
		aliases: []
	},
	{
		id: 'DRV-047',
		role: 'driver',
		name: 'Prakash M',
		depot: 'Salem Depot I',
		status: 'available',
		aliases: []
	},
	{
		id: 'DRV-052',
		role: 'driver',
		name: 'Selvam R',
		depot: 'Erode Depot',
		status: 'off-duty',
		aliases: []
	},
	{
		id: CANONICAL_CONDUCTOR_ID,
		role: 'conductor',
		name: 'Meena Lakshmi',
		depot: 'Salem Depot I',
		status: 'assigned',
		aliases: ['COND001']
	},
	{
		id: 'CON-024',
		role: 'conductor',
		name: 'Vignesh P',
		depot: 'Salem Depot II',
		status: 'assigned',
		aliases: []
	},
	{
		id: 'CON-025',
		role: 'conductor',
		name: 'Arun Kumar',
		depot: 'Erode Depot',
		status: 'assigned',
		aliases: []
	},
	{
		id: 'CON-026',
		role: 'conductor',
		name: 'Divya S',
		depot: 'Salem Depot II',
		status: 'assigned',
		aliases: []
	},
	{
		id: 'CON-031',
		role: 'conductor',
		name: 'Bhuvana R',
		depot: 'Salem Depot I',
		status: 'assigned',
		aliases: []
	},
	{
		id: 'CON-035',
		role: 'conductor',
		name: 'Ramesh K',
		depot: 'Salem Depot I',
		status: 'available',
		aliases: []
	},
	{
		id: 'CON-038',
		role: 'conductor',
		name: 'Saranya M',
		depot: 'Erode Depot',
		status: 'off-duty',
		aliases: []
	},

	// Dedicated crews keep each additional current-day trip independently
	// addressable from the Driver and Conductor workspaces.
	demoCrew('DRV-061', 'driver', 'Aravind S', 'Coimbatore Depot I'),
	demoCrew('CON-061', 'conductor', 'Kavitha M', 'Coimbatore Depot I'),
	demoCrew('DRV-062', 'driver', 'Senthil K', 'Coimbatore Depot II'),
	demoCrew('CON-062', 'conductor', 'Priya R', 'Coimbatore Depot II'),
	demoCrew('DRV-063', 'driver', 'Naveen P', 'Coimbatore Depot I'),
	demoCrew('CON-063', 'conductor', 'Lakshmi V', 'Coimbatore Depot I'),
	demoCrew('DRV-064', 'driver', 'Ganesan R', 'Madurai Depot I'),
	demoCrew('CON-064', 'conductor', 'Revathi S', 'Madurai Depot I'),
	demoCrew('DRV-065', 'driver', 'Bala M', 'Madurai Depot II'),
	demoCrew('CON-065', 'conductor', 'Kala P', 'Madurai Depot II'),
	demoCrew('DRV-066', 'driver', 'Dinesh K', 'Madurai Depot I'),
	demoCrew('CON-066', 'conductor', 'Nandhini R', 'Madurai Depot I'),
	demoCrew('DRV-067', 'driver', 'Manjunath S', 'Bangalore Depot'),
	demoCrew('CON-067', 'conductor', 'Anitha K', 'Bangalore Depot'),
	demoCrew('DRV-068', 'driver', 'Rajesh V', 'Vellore Depot'),
	demoCrew('CON-068', 'conductor', 'Deepa M', 'Vellore Depot'),
	demoCrew('DRV-069', 'driver', 'Pradeep R', 'Bangalore Depot'),
	demoCrew('CON-069', 'conductor', 'Shalini P', 'Bangalore Depot'),
	demoCrew('DRV-070', 'driver', 'Kumaravel S', 'Trichy Depot I'),
	demoCrew('CON-070', 'conductor', 'Geetha R', 'Trichy Depot I'),
	demoCrew('DRV-071', 'driver', 'Saravanan M', 'Trichy Depot II'),
	demoCrew('CON-071', 'conductor', 'Jayanthi K', 'Trichy Depot II'),
	demoCrew('DRV-072', 'driver', 'Mohan P', 'Trichy Depot I'),
	demoCrew('CON-072', 'conductor', 'Pavithra S', 'Trichy Depot I'),
	demoCrew('DRV-073', 'driver', 'Elango V', 'Salem Depot I'),
	demoCrew('CON-073', 'conductor', 'Devi R', 'Salem Depot I'),
	demoCrew('DRV-074', 'driver', 'Ashok K', 'Salem Depot II'),
	demoCrew('CON-074', 'conductor', 'Uma M', 'Salem Depot II')
];
