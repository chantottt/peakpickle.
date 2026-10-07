# PeakPickle

PeakPickle is a responsive pickleball court reservation, player matching, and queue management application. It runs on localhost, with persistent data stored in MongoDB Atlas.

## Separate admin and member screens

After login, the application redirects users according to their account role:

| Role | Dashboard | Access |
| --- | --- | --- |
| Admin | `/admin/dashboard` | Manage courts, players, reservations, queues, matches, results, and club statistics |
| Member | `/member/dashboard` | View personal activity, book courts, join queues, view own matches, and update permitted profile fields |

Public signup creates member accounts only. Admin accounts are created through the local provisioning script. The backend checks roles and record ownership, so members cannot manage another member's private records.

## Features

- Signup, login, logout, and session restoration after refresh.
- Hashed passwords, expiring JWTs in HttpOnly cookies, CSRF protection, and login rate limiting.
- Court availability and overlapping reservation prevention.
- Member bookings start as pending; admins confirm or complete them.
- First-come-first-served queues with singles/doubles groups, positions, and wait estimates.
- Player matching: skill 60%, availability 30%, and play preference 10%.
- Match results, rankings, and club statistics computed from database records.
- Responsive pages, form validation, loading/error states, and action feedback.
- Login/signup forms show field errors, and a guest who opens a protected page returns there after signing in.
- Reservation and match lists page through filtered results; the public summary uses database counts.

Original sample data and recoverable extra demo records have been imported into Atlas. Existing Atlas records were preserved. Temporary demo data does not automatically transfer to Atlas.

## Technologies

React, Vite, TypeScript, Tailwind CSS, React Router, React Hook Form, Zod, Axios, Node.js, Express, and MongoDB Atlas/Mongoose.

## Group members

The contribution descriptions below are based on local commit history. Each member should verify their row and GitHub account before submission.

| Member | Contribution | GitHub account |
| --- | --- | --- |
| chantottt | Initial PeakPickle project, README, and application screenshots | chantottt |
| Ejay Balsamo | Log in/Sign up, MongoDB set up, Client/Server | smurfdei28 |
| surla-nicko | My Activity, queue wait indicators and doubles queues; cancellation, match-start, and court availability fixes | surla-nicko |

## Local setup

Use Node.js 24 and run commands from the project root.

```powershell
npm.cmd ci
```

If private environment files do not exist, copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`. Preserve existing configuration.

Configure these values privately:

```dotenv
# server/.env
MONGO_URI=mongodb+srv://DATABASE_USER:ENCODED_PASSWORD@CLUSTER_HOST/peakpickle?retryWrites=true&w=majority
JWT_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
PORT=5000
CLIENT_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
BUSINESS_TIMEZONE=Asia/Manila
```

Use your actual Atlas connection string and intended database name. The current local connection uses the Atlas database `test`, which contains the imported samples. Changing the database name selects a different database; it does not move those records.

```dotenv
# client/.env
VITE_API_URL=
```

A blank API URL uses the browser's hostname and backend port 5000 automatically. Set `VITE_API_PORT` to use a different local backend port while keeping the browser's hostname, including for cookie-based login. Keep the same hostname when opening the app. Do not put secrets in frontend variables.

In Atlas, create a database user, allow your public IP address, and use the cluster's Node.js connection string. Replace placeholders and percent-encode reserved characters in the password.

Start the backend:

```powershell
npm.cmd run dev:server
```

Wait for `MongoDB connected`, then start the frontend in a second terminal:

```powershell
npm.cmd run dev:client
```

Open http://localhost:5173. New records save to the configured Atlas database and remain after restarting the backend. Deployment is not required.

### First admin

For a fresh database without an admin, temporarily set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in private `server/.env`, with `LINK_PLAYER_ID` blank. Use a password of 12–128 characters.

```powershell
npm.cmd run create-admin --workspace server
```

Remove the provisioning variables afterward. This script does not overwrite existing accounts.

### Temporary demo and seed safety

`npm.cmd run demo` starts a separate temporary database with sample accounts. Its data resets when stopped; it never uses Atlas. Do not run it alongside the Atlas backend on port 5000. If port 5000 is occupied, set `DEMO_PORT` before starting the demo; set `CLIENT_ORIGIN` to the frontend's local URL(s) and `VITE_API_PORT` to the demo port for the frontend. The browser test runner also accepts `PEAKPICKLE_TEST_API_URL` and `PEAKPICKLE_TEST_FRONTEND_URL` for alternate demo ports.

The standalone seed script deletes sports records. Do not run it against the current Atlas database to add samples. Recovery files and private backups are excluded from Git and must remain local.

See [LOCAL_AUTH_SETUP.md](LOCAL_AUTH_SETUP.md) for demo credentials, account linking, permissions, and detailed setup.

## Pages and structure

Public pages: `/`, `/login`, and `/signup`.

Signed-in pages include `/dashboard` (role redirect), `/admin/dashboard`, `/member/dashboard`, `/activity`, `/courts`, `/reservations`, `/queue`, `/players/:id`, `/matchmaking`, `/matches`, and `/rankings`, plus detail/edit pages. Player management at `/players` and club statistics at `/statistics` are admin-only. The public header offers Log in; the Players management link appears only for admins.

- `client/src/`: pages, components, forms, hooks, authentication, and API integration.
- `server/src/`: routes, models, controllers, middleware, services, and seed/provisioning scripts.
- `server/tests/` and `tests/`: backend integration and browser tests.
- `screenshots/`: application screenshots.

## Screenshots

These screenshots show the application at desktop and mobile sizes.

![Club dashboard](screenshots/dashboard-desktop.jpg)
![Landing page](screenshots/landing-desktop.jpg)
![Login page](screenshots/auth-login-desktop.jpg)
![Mobile signup](screenshots/auth-signup-mobile.jpg)
![Live queue](screenshots/queue-desktop.jpg)
![Mobile reservations](screenshots/reservations-mobile.jpg)

The logo was supplied for the project. Court photography is credited to Brian Zajac on [Unsplash](https://unsplash.com/photos/outdoor-pickleball-courts-surrounded-by-trees-and-grass-cNuo2I6bznQ).

## Checks

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
```

