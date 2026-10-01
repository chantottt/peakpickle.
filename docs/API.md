# REST API reference

Base URL: `http://localhost:5000/api` (configure `VITE_API_URL` once on the client).

All requests and responses use JSON. Successful reads, updates, and deletes use 200; creates use 201. Invalid bodies, malformed IDs, conflicts, forbidden transitions, and duplicate values use 400. Missing records and routes use 404. Unexpected failures use 500. Errors always have `{ "message": "..." }`.

The application implements **35 method/path endpoints**, including six computed read endpoints and two queue processing actions. Literal processing paths are registered before `/:id` paths.

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

## Request examples

Replace `...` with actual ObjectIds from list responses. Demo IDs are deterministic; player 1 is `000000000000000000000064`, court 1 is `0000000000000000000000c8`.

```json
{
  "name": "Miguel Santos",
  "email": "miguel@example.com",
  "skillLevel": "intermediate",
  "preferredPlay": "doubles",
  "isActive": true,
  "availability": ["morning", "evening"]
}
```

```json
{
  "name": "Riverside Court",
  "courtNumber": 7,
  "location": "BGC, Taguig",
  "type": "outdoor",
  "status": "available",
  "openingTime": "06:00",
  "closingTime": "22:00"
}
```

```json
{
  "playerId": "000000000000000000000076",
  "courtId": "0000000000000000000000c8",
  "reservationDate": "2026-10-02",
  "startTime": "09:00",
  "endTime": "10:00",
  "status": "pending"
}
```

```json
{
  "courtId": "0000000000000000000000cb",
  "players": ["000000000000000000000076", "000000000000000000000077"],
  "playType": "singles",
  "scheduledAt": "2026-10-02T18:00:00+08:00"
}
```

Singles order is `[A, B]`. Doubles order is `[A1, A2, B1, B2]`. Score validation requires unequal integer scores between 0 and 99. Winner IDs are derived from the scores; if explicitly supplied they must agree. Results are immutable through the API.

## Status rules

- Reservation: pending → confirmed/cancelled; confirmed → completed/cancelled.
- Queue: waiting → called/cancelled; called → playing/skipped; playing → completed.
- Match: scheduled → ongoing/cancelled; ongoing → completed.

An unchanged status is an idempotent update. Terminal records cannot move backward. Queue playing and completion are coordinated with match creation/results: direct completion without recording a result is rejected. New queue entries are always waiting; new matches are always scheduled; new reservations may be pending or confirmed.

## Processing details

1. **Availability:** pending and confirmed bookings block a slot when `newStart < existingEnd && newEnd > existingStart`. Adjacent bookings are allowed. Filter maintenance and operating hours. Editing excludes its own ID. Reservations and court changes take a transactional write on the court before checking records; competing requests retry against the latest committed slot data.
2. **FCFS:** sort active entries by joinedAt, then ObjectId for deterministic ties. Positions are calculated at request time. Players ahead × the court's average completed match duration gives the wait estimate. Playing entries remain ahead until their result is recorded. Two oldest waiters are called for a singles game.
3. **Matching:** same skill gives 60 points, compatible time gives 30, the same preferred play gives 10. `both` only gets preference points when the selected preference is also `both`; `any` time matches all slots. Only active players are candidates; highest score appears first.
4. **Rankings:** consider completed matches with a result. Each participant gets one played match; winning-team participants get one win; the rest get one loss. Win rate is wins / matches × 100 (zero for zero matches). Sort wins descending, win rate descending, then name for deterministic ties.
5. **Statistics:** compute completed match counts, positive elapsed durations, usage by court, last seven days, and starts by local hour from MongoDB records. Dashboard adds today's scheduled/ongoing/completed activity and upcoming reservations. Day/hour boundaries use Asia/Manila, not the host's timezone. With no duration history, queue estimates use 15 minutes.
6. **Result processing:** one transaction writes a result, completes the match and linked queue entries, and releases the court. Invalid transitions or failures roll back all writes together. Court/queue coordination uses Atlas transactions (or a local replica set), not a process-local lock.
