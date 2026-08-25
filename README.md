# VAZHI

Tamil Nadu public transit booking, in English and Tamil.

A SvelteKit application on Firebase with four roles — **traveller**, **conductor**, **driver**, **operations** — covering search, seat selection, payment, boarding verification, and fleet management.

---

## The rule the model rests on

**A bus is not a route.**

```
Bus ──┐
Route ┼──▶ Trip ──▶ Bookings
Crew ─┘
```

A vehicle is a vehicle; a route is a corridor; a **trip** is one dated, timed running of a route by a specific vehicle with a specific crew. Nothing may put a permanent origin or destination on a `Bus`, because the same registration plate runs Salem → Chennai on one date and Salem → Bangalore on another.

A booking references a trip. That is the join a conductor uses to find the passengers for the running they are working.

## Privacy stance

Constraints enforced by the type system and by Firestore rules, not by convention:

- A **conductor** sees a PNR, a seat, and whether it boarded. `ManifestEntry` has no field for a name, age, contact detail, or identity document.
- A **driver** never reads a manifest. There is no driver clause in the rule.
- A **crew record** is a duty ID, a roster name, a depot, and a duty status. Nothing else.
- **Passenger names** live on the booking, readable only by the traveller who made it.
- **Live tracking is simulated** — interpolated from the timetable and the clock. No GPS, no telemetry feed, no transit API.

## Getting started

```bash
npm install
cp .env.example .env      # add your Firebase and MapTiler keys
npm run dev
```

Firebase setup — project creation, secrets, seeding, the ticket-email extension — is in **[FIREBASE.md](FIREBASE.md)**.

## Scripts

| | |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (static, SPA fallback) |
| `npm run check` | Typecheck, Svelte and TypeScript |
| `npm test` | All suites that need no emulator |
| `npm run test:rules` | Firestore security rules, against the emulator |
| `npm run firebase:deploy` | Build, then deploy hosting, rules and functions |
| `npm run firebase:seed` | Seed demo data (needs Admin credentials) |
| `npm run firebase:reconcile` | Free seats whose booking no longer exists |

## Layout

```
src/lib/components   UI, grouped by the surface it belongs to
src/lib/services     Data access — one module per concern, all replaceable
src/lib/stores       Svelte 5 runes state
src/lib/types        The domain model
src/lib/mocks        Fixtures the seed script writes to Firestore
functions/src        Cloud Functions — the only writer of bookings
messages/            Paraglide message catalogues, English and Tamil
tests/               Suites; only the rules tests need the emulator
```

Services are the seam. Every one returns `ServiceResult<T>`, so a page never learns whether an answer came from Firestore, a callable function, or a local computation.

## Payments

Razorpay Standard Checkout, in **test mode**. Real orders are created; no money moves.

The amount is computed server-side from the trip document — the browser sends no figure. A booking exists only after `verifyPayment` recomputes the HMAC signature with the key secret and it matches. `RAZORPAY_KEY_SECRET` lives in Firebase Secret Manager and has no path into the client bundle.

## Localisation

Every user-facing string goes through Paraglide. English and Tamil are kept at parity — a key missing from either is a build-time gap, and place names carry both spellings as data rather than as interface copy.
