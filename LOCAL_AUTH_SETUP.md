# PeakPickle localhost authentication

These instructions supersede older unauthenticated API examples in README.md. There is no hosting or deployment configuration. Node.js 22.12+ (or 24 LTS) and npm are required. On Windows PowerShell, use `npm.cmd` / `npx.cmd` if execution policy blocks the `.ps1` wrappers.

## Quick temporary demo (no Atlas credentials)

From the project root:

```powershell
npm.cmd ci
npm.cmd run demo
```

In a second terminal:

```powershell
npm.cmd run dev:client
```

Open http://localhost:5173 or http://127.0.0.1:5173. Backend: port 5000, API prefix `/api`. Use the same hostname for frontend and API so cookies stay on the same site. Leave `VITE_API_URL` blank to select the correct hostname automatically. Cookies for localhost and 127.0.0.1 are independent: logging into one does not log into the other.

Demo accounts, **only in the disposable demo database**:

| Role   | Email                         | Password            |
| ------ | ----------------------------- | ------------------- |
| Admin  | admin@demo.local              | PeakPickleDemo!2026 |
| Member | miguel.santos@peakpickle.demo | PeakPickleDemo!2026 |

Demo mode starts an isolated MongoDB replica set, generates a temporary signing secret, and explicitly links its member account to a seeded profile. It never uses `MONGO_URI`. Stopping it discards all demo data. The first run may download the MongoDB test binary. Do not run demo and the persistent API simultaneously on port 5000.

## Atlas setup and persistent local mode

1. Create an Atlas project and cluster. Do not load sample data into PeakPickle collections.
2. Under Database Access, create a **database user**, separate from your Atlas login, with read/write access to the `peakpickle` database.
3. Under Network Access, add your current public IP address. Update this entry if your IP changes.
4. Select Connect → Drivers → Node.js. Copy the `mongodb+srv://` connection string. Insert the database username, URL-encoded password, cluster hostname, and `/peakpickle` database name. Atlas clusters support the transactions used for signup and sports workflows; a standalone local MongoDB server does not.
5. Copy `server/.env.example` to `server/.env` only if the private file does not exist. A local file with a generated signing secret is already created in this working copy. Set its `MONGO_URI` privately. Never paste it into chat or commit it.
6. Copy `client/.env.example` to `client/.env` if needed. Keep `VITE_API_URL` blank. Frontend variables are public and must never contain credentials.
7. Generate a signing secret privately if needed:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
   ```

   Save the output as `JWT_SECRET` in `server/.env`; do not share it.

8. From the root, run `npm.cmd run dev:server`, then `npm.cmd run dev:client` in another terminal. Missing/invalid configuration stops startup with a clear error. A database connection failure reports Atlas user/IP checks without printing the URI. No actual Atlas connection was verified during implementation.
9. Create the first admin using the procedure below, then log in at `/login`. Public `/signup` creates members only.

Atlas reference: [Connect to an Atlas cluster](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/).

## Environment variables

| File            | Variable                | Requirement and purpose                                                                                                                                     |
| --------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| server/.env     | MONGO_URI               | Required in persistent mode; Atlas URI with database name. Ignored by demo/tests.                                                                           |
| server/.env     | JWT_SECRET              | Required in persistent mode, at least 32 random characters. Demo/tests generate/provide their own secret. Changing it invalidates every signed session.     |
| server/.env     | PORT                    | Optional, defaults to 5000; other ports are rejected.                                                                                                       |
| server/.env     | CLIENT_ORIGIN           | Optional comma-separated local origins. Defaults to both `http://localhost:5173,http://127.0.0.1:5173`; other origins are rejected.                         |
| server/.env     | BUSINESS_TIMEZONE       | Optional sports timezone, default `Asia/Manila`.                                                                                                            |
| server/.env     | ADMIN_EMAIL             | Required only by the account provisioning script; normalized email.                                                                                         |
| server/.env     | ADMIN_PASSWORD          | Required only by provisioning; 12–128 characters. Remove after provisioning.                                                                                |
| server/.env     | LINK_PLAYER_ID          | Optional provisioning mode switch: an explicit, independently verified existing Player ID creates a linked **member**, not an admin. Remove afterward.      |
| client/.env     | VITE_API_URL            | Optional public API URL; blank uses browser hostname and port 5000. An explicit URL must use the same hostname as the frontend. Restart Vite after changes. |
| test shell      | PEAKPICKLE_BROWSER_PATH | Optional existing Chrome/Edge executable for Playwright.                                                                                                    |
| demo/test shell | MONGOMS_DOWNLOAD_DIR    | Optional MongoDB test binary cache; demo sets a workspace default.                                                                                          |

Both `.env` files are ignored by `.gitignore`. All persistent private credentials belong only in `server/.env`; never put secrets in a `VITE_` variable. Preserve an existing private environment file when updating examples.

## Create the first admin

Set `ADMIN_EMAIL` and a private `ADMIN_PASSWORD` in ignored `server/.env`, with `LINK_PLAYER_ID` absent/blank. Run from the project root:

```powershell
npm.cmd run create-admin --workspace server
```

The script reuses `MONGO_URI`, hashes the password, and refuses to overwrite an account or create another admin after the first exists. It prints no password/hash. Remove `ADMIN_EMAIL`/`ADMIN_PASSWORD` afterward. There is no public admin registration or automatic promotion. Admins are accounts without a required sports profile.

## Existing Player conflicts and controlled linking

