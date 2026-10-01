# PeakPickle verification

## Automated backend checks

`npm test` compiles the server and runs **14 integration tests** against a real temporary MongoDB replica set. All 14 passed during implementation. Tests seed their own `peakpickle_tests` database and do not read Atlas credentials or mutate the configured Atlas database.

Coverage includes every method/path endpoint, CRUD, populated relationships, filters, unique email constraints, Mongoose validation, malformed IDs/JSON, missing records, JSON 404s, overlap/adjacency/operating hours, edit exclusions, simultaneous reservation races, queue ordering and estimates, valid/invalid transitions, queue match start/completion, score and winner checks, ranking updates, exact matching scores, statistics, and concurrent starts sharing players across two courts.

## Browser verification

The application was checked in a real Chromium browser using the in-app browser's automation API.

- All **15 route patterns** were loaded with seeded data at **1440, 1280, 1024, 768 and 375px**: **75 checks**, with no API error displays, broken images, or horizontal document overflow.
- The final route-width measurements are saved in [responsive-checks.json](responsive-checks.json).
- Player create/edit, court create/edit, reservation inline validation/create/edit, and delete-confirmation cancellation were exercised successfully.
- Match create/start/tied-score validation/result recording/winner display were exercised successfully.
- Queue join/call-next/start/complete was exercised successfully; the court released and queue position returned to 1.
- Focusable accessible modal controls, stable input labels, responsive navigation, and desktop/mobile visual screenshots were inspected.
- Empty queue messaging and a missing court's retryable API error were checked; the closed mobile drawer is hidden from keyboard and screen-reader navigation.

The reproducible Playwright browser suite is in `tests/responsive.spec.ts`. Start the fresh demo API and frontend first, then run `npm run test:ui`. It includes five route-width sweeps, availability/validation and mobile drawer checks. Browser automation screenshots used for documentation are in `docs/screenshots`.

## Builds

Both client and server pass `npm run typecheck` and `npm run build`. The client uses lazy page chunks so charts and form dependencies load with the relevant pages. Vite's native config loader avoids configuration bundling and requires a recent Node version.

This workstation's restricted execution environment blocks esbuild's development dependency scan of ancestor directories. Production builds and `vite preview` work. The verified local preview is served with:

```powershell
npm run preview --workspace client -- --port 5173
```

The normal `npm run dev:client` script is provided for an ordinary local development environment. Atlas mode is implemented but has not been connected to a live Atlas cluster because no credentials were supplied.

## Manual checks for submission

1. Enter your real Atlas connection string and network access settings.
2. Seed only the dedicated PeakPickle database.
3. Start both servers and verify a created reservation remains after restarting the Atlas API.
4. Confirm full names if required for the three supplied member identifiers; fill actual contributions and the GitHub URL.
5. Ensure each member's own meaningful commits are visible.
6. Confirm the instructor's repository count due to the DOCX inconsistency.
7. Submit the repository link with appropriate instructor access; rehearse the defense guide.
