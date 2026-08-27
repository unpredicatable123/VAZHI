# VAZHI Firebase setup

The browser talks to Firebase Auth, Firestore, and callable Cloud Functions. Components keep using typed services; privileged writes never happen directly from a page.

1. Create a Firebase project with Email/Password sign-in enabled, Firestore, Functions, and Hosting. Phone Authentication and reCAPTCHA are not used by this project.
2. Copy `.env.example` to `.env` and add only the public web configuration. Never add a service-account file to this repository.
3. Copy `.firebaserc.example` to `.firebaserc` and set the project id.
4. Authenticate the Firebase CLI for deployment. The CLI is a dev dependency of
   this project rather than a global install, so it is run through `npx` — or
   through the `npm run firebase:*` scripts, which find it on their own:

   ```powershell
   npx firebase login
   ```

5. The seed script performs privileged Firestore and Authentication writes, so it requires Firebase Admin credentials. In Firebase Console, open **Project settings → Service accounts**, select **Generate new private key**, and save the downloaded JSON somewhere outside this repository. In the same PowerShell session, run:

   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\secure\your-firebase-admin-key.json'
   npm run firebase:seed
   Remove-Item Env:GOOGLE_APPLICATION_CREDENTIALS
   ```

   Keep this JSON private, never commit it, and delete or disable the key after the one-time seed if it is no longer needed. The script reads the project from `.firebaserc`; override it with `npm run firebase:seed -- --project=your-project-id`.

6. Deploy with `npm run firebase:deploy`.

7. Verify public trip search and all four role-based read paths against the deployed project:

   ```powershell
   npm run firebase:smoke
   ```

   This uses the seeded demo accounts, performs no booking or operational mutations, and prints no Firebase tokens or configuration values.

8. Travellers create their own Email/Password account at `/register/traveller`. The registration callable assigns only the `traveller` role to the authenticated account; it cannot grant crew or Operations access.

   Operations staff create driver and conductor sign-in accounts from the Crew roster by selecting **Create sign-in account** while adding a new crew member. Operations chooses the initial password; the duty ID, generated badge ID, and initial password are shown once for a secure handoff. The password is never stored in Firestore. Signed-in drivers and conductors can later change it from the **Password** screen after confirming their current password.

   To verify both account-creation paths against a deployed project, set the same Admin credential used for seeding and run:

   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\secure\your-firebase-admin-key.json'
   npm run firebase:smoke:accounts
   Remove-Item Env:GOOGLE_APPLICATION_CREDENTIALS
   ```

   This creates temporary traveller and driver accounts, verifies their claims and sign-in paths, and removes the exact temporary Auth users and crew document in a `finally` cleanup.

The seed creates the fixture districts, stops, routes, vehicles, crew, and trips. In addition to Salem → Chennai, the current-day demonstration timetable includes three bookable services on each of Coimbatore → Chennai, Madurai → Chennai, Bangalore Majestic → Chennai, Tiruchirappalli → Chennai, and Salem → Bangalore. Run the seed again after pulling fixture changes; deploying Hosting or Functions alone does not write these documents to Firestore.

It also creates demonstration Auth users and custom claims. The standard sign-in-page fill buttons continue to use the canonical Salem → Chennai accounts. To verify a newly seeded crew assignment, use the Coimbatore → Chennai morning service accounts:

| Role | Duty ID | Badge ID | Password |
| --- | --- | --- | --- |
| Driver | `DRV-061` | `TN-DVR-6102` | `demo123` |
| Conductor | `CON-061` | `TN-DVR-6101` | `demo123` |

These credentials are demonstration data only. Replace or disable every demo user before production.

Seat holds expire after five minutes. Expired holds are ignored transactionally and removed by a scheduled cleanup. Firestore persistent multi-tab cache is enabled for read continuity. Conductor manifest writes may queue offline, but rules re-check assignment when synchronization resumes; a rejected/conflicting write is not authoritative and the UI must reload the server state.

Passenger persistence is deliberately limited to the booking document: `bookingId`, `seatId`, `name`, and optional `concessionType`. Only the traveller who made the booking can read it. The boarding manifest is a separate projection carrying `bookingId`, `pnr`, `seatId`, ticket status and boarding status — no passenger name, because a conductor verifies a PNR against a seat and nothing on the boarding screens displays one. Age, gender, accessibility diagnosis, contact information, IDs, photos, and permanent passenger profiles are not written anywhere.

## API rate limits

Every callable Function has a distributed fixed-window limit enforced before its business query or mutation. Signed-in endpoints are keyed by Firebase UID. Public trip search is keyed by a SHA-256 hash of the caller address; the raw address is never stored. Counter documents live in `_rateLimits`, are reused each minute rather than accumulated, and are inaccessible to browser clients under `firestore.rules`.

| Operation class | Limit per caller |
| --- | --- |
| Public trip search | 30/minute |
| Authenticated reads | 60/minute |
| Mutations and seat holds | 10/minute |
| Payment-order creation | 3/minute |
| Payment verification | 10/minute |
| Ticket scan and boarding updates | 30/minute |
| Registration and duty verification | 5/minute |

An exceeded limit returns Firebase `resource-exhausted` with `retryAfterSeconds` details. Razorpay HTTP 429 responses are mapped to the same safe response; order creation is not automatically replayed because retrying a payment POST can create a duplicate order. Callable Functions are additionally capped at 10 instances with concurrency 20 to limit burst cost. Change policy values only in `functions/src/rate-limit.js`, run `npm run test:rate-limit`, and redeploy Functions for changes to take effect.