Signup never claims a sports profile by email. An existing Player email produces a clear conflict, preserving its ID and all sports records. For a legitimate existing member:

1. Independently verify the person's ownership offline; an email match alone is insufficient.
2. Back up the database. Check the exact Player ID and ensure no User is already linked to it.
3. Set `ADMIN_EMAIL` to that Player's normalized email, `ADMIN_PASSWORD` to a privately chosen initial password, and `LINK_PLAYER_ID` to that exact Player ID in ignored `server/.env`.
4. Run the same `create-admin` command. In this explicit linking mode it creates a **member** account, locks the Player, checks the email and unique link, and uses a transaction. It does not recreate or modify the sports records.
5. Remove these provisioning variables. Communicate credentials privately outside this chat.

Do not edit User or Player emails independently in MongoDB. The existing player PATCH endpoint updates linked account/player emails together in a transaction and invalidates all account sessions. Members can change name, email, skill, play preference and availability on their own profile. They cannot change active status, roles or links. After an email change, log in again with the new address. Admin Player deletion refuses linked profiles; deactivation preserves records.

## Sessions, CSRF and permissions

Passwords use salted scrypt (`N=131072`, `r=8`, `p=1`) and are never returned. Sessions use HS256 JWTs with fixed issuer/audience, one-hour expiry and no refresh tokens. `pp_session` is HttpOnly, SameSite=Lax, path `/api`, and non-Secure for local HTTP. Every protected request verifies signature/expiry and reads the current User role, active flag and session version. `/auth/me` restores authentication on reload; protected routes wait for that result. A frontend expiry timer clears screens at the token deadline; server checks remain authoritative.

Logout increments the account's session version: **all sessions for that account** become invalid, including copied JWTs, then the browser cookie is removed. Inactive accounts cannot log in or use existing sessions. There is no password-reset or refresh-token flow.

Mutations require `X-CSRF-Token` matching an HttpOnly random `pp_csrf` cookie. Fetch it through `GET /api/auth/csrf` first; Axios does this automatically and includes cookies. Untrusted supplied Origins are rejected, credentialed CORS allows only the local frontend origins, and login/signup are rate-limited to 30 attempts per IP per 15 minutes. The limiter is in memory and resets on backend restart, sufficient for this single-process local app.

| Endpoint                                                       | Access                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET /health, /public/courts, /public/rankings, /public/summary | Sanitized public landing data; no reservations, contacts or private match history.                                                                                                                                                                                                  |
| GET /auth/csrf; POST /auth/signup, /auth/login                 | Public; CSRF required for POST, auth rate limiting. Signup rejects extra fields, including role.                                                                                                                                                                                    |
| GET /auth/me; POST /auth/logout                                | Current authenticated account.                                                                                                                                                                                                                                                      |
| GET /courts and /courts/availability                           | Signed-in accounts; member court responses contain only own bookings. Availability exclusion IDs must be owned.                                                                                                                                                                     |
| /reservations                                                  | Members list/read only own bookings, create pending bookings for themselves, edit pending bookings and cancel own pending/confirmed bookings. Confirmed bookings cannot be rescheduled by members. Confirm/complete/delete are admin actions.                                       |
| /queue-entries                                                 | Members join as themselves, list own entries, and cancel own waiting entries. Sanitized active queue summaries show FCFS position without contact data; other members' live match detail is omitted. Call/skip/start/result/delete are admin actions.                               |
| /players                                                       | Admin manages players. Member list is their own profile (for booking forms); own profile PATCH accepts permitted fields only. Other player detail exposes sports preferences/statistics, never email or private match history. Rankings/matchmaking expose sanitized sports fields. |
| /matches                                                       | Members list/read only participating matches; all management/results operations are admin-only. Own match responses include sanitized opponents and scores.                                                                                                                         |
| /statistics and /statistics/dashboard                          | Admin only. The landing page uses `/public/summary` instead.                                                                                                                                                                                                                        |

Member Player IDs are derived from the account. Supplied conflicting IDs are rejected; URL/query IDs never prove ownership. Existing court/player locks, overlap checks, transitions, queue order, matchmaking scores and result/ranking services remain in use.

## Seed safety

`npm.cmd run demo` is the preferred seed/demo workflow and never touches Atlas. The standalone `npm.cmd run seed -- --confirm` remains **destructive**, replacing all six sports collections. It refuses to run if any User exists unless you explicitly add `--reset-users`; that flag also deletes all User accounts before sports data, preventing orphaned links. Atlas URIs additionally require `--allow-atlas-reset`. Back up and independently authorize any Atlas reset; none was run during this implementation. After a destructive persistent reset, create the first admin again; demo credentials are not created in Atlas by the standalone seed.

## Verification commands

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
```

Backend tests use a temporary MongoDB replica set, not Atlas, and authenticate the existing sports regression requests as a test admin. Authentication tests cover signup atomicity/conflicts, role escalation, invalid/expired JWTs, login, logout invalidation, inactive users, CSRF, member ownership, sanitized public data, and admin-only operations.

For browser tests, start a **fresh** demo and frontend, then:

```powershell
# Optional installed browser on Windows:
$env:PEAKPICKLE_BROWSER_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
npm.cmd run test:ui
```

Alternatively install Playwright Chromium with `npx.cmd playwright install chromium`. Existing responsive/activity sports tests now authenticate as the explicit demo admin. New browser tests cover both roles, signup, member-specific data, refresh persistence, logout, protected routes and both local hostnames. Stop and restart the demo if sports data has been manually changed.
