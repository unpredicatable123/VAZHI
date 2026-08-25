import { browser } from '$app/environment';
import { busFleetFixtures } from '$lib/mocks/fleet.mock';
import { crewFixtures } from '$lib/mocks/crew.mock';
import type { Bus, CrewMember } from '$types/fleet';

/**
 * Fleet and roster edits — the one place a vehicle or a crew record is written.
 *
 * The shipped fixtures stay the baseline. This store holds what Operations has
 * changed on top of them: records added, records edited, and records retired.
 * Reading a merged list rather than mutating the fixtures means the demo can
 * always be reset by clearing storage, and a reviewer can still see what the
 * build ships with.
 *
 * An edited fixture is stored as a whole record under the same id, which then
 * replaces the fixture — the same arrangement `trips.svelte` uses for a trip
 * that Operations has rescheduled.
 *
 * PRIVACY: a `CrewMember` is a duty ID, a roster name, a depot, a duty status,
 * and past identifiers. There is no field for a contact detail or an identity
 * document, so nothing of that kind can reach storage through here. The
 * allowlist below is the second line of that defence: a field added to the type
 * later cannot be persisted without an obvious, reviewable change here.
 */

const STORAGE_KEY = 'vazhi.fleet';

interface StoredState {
	buses: Bus[];
	crew: CrewMember[];
	retiredBusIds: string[];
	retiredCrewIds: string[];
}

/** The complete allowlist of vehicle fields that may be written to storage. */
function serialiseBus(bus: Bus): Bus {
	return {
		id: bus.id,
		status: bus.status,
		registrationNumber: bus.registrationNumber,
		operator: bus.operator,
		serviceType: bus.serviceType,
		cabinClass: bus.cabinClass,
		seatLayout: bus.seatLayout,
		totalSeats: bus.totalSeats,
		amenities: {
			airConditioned: bus.amenities.airConditioned,
			seatLayout: bus.amenities.seatLayout,
			chargingPoints: bus.amenities.chargingPoints,
			restStop: bus.amenities.restStop
		},
		accessibleBoardingPoint: bus.accessibleBoardingPoint
	};
}

/** The complete allowlist of crew fields that may be written to storage. */
function serialiseCrew(member: CrewMember): CrewMember {
	return {
		id: member.id,
		role: member.role,
		name: member.name,
		depot: member.depot,
		status: member.status,
		retired: member.retired,
		aliases: [...member.aliases]
	};
}

function load(): StoredState {
	const empty: StoredState = { buses: [], crew: [], retiredBusIds: [], retiredCrewIds: [] };
	if (!browser) return empty;

	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return empty;
		const parsed = JSON.parse(raw) as Partial<StoredState>;

		return {
			buses: Array.isArray(parsed.buses)
				? parsed.buses
						.filter((entry) => entry && typeof entry.id === 'string')
						.map((entry) => serialiseBus(entry as Bus))
				: [],
			crew: Array.isArray(parsed.crew)
				? parsed.crew
						.filter(
							(entry) =>
								entry &&
								typeof entry.id === 'string' &&
								(entry.role === 'driver' || entry.role === 'conductor')
						)
						.map((entry) => serialiseCrew(entry as CrewMember))
				: [],
			retiredBusIds: Array.isArray(parsed.retiredBusIds)
				? parsed.retiredBusIds.filter((id): id is string => typeof id === 'string')
				: [],
			retiredCrewIds: Array.isArray(parsed.retiredCrewIds)
				? parsed.retiredCrewIds.filter((id): id is string => typeof id === 'string')
				: []
		};
	} catch {
		return empty;
	}
}

class FleetStore {
	/** Vehicles added or edited by Operations, keyed by id. */
	edits = $state<Bus[]>([]);
	/** Crew added or edited by Operations. */
	crewEdits = $state<CrewMember[]>([]);
	/** Shipped records Operations has retired. */
	retiredBusIds = $state<string[]>([]);
	retiredCrewIds = $state<string[]>([]);
	initialised = $state(false);

	init(): void {
		if (this.initialised) return;
		this.edits = [];
		this.crewEdits = [];
		this.retiredBusIds = [];
		this.retiredCrewIds = [];
		this.initialised = true;
	}

	/**
	 * The fleet as it stands: shipped vehicles, minus retired ones, with edits
	 * replacing the record they edit.
	 */
	get buses(): Bus[] {
		this.init();
		const editedIds = new Set(this.edits.map((bus) => bus.id));
		const retired = new Set(this.retiredBusIds);

		const base = busFleetFixtures.filter(
			(bus) => !retired.has(bus.id) && !editedIds.has(bus.id)
		);
		const edits = this.edits.filter((bus) => !retired.has(bus.id));

		// Edited fixtures keep their original position; genuinely new vehicles
		// go to the end, so the list does not reshuffle on every save.
		const fixtureOrder = new Map(busFleetFixtures.map((bus, index) => [bus.id, index]));
		return [...base, ...edits].sort(
			(a, b) =>
				(fixtureOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
				(fixtureOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER)
		);
	}

	/** The roster as it stands, on the same rules. */
	get crew(): CrewMember[] {
		this.init();
		const editedIds = new Set(this.crewEdits.map((member) => member.id));
		const retired = new Set(this.retiredCrewIds);

		const base = crewFixtures.filter(
			(member) => !retired.has(member.id) && !editedIds.has(member.id)
		);
		const edits = this.crewEdits.filter((member) => !retired.has(member.id));

		const fixtureOrder = new Map(crewFixtures.map((member, index) => [member.id, index]));
		return [...base, ...edits].sort(
			(a, b) =>
				(fixtureOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
				(fixtureOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER)
		);
	}

	saveBus(bus: Bus): void {
		this.init();
		this.edits = [...this.edits.filter((entry) => entry.id !== bus.id), serialiseBus(bus)];
		this.retiredBusIds = this.retiredBusIds.filter((id) => id !== bus.id);
		this.persist();
	}

	saveCrew(member: CrewMember): void {
		this.init();
		this.crewEdits = [
			...this.crewEdits.filter((entry) => entry.id !== member.id),
			serialiseCrew(member)
		];
		this.retiredCrewIds = this.retiredCrewIds.filter((id) => id !== member.id);
		this.persist();
	}

	retireBus(busId: string): void {
		this.init();
		this.edits = this.edits.filter((entry) => entry.id !== busId);
		if (!this.retiredBusIds.includes(busId)) {
			this.retiredBusIds = [...this.retiredBusIds, busId];
		}
		this.persist();
	}

	retireCrew(crewId: string): void {
		this.init();
		this.crewEdits = this.crewEdits.filter((entry) => entry.id !== crewId);
		if (!this.retiredCrewIds.includes(crewId)) {
			this.retiredCrewIds = [...this.retiredCrewIds, crewId];
		}
		this.persist();
	}

	/** Clears every edit; used when a controller signs out. */
	reset(): void {
		this.edits = [];
		this.crewEdits = [];
		this.retiredBusIds = [];
		this.retiredCrewIds = [];
		this.initialised = false;
		if (!browser) return;
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch {
			// Nothing to recover.
		}
	}

	private persist(): void {
		// Firestore is authoritative; this is only a reactive in-memory cache.
	}
}

export const fleet = new FleetStore();
