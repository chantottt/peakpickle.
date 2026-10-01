# PeakPickle

**A desktop-first responsive pickleball court reservation, player matching, and queueing system.**

Your Court. Your Match. Your Turn.

PeakPickle connects court schedules, players, live queues, and match results in one club workspace. React sends requests through one Axios instance to an Express REST API; Mongoose validates and permanently stores records in MongoDB Atlas. Business services compute available slots, FCFS queue positions and waits, player compatibility, rankings, and club statistics.

## Group and submission

Course: **CTADWEBL — Advanced Web Programming**, A.Y. 2026–2027.

| Member      | Actual contribution                 | GitHub account |
| ----------- | ----------------------------------- | -------------- |
| chantottt   | [Fill with work actually completed] | [Username]     |
| smurfdei28  | [Fill with work actually completed] | [Username]     |
| surla-nicko | [Fill with work actually completed] | [Username]     |

GitHub repository: **[Add your actual repository URL]**.

The attached rubric requires strictly **2 or 3 members** and meaningful commits by each member using their own account. The three member identifiers above were supplied by the user. Add legal/full names if your class requires them, and fill only actual contributions. No accounts or commit history have been invented.

The DOCX's repository section requests separate client/server repositories, while its final submission section requests one repository containing both folders. This deliverable follows the final submission structure. Confirm the repository count with your instructor before submitting. Both folders also have independent package manifests and scripts if two repositories are required. The document states submission on or before October 5 and defense October 5–6; confirm the year and schedule with your class.

## Features

- Polished landing page, supplied paddle/ball logo, forest sidebar, lime accents, and responsive desktop dashboard.
- Court CRUD, status/type/location search, details, operating hours, schedule, queue, and estimated next availability.
- Reservation CRUD with live availability lookup, overlap prevention, operating-hour checks, and guarded transitions.
- FCFS live queue with dynamic positions, average duration, estimated waits, call-next, start, skip, leave, and complete through score recording.
- Player CRUD, active status, skill/play/time preferences, profiles, and match history.
- Matching scored exactly as requested: same skill 60, compatible availability 30, same preferred play 10.
- Singles/doubles scheduling, start/cancel transitions, scorecards, validated results, automatically derived winners, and ranking updates.
- Rankings and three analytics charts computed from MongoDB records.
- Shared loading skeletons, retryable errors, empty states, success/error toasts, accessible modals, and delete confirmations.
- TypeScript on both sides, React Hook Form + external Zod schemas + z.infer, a single Axios client, custom hooks, and reusable components.
- Real integration tests against MongoDB, including concurrent booking and concurrent player participation checks.

## Screenshots

Desktop dashboard at 1440px:

![PeakPickle desktop dashboard](docs/screenshots/dashboard-desktop.jpg)

Landing page:

![PeakPickle landing page](docs/screenshots/landing-desktop.jpg)

Live queue:

![PeakPickle live queue](docs/screenshots/queue-desktop.jpg)

Responsive reservations at 375px:

![PeakPickle mobile-browser reservations](docs/screenshots/reservations-mobile.jpg)

The primary visual reference is retained in `docs/wireframe.png`. See `docs/ASSETS.md` for image sources and placeholder disclosure.

## Folder structure

```text
peakpickle/
├── client/
│   ├── public/
│   │   ├── peakpickle-logo.png
│   │   └── pickleball-courts.jpg
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           # Controls, forms, tables, charts, dialogs, toasts
│   │   │   ├── layout/       # Desktop sidebar, header, responsive drawer, brand
│   │   │   ├── courts/
│   │   │   ├── queue/
│   │   │   ├── players/
│   │   │   └── matches/
│   │   ├── pages/            # All requested routes
│   │   ├── hooks/            # useApi, useCourtAvailability, useLiveQueue, useMutation
│   │   ├── schemas/          # External Zod form schemas and inferred types
│   │   ├── services/api.ts   # Single Axios instance
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── styles.css        # Tailwind import/theme/utilities and responsive styling
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/           # Six timestamped Mongoose collections
│   │   ├── routes/
│   │   ├── services/         # Processing algorithms and transactional coordination
│   │   ├── utils/
│   │   ├── seed/             # Atlas seeding and temporary local demo
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/api.test.mjs
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   ├── API.md
│   ├── REQUIREMENTS.md
│   ├── DEFENSE.md
│   ├── TESTING.md
│   ├── ASSETS.md
│   ├── responsive-checks.json
│   ├── wireframe.png
│   └── screenshots/
├── tests/responsive.spec.ts
├── playwright.config.ts
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

## Install

Use **Node.js 24**, or Node.js 22.18+ (native TypeScript config loading). Install Git and create a MongoDB Atlas database user and IP access-list entry for your machine. Use a dedicated database such as `peakpickle`. Atlas supports the transactions used by the booking/queue/result services; a standalone local MongoDB server does not. A local replica set is supported.

Run from the `peakpickle` folder:

```powershell
npm install
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

