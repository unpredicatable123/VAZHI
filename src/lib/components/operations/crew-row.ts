import type { CrewMember, CrewStatus, Trip } from '$types/fleet';

/**
 * One row of the crew roster.
 *
 * The live duty status is derived from the trip the crew member holds rather
 * than read off the roster record, so the table and the trip board cannot
 * disagree about who is out on the road.
 *
 * PRIVACY: a row is a crew record plus their assignment. There is no field here
 * for a contact detail or an identity document, and none may be added.
 */
export interface CrewRow {
	member: CrewMember;
	/** Live duty status, derived from the trip they hold. */
	status: CrewStatus;
	/** The running they are on, if any. */
	assignment?: Trip;
}
