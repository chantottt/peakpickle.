# PeakPickle defense guide

## Explain the application in one minute

PeakPickle is a desktop-first responsive club website that reserves courts, matches players, manages first-come-first-served queues, and records matches. React components collect input with React Hook Form and validate it with Zod. One Axios client calls Express routers. Controllers validate requests and delegate computation to services. Mongoose schemas validate and store related records in MongoDB Atlas. The server returns data or consistent JSON errors, and React shows loading, success, empty, or error states.

## Suggested live demo

1. Start the seeded API and frontend before class; use Atlas for the permanent-storage requirement.
2. Open the landing page and dashboard at desktop width. Explain the wide sidebar, four-column stats, and two-column panels.
3. Open Courts, use type/status filters, and view a court's schedule.
4. Open New Reservation and submit without selections to show inline validation.
5. Choose a player and 09:00–10:00. Create a booking. Try an overlapping time to explain why the court disappears from availability and why server validation still runs on save.
6. Edit the booking; explain exclusion of its own ID. Open the delete dialog and show the confirmation step.
7. Open Live Queue. Explain joinedAt sorting and the fact that queue numbers are derived. Call Next, Start Match, and Complete with a recorded score. Show the released court and reindexed queue.
8. Open Players, a profile, and Matchmaking. Explain the exact 60/30/10 scoring and time preferences.
9. Open Rankings and Statistics. Show how the recorded result changes wins and completed totals.
10. Resize to 375px. Show the drawer, stacked forms/cards, and labeled reservation rows with no page overflow.
11. Visit `/courts/not-a-valid-id` to show a handled API validation error, then an unknown frontend route to show Page not found.

## Files to be able to explain

| Area                 | Starting file                                  | Key point                                                     |
| -------------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| App navigation       | client/src/App.tsx                             | React Router matches routes; lazy loading splits page bundles |
| Responsive layout    | components/layout/AppLayout.tsx and styles.css | One layout adapts through breakpoints                         |
| API integration      | services/api.ts and hooks/useApi.ts            | One base URL; request cancellation; loading/error/refetch     |
| Form validation      | schemas/forms.ts and ReservationFormPage.tsx   | Schema outside component, z.infer, resolver, inline errors    |
| Mongoose modeling    | server/src/models                              | ObjectId references, enums, timestamps and uniqueness         |
| Server configuration | server/src/app.ts                              | JSON → CORS → logger → routes → 404 → errors                  |
| Availability         | services/availabilityService.ts                | Two inequalities determine interval overlap                   |
| Transactions         | services/courtLock.ts and playerLock.ts        | Shared document writes serialize competing validation/writes  |
| Queue                | services/queueService.ts                       | FCFS sort; positions and estimates are calculated             |
| Matching/rankings    | services/playerService.ts                      | Simple transparent scoring and completed-match totals         |
| Match completion     | services/matchService.ts                       | Result/winner/match/queue/court changes are atomic            |
| Analytics            | services/statisticsService.ts                  | Counts, durations, distributions, local time boundaries       |

## Questions to prepare for

- Why is adjacency legal? If a booking ends at 10:00, a new booking starting at 10:00 does not satisfy both strict overlap inequalities.
- Why validate on both sides? Client validation improves feedback; server validation protects data when someone bypasses the UI or another request changes availability.
- Why no permanent queue number? Leaving/skipping/completion changes positions, so storing a number would become stale.
- Why a transaction and a court write? Two requests could otherwise both read “no overlap” before either inserts. A write on the same court forces conflicts/retries and a fresh validation snapshot.
- What are derived values? Queue position, compatibility scores, wins, win rate, usage and selected form summaries can be calculated from source records/inputs.
- How are doubles winners counted? The first two players are team A, the last two team B. Every winner gets a win; each participant gets one completed match.
- What happens with zero history? Win rate is zero; queue estimates start with 15 minutes.
- What makes it desktop-first? The main layout uses a full sidebar, four-column stats/player cards, multi-column courts, full tables and side-by-side charts before adapting the same components at smaller widths.

Every member should understand the complete data flow and only claim contributions they actually made. Practice explaining the code in your own words and use real member-owned commits as evidence.