On macOS/Linux use `cp` instead of `Copy-Item`. Edit `server/.env` with your own Atlas connection string. Do not publish the real environment files.

### Required environment values

`server/.env`:

```dotenv
PORT=5000
MONGO_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/peakpickle?retryWrites=true&w=majority
CLIENT_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
BUSINESS_TIMEZONE=Asia/Manila
```

`client/.env`:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

Encode reserved characters in the Atlas password. Use your actual cluster hostname. `MONGO_URI` is deliberately empty in the committed example. The client environment was configured locally for preview but is ignored by Git.

### Seed MongoDB Atlas

After choosing the dedicated database, run:

```powershell
npm run seed -- --confirm
```

This replaces records in PeakPickle's six collections, not the whole database. The explicit flag prevents accidental seeding. Seed dates are relative to today's Manila date so the demonstration stays current.

Seed counts: **20 players, 6 courts, 35 reservations, 14 queue entries, 47 matches, 42 results**. All relationships use valid ObjectIds. Five courts are open; the sixth is under maintenance. There are active waiting players, one ongoing match, scheduled matches, completed games, and recorded scores.

### Run the backend

Terminal 1:

```powershell
npm run dev:server
```

The API runs on port 5000. It exits with a clear setup message if `MONGO_URI` is missing; it does not silently substitute demo data for Atlas.

### Run the frontend

Terminal 2:

```powershell
npm run dev:client
```

Open `http://127.0.0.1:5173` (or `http://localhost:5173`).

### Temporary demo without Atlas credentials

```powershell
npm run demo
```

Run the frontend in another terminal. This starts a **real temporary MongoDB replica set**, seeds it, and serves the same Express API on port 5000. It is only a convenience for local demonstrations/testing: **data resets when stopped** and this mode does not satisfy the permanent Atlas storage requirement by itself. Stop the Atlas API before starting the demo on the same port. The first run downloads an official MongoDB test binary and needs internet access; later runs reuse it.

### Build and verify

```powershell
npm run typecheck
npm run build
npm test
```

Production API after build: `npm run start --workspace server`.

Production client preview: `npm run preview --workspace client` (port 4173 by default; add that origin to `CLIENT_ORIGIN` when using the Atlas API).

For UI tests, start the seeded temporary demo API and frontend first:

```powershell
npx playwright install chromium
npm run test:ui
```

To use an installed Edge browser on Windows, set `PEAKPICKLE_BROWSER_PATH` to its executable before `npm run test:ui`. The browser suite expects the seeded demo IDs and unmodified 17:00 reservations. See `docs/TESTING.md` for verified results and the demo flow.

## Routes

```text
/
/dashboard
/courts
/courts/:id
/reservations
/reservations/new
/reservations/:id/edit
/queue
/players
/players/:id
/matchmaking
/matches
/matches/:id
/rankings
/statistics
```

## Processing and relationships

`Player` and `Court` are referenced by `Reservation`, `QueueEntry`, and `Match`. `MatchResult` references its match and winning players. Every schema enables timestamps. Optional player availability extends the required player fields so compatibility can be computed from actual records. Match queue-entry references let result processing complete the correct queue entries.

1. **Availability:** a pending/confirmed reservation overlaps when `newStart < existingEnd && newEnd > existingStart`. Adjacent times are legal. Check active player, existing court, maintenance, time order, and operating hours. Editing excludes its own reservation ID. Court transactions prevent concurrent requests from both claiming a slot.
2. **FCFS queue:** sort joinedAt ascending, then ObjectId for ties. Position and players-ahead are computed each time. Estimated wait = players ahead × average completed match duration, with a 15-minute starting fallback. Active playing entries remain ahead until their game finishes. Queue games initially use singles pairs; regular match creation supports singles and doubles.
3. **Matching:** same skill +60, compatible available time +30, same preferred play +10, maximum 100. Sort highest first. `both` is a distinct preference for scoring; an `any` time filter is compatible with all available slots.
4. **Rankings:** include completed matches with results. Count participation, wins and losses; win rate = wins / completed matches × 100, or zero when there are no matches. Sort wins descending, then win rate descending.
5. **Statistics:** derive counts, positive elapsed match durations, court usage counts, last-seven-day completions, and start-hour distributions. Dashboard adds today's activity and upcoming bookings. Time boundaries use Manila.
6. **Transitions/results:** reject invalid transitions with 400. Recording an ongoing match's result derives winners and atomically completes the match/queue and releases the court. Court and referenced-player document writes prevent races between conflicting operations across requests.