For browser tests, start a fresh temporary demo and the frontend, then run `npm.cmd run test:ui`. Use the temporary demo for automated browser tests rather than the presentation database.

The current backend suite has 35 tests, including pagination and public summary checks. Browser tests cover login/signup, role access, booking, and layouts down to 375px. The Atlas import previously validated all 184 records and initialized indexes successfully. See [LOCAL_REVIEW.md](LOCAL_REVIEW.md) for the earlier implementation review.

## Known limitations

- Localhost only; no deployment configuration.
- No password reset, refresh tokens, payments, uploads, or automatic notifications.
- Queue updates poll every 15 seconds; wait estimates are approximate.
- Admins update reservation statuses explicitly.
- Referenced courts/players are preserved through maintenance/deactivation.
- Recovered extra records may include automated test data.
- Each member must understand their contribution and use their own account for meaningful commits.

## Repository hygiene

Do not commit `.env`, credentials, dependencies, build output, test reports, logs, MongoDB binaries, or `local-mongo-recovery/`. Commit only placeholder `.env.example` files.

## API documentation

All paths below use the `/api` prefix. Protected endpoints require an authenticated cookie. Mutations require the CSRF token fetched by the configured Axios client. Roles and ownership restrict sports operations.

`GET /reservations` and `GET /matches` accept optional `page` (starting at 1) and `pageSize` (1–50) query parameters. With paging, the response remains an array and the `X-Has-Next` response header is `true` or `false`; without paging, the full filtered array is returned for existing clients. Search is applied before paging.

| Method | Path | Purpose | Sample request | Sample response |
| --- | --- | --- | --- | --- |
| GET | /auth/csrf | Obtain mutation token | None | `{ "csrfToken": "..." }` |
| POST | /auth/signup | Register member and linked player | `{ "name": "Example Member", "email": "member@example.com", "password": "PRIVATE_PASSWORD" }` | `{ "message": "Member account created" }` |
| POST | /auth/login | Start cookie session | `{ "email": "member@example.com", "password": "PRIVATE_PASSWORD" }` | `{ "message": "Logged in" }` |
| GET | /auth/me | Current account and own profile | None | Account role and player data |
| POST | /auth/logout | Invalidate account sessions | None | `{ "message": "All sessions for this account have been logged out." }` |
| GET | /public/courts | Public court information | None | Sanitized court list |
| GET | /public/rankings | Public rankings | None | Sanitized rankings |
| GET | /public/summary | Public club totals | None | Public summary |
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
| PATCH  | /queue-entries/:id                         | Valid transition; call only oldest waiter                                       | `{ "status": "cancelled" }`                                       | Updated entry; playing starts the called group's match                                                                                           |
| DELETE | /queue-entries/:id                         | Delete waiting/terminal entry; protect called/playing                           | None                                                              | `{ "message": "Queue entry deleted successfully." }`                                                                                             |
| POST   | /queue-entries/courts/:courtId/call-next   | Call oldest two or four waiting players                                         | `{ "playType": "doubles" }`                                       | Two or four entries with status called                                                                                                           |
| POST   | /queue-entries/courts/:courtId/start-match | Start called group and occupy court atomically                                  | No body                                                           | Populated ongoing match                                                                                                                          |
| GET    | /matches                                   | Match list with results; search/status/playType/courtId/playerId filters        | `?status=completed&playType=singles`                              | Array of populated matches with result                                                                                                           |
| GET    | /matches/:id                               | Match scorecard with result                                                     | Valid ObjectId                                                    | Match document with players, court, result                                                                                                       |
| POST   | /matches                                   | Schedule singles or doubles                                                     | Match example below                                               | Scheduled match                                                                                                                                  |
| PATCH  | /matches/:id                               | Edit scheduled match or start/cancel                                            | `{ "status": "ongoing" }`                                         | Updated match                                                                                                                                    |
| DELETE | /matches/:id                               | Delete non-ongoing match and its result                                         | None                                                              | `{ "message": "Match deleted successfully." }`                                                                                                   |
| POST   | /match-results                             | Validate scores, derive winners, finish match, release court and complete queue | `{ "matchId": "...", "teamOneScore": 11, "teamTwoScore": 8 }`     | Result with computed winnerPlayerIds                                                                                                             |
| GET    | /match-results/:id                         | Result with winner profiles                                                     | Valid ObjectId                                                    | Populated result                                                                                                                                 |
| GET    | /statistics/dashboard                      | Counts, usage, live courts, recent matches, upcoming bookings                   | None                                                              | Dashboard object                                                                                                                                 |
| GET    | /statistics                                | Completed totals, average duration, court usage, daily and hourly distributions | None                                                              | Analytics object                                                                                                                                 |