These limits protect callable Functions. They do not change Firebase Auth's provider quotas or the MapTiler plan quota. Restrict the MapTiler browser key to the deployed site origins in the MapTiler dashboard and monitor its Analytics page.

## Seats and bookings are two records

A seat is occupied because a document exists at `trips/{tripId}/seats/{seatId}`, not because a booking mentions it. `cancelBooking` deletes both in one transaction, so the app can never leave them disagreeing.

**Deleting a booking in the Firestore console does not free its seat.** It removes one half of the pair; the seat document stays and the seat map keeps showing it taken, with `seatsAvailable` on the trip left too low. Seats deleted that way are not recoverable from the booking, which is why there is a reconciler:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\secure\your-key.json'
npm run firebase:reconcile              # reports, changes nothing
npm run firebase:reconcile -- --apply   # commits
Remove-Item Env:GOOGLE_APPLICATION_CREDENTIALS
```

It frees seats whose booking is gone or cancelled, clears expired holds, and recomputes `seatsAvailable` from the seat documents actually left. Bookings are read once rather than per seat, so a full coach costs one query, not forty.

To cancel properly, use **Cancel booking** in My Trips — that goes through the function and keeps the two in step.

## Payments (Razorpay)

Payments run through Razorpay Standard Checkout in **test mode**. Real API calls are made and a real order is created; no money moves and only Razorpay test instruments are accepted.

Two credentials, both in Firebase Secret Manager, neither in this repository:

```powershell
npx firebase functions:secrets:set RAZORPAY_KEY_ID
npx firebase functions:secrets:set RAZORPAY_KEY_SECRET
```

They are bound only to `createPaymentOrder` and `verifyPayment`. The frontend has its own copy of the **publishable** key id as `VITE_RAZORPAY_KEY_ID` in `.env` (gitignored). `RAZORPAY_KEY_SECRET` has no path into the browser bundle — the build is checked for it.

The flow is: `holdSeats` → `createPaymentOrder` → Razorpay modal → `verifyPayment`.

**The amount is never supplied by the client.** `createPaymentOrder` reads the fare from the trip document and multiplies by the seats this caller actually holds, then refuses anything under 100 paise. The client sends no figure and could not change one if it did.

**A booking exists only after a verified signature.** `verifyPayment` recomputes `HMAC-SHA256(order_id|payment_id)` with the key secret and compares it in constant time; only on a match does it turn the hold into a booking and write `paymentStatus: 'paid'`, `razorpayOrderId`, and `razorpayPaymentId`. The old `confirmBooking` callable was **deleted** — while it existed, a client could have called it directly and been issued a ticket without paying.

Verification logic is covered by `npm run test:payment`, which needs no network or Razorpay account.

To switch to live keys, set the two secrets to the `rzp_live_…` pair, update `VITE_RAZORPAY_KEY_ID`, redeploy, and correct the payment page's test-mode notice.

## Ticket email

A booking triggers `sendTicketEmail`, which composes the ticket and writes it to the `mail` collection. Delivery is handled by the official **Trigger Email from Firestore** extension, so retries, queuing, and SMTP credentials live in the extension rather than in this codebase — there is no mail secret in the repository and the Function makes no outbound call.

Install it once per project:

```powershell
npm run firebase:ext
```

That wraps `npx firebase ext:install firebase/firestore-send-email`, which reads the
project from `.firebaserc`. The install is interactive, so run it in a terminal
you can answer prompts in.

Answer the prompts as follows:

| Prompt | Value |
| --- | --- |
| Email documents collection | `mail` |
| SMTP connection URI | your provider's URI, for example `smtps://user@example.com@smtp.example.com:465` |
| SMTP password | set as a secret when prompted |
| Default FROM address | `VAZHI tickets <tickets@your-domain>` |
| Users collection / Templates collection | leave blank |

The collection name **must** be `mail`; that is what the trigger writes to and what `firestore.rules` locks. Each queued document holds a traveller's email address, so no client may read or write that collection — only the Admin SDK and the extension, both of which bypass rules.

The address is read from the traveller's own Firebase Auth record at send time and is never written to Firestore. A traveller with no email address on their account simply gets no email; the booking is unaffected.

The queued document id is `ticket-{PNR}` and the trigger **creates** it rather than setting it. Firestore triggers are at-least-once, so the function can run twice for one booking; the extension decides what to do by reading the `delivery` field it writes back, and overwriting the document would erase that and send the ticket again. Creating means a repeat run collides and stops.

There is no trigger loop. The extension writes `delivery` back to the same document it watches, but `SUCCESS` and `ERROR` are terminal states it returns on immediately, and a 60-second lease on `PROCESSING` stops concurrent runs. One email costs roughly three writes to its own `mail` document and nothing in any other collection.

Set **Firestore TTL type** to `DAY` and **Firestore TTL value** to something like `7` during install, so processed messages do not accumulate. The extension stamps `delivery.expireAt`; Firestore only acts on it once you add a TTL policy on that field for the `mail` collection, in Firestore → TTL.

To check the composition without sending anything:

```powershell
npm run test:ledger
$env:PREVIEW_OUT = 'preview.html'; npm run test:ledger; Remove-Item Env:PREVIEW_OUT
```

## Transaction history

`/account/transactions` is projected in the browser from the traveller's own booking documents. There is no transactions collection, no new writes, and no new index: a booking yields a payment line, and cancelling it yields a refund line against the same reference. Refund amounts come from the same estimator the refund screen uses, so the two can never quote different numbers.

Signing out clears the Firestore on-disk cache as well as the in-memory stores, then reloads the page. Without that, every document a shift read would remain in IndexedDB for whoever signs in next on a shared depot device.