See `docs/API.md` for full request/response examples, status rules, and algorithm details. See `docs/DEFENSE.md` for a short code walkthrough and demo script.

## Responsive design

One React application uses CSS media queries and Tailwind theme tokens. Desktop at 1440/1280 keeps the full sidebar, wide tables, four statistics cards, four player cards, three court cards, and two chart columns. At 1024 the sidebar remains usable, courts reduce to two columns, and players to three. At 768 the sidebar becomes a drawer while grid/table content remains readable. At 375 navigation uses a hamburger, forms and content cards stack, and tables become labeled record rows. There is no separate mobile application or bottom app-tab shell.

## Known limitations and submission tasks

- Atlas configuration and a live Atlas connectivity check remain dependent on your private credentials; integration testing uses a real local replica set.
- The supplied group identifiers are recorded. Full names if required, actual contributions, repository URL, member-owned commits, GitHub publication/access, and Teams submission require your real class/account information.
- Authentication, payments, file uploads, automatic notifications, and public deployment are outside the requested core. This is a shared management workspace.
- Queue updates poll every 15 seconds. Wait/finish estimates are predictions, not guarantees; the formula treats each preceding player as one average match duration as requested.
- Reservations are completed/cancelled explicitly, not by a background job. Historic records may remain pending/confirmed until a manager updates them.
- Courts/players with historical references cannot be deleted; use maintenance/deactivation to preserve relationships. Reservations and non-ongoing matches support actual deletion with confirmation.
- Result scores require distinct nonnegative integers up to 99. The project does not enforce an official tournament scoring format because none was specified.
- The current dataset is sized for an academic demo. Large clubs would benefit from pagination, aggregation pipelines, role-based access, and scheduled notifications.

## Git and GitHub

The folder is initialized as a Git repository on `main`. The ignore file excludes dependencies, real environments, compiled output, test artifacts, and MongoDB binaries. No author identity or member commits were fabricated.

Each member should set their own Git identity, contribute explainable changes, and commit their own work. After creating the real GitHub repository:

