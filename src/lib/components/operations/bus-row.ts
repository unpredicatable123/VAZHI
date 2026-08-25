import type { Bus, TripView } from '$types/fleet';

/**
 * One row of the fleet list.
 *
 * `currentTrip` is a *lookup result*, not a property of the vehicle: it is the
 * running this bus happens to be working now or next, resolved through the trip
 * records. Tomorrow the same vehicle may carry a different corridor, which is
 * why nothing about a route is ever written onto `Bus`.
 */
export interface BusRow {
	bus: Bus;
	currentTrip?: TripView;
}