```powershell
git add .
git commit -m "Implement PeakPickle court reservation and queue system"
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Use a public repository or grant the instructor access as required. Complete the member table and screenshots before final submission. The implementation checklist is in `docs/REQUIREMENTS.md`.

## API endpoint table

The following table is generated from the API reference and covers all 35 endpoints.

| Method | Path                                       | Purpose                                                                         | Sample request                                                    | Sample response                                                                                                                                  |
| ------ | ------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | /health                                    | API health                                                                      | None                                                              | `{ "status": "ok", "application": "PeakPickle" }`                                                                                                |
| GET    | /players                                   | Players with computed stats; filter search, skillLevel, preferredPlay           | `?search=Miguel&skillLevel=intermediate`                          | `[ { "_id": "...", "name": "Miguel Santos", "wins": 3, "losses": 1, "matchesPlayed": 4, "winRate": 75, "rank": 1 } ]`                            |
| GET    | /players/matches                           | Compute 60/30/10 matching score                                                 | `?skillLevel=intermediate&playType=doubles&availableTime=evening` | `[ { "name": "Miguel Santos", "matchPercentage": 100, "matchingReason": "Same skill level · Compatible availability · Same play preference" } ]` |
| GET    | /players/rankings                          | Rankings derived from completed matches and results                             | None                                                              | `[ { "rank": 1, "name": "...", "wins": 4, "losses": 1, "matchesPlayed": 5, "winRate": 80 } ]`                                                    |
| GET    | /players/:id                               | Player, statistics, recent matches                                              | Valid ObjectId                                                    | `{ "_id": "...", "name": "...", "recentMatches": [] }`                                                                                           |
| POST   | /players                                   | Create player                                                                   | Player example below                                              | Player document                                                                                                                                  |
| PATCH  | /players/:id                               | Edit or deactivate player                                                       | `{ "name": "Miguel Santos", "isActive": false }`                  | Updated player                                                                                                                                   |
| DELETE | /players/:id                               | Delete unreferenced player                                                      | None                                                              | `{ "message": "Player deleted successfully." }`                                                                                                  |
| GET    | /courts                                    | Court list with schedule and queue count; search/status/type filters            | `?type=outdoor&status=available`                                  | `[ { "_id": "...", "name": "Riverside Court", "queueCount": 6, "nextSchedule": {}, "schedule": [] } ]`                                           |
| GET    | /courts/availability                       | Compute unreserved courts in operating hours                                    | `?date=2026-10-02&startTime=09:00&endTime=10:00`                  | Array of available court documents                                                                                                               |
| GET    | /courts/:id                                | Court and today's schedule                                                      | Valid ObjectId                                                    | Court document with schedule                                                                                                                     |
| POST   | /courts                                    | Create court                                                                    | Court example below                                               | Court document                                                                                                                                   |
| PATCH  | /courts/:id                                | Edit court; protect active matches and bookings                                 | `{ "name": "Riverside Central" }`                                 | Updated court                                                                                                                                    |
| DELETE | /courts/:id                                | Delete unreferenced court                                                       | None                                                              | `{ "message": "Court deleted successfully." }`                                                                                                   |
| GET    | /reservations                              | Populated list; search/status/courtId/playerId/date filters                     | `?status=confirmed&date=2026-10-02`                               | Array of reservations with player and court objects                                                                                              |
| GET    | /reservations/:id                          | Populated reservation                                                           | Valid ObjectId                                                    | Reservation document                                                                                                                             |
| POST   | /reservations                              | Create with availability checks                                                 | Reservation example below                                         | Populated reservation                                                                                                                            |
| PATCH  | /reservations/:id                          | Edit booking or apply valid status transition                                   | `{ "startTime": "10:00", "endTime": "11:00" }`                    | Updated reservation                                                                                                                              |
| DELETE | /reservations/:id                          | Delete reservation                                                              | None                                                              | `{ "message": "Reservation deleted successfully." }`                                                                                             |
| GET    | /queue-entries                             | Queue history; courtId/status filters                                           | `?courtId=...&status=waiting`                                     | Array of populated queue entries                                                                                                                 |
| GET    | /queue-entries/summary                     | FCFS positions, estimated waits, current match, average duration                | `?courtId=...` (optional)                                         | `[ { "court": {}, "entries": [], "waitingCount": 6, "averageMatchDuration": 15, "currentMatch": null } ]`                                        |
| POST   | /queue-entries                             | Join an active queue once                                                       | `{ "playerId": "...", "courtId": "..." }`                         | Queue entry, initially waiting                                                                                                                   |
| PATCH  | /queue-entries/:id                         | Valid transition; call only oldest waiter                                       | `{ "status": "cancelled" }`                                       | Updated entry; playing starts the called pair's match                                                                                            |
| DELETE | /queue-entries/:id                         | Delete waiting/terminal entry; protect called/playing                           | None                                                              | `{ "message": "Queue entry deleted successfully." }`                                                                                             |
| POST   | /queue-entries/courts/:courtId/call-next   | Call oldest two waiting players                                                 | No body                                                           | Two entries with status called                                                                                                                   |
| POST   | /queue-entries/courts/:courtId/start-match | Start called pair and occupy court atomically                                   | No body                                                           | Populated ongoing match                                                                                                                          |
| GET    | /matches                                   | Match list with results; search/status/playType/courtId filters                 | `?status=completed&playType=singles`                              | Array of populated matches with result                                                                                                           |
| GET    | /matches/:id                               | Match scorecard with result                                                     | Valid ObjectId                                                    | Match document with players, court, result                                                                                                       |
| POST   | /matches                                   | Schedule singles or doubles                                                     | Match example below                                               | Scheduled match                                                                                                                                  |
| PATCH  | /matches/:id                               | Edit scheduled match or start/cancel                                            | `{ "status": "ongoing" }`                                         | Updated match                                                                                                                                    |
| DELETE | /matches/:id                               | Delete non-ongoing match and its result                                         | None                                                              | `{ "message": "Match deleted successfully." }`                                                                                                   |
| POST   | /match-results                             | Validate scores, derive winners, finish match, release court and complete queue | `{ "matchId": "...", "teamOneScore": 11, "teamTwoScore": 8 }`     | Result with computed winnerPlayerIds                                                                                                             |
| GET    | /match-results/:id                         | Result with winner profiles                                                     | Valid ObjectId                                                    | Populated result                                                                                                                                 |
| GET    | /statistics/dashboard                      | Counts, usage, live courts, recent matches, upcoming bookings                   | None                                                              | Dashboard object                                                                                                                                 |
| GET    | /statistics                                | Completed totals, average duration, court usage, daily and hourly distributions | None                                                              | Analytics object                                                                                                                                 |
