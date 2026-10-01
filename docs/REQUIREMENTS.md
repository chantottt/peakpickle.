# Academic requirements checklist

This maps the attached CTADWEBL final-project document and the user's PeakPickle specification to implementation evidence. Checks indicate implementation, not a guaranteed grade. Account-specific submission obligations remain pending.

| Requirement                                                | Status                                            | Evidence                                                                |
| ---------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| Original processing concept plus landing page              | Implemented                                       | PeakPickle courts/players/queue/matches; LandingPage                    |
| React, Vite, TypeScript, Tailwind CSS                      | Implemented                                       | client manifest, Vite config, Tailwind import and @theme tokens         |
| React Router, 10+ pages                                    | Implemented                                       | 15 route patterns in App.tsx                                            |
| React Hook Form, external Zod, z.infer, resolvers          | Implemented                                       | schemas/forms.ts and EntityForms/ReservationFormPage                    |
| One Axios instance                                         | Implemented                                       | client/src/services/api.ts                                              |
| Express, Node, Mongoose, Atlas configuration               | Implemented; Atlas connection pending credentials | server architecture; config/database.ts; .env.example                   |
| At least five related collections for top rubric band      | Implemented                                       | Player, Court, Reservation, QueueEntry, Match, MatchResult              |
| Required/default/enum/unique/min/max/timestamps validation | Implemented                                       | Six models; API boundary schemas; unique/index rules                    |
| Seeded, valid relationships                                | Verified locally                                  | 20/6/35/14/47/42 records, deterministic ObjectIds                       |
| 20+ REST endpoints and main-resource full CRUD             | Verified locally                                  | 35 endpoints; API.md; integration suite                                 |
| Five genuine processing read endpoints                     | Verified locally                                  | availability, queue summary, matching, rankings, dashboard, statistics  |
| Double-booking prevention including simultaneous requests  | Verified locally                                  | availabilityService, courtLock; concurrent reservation test             |
| Availability hook returns data/loading/error/refetch       | Implemented                                       | useCourtAvailability.ts                                                 |
| Valid status transitions, 400 on invalid transitions       | Verified locally                                  | transitions.ts and state/result tests                                   |
| FCFS queue without stored permanent queue number           | Verified locally                                  | queueService; joinedAt + ID sort; computed estimates                    |
| Matching score exactly 60/30/10                            | Verified locally                                  | playerService; matching tests                                           |
| Rankings from completed matches and results                | Verified locally                                  | playerService; wins/played/win-rate tests                               |
| All screens handle loading/error                           | Verified in browser                               | DataState/useApi; error, skeleton and retry components                  |
| Empty states and visible success feedback                  | Verified in browser                               | EmptyState and ToastProvider                                            |
| Delete confirmations                                       | Verified in browser                               | ConfirmDialog on reservations/courts/players/matches                    |
| Stable MongoDB IDs as list keys                            | Implemented                                       | Data-backed lists key by _id; static enumerations use semantic values   |
| Derived values computed during render                      | Implemented                                       | Selected courts, teams, filtered waiting rows; summary is API data      |
| Reusable components and a custom hook                      | Implemented                                       | ui/layout/resource components; four hooks                               |
| Separate routes/models/controllers/services/middleware     | Implemented                                       | server/src folders; app only configuration and mounts                   |
| Correct middleware order, logger, JSON 404/error           | Verified locally                                  | app.ts; errors.ts; invalid ID and 404 tests                             |
| Correct HTTP codes and consistent error JSON               | Verified locally                                  | 200/201/400/404 tests; 500 handler defined                              |
| Environment examples and Git ignores                       | Implemented                                       | both .env.example; root .gitignore                                      |
| Supplied logo and wireframe visual direction               | Implemented                                       | exact public logo; retained wireframe; green sidebar/table/chart layout |
| Desktop-first at 1440/1280/1024                            | Verified in browser                               | Full sidebar; multi-column cards; tables; chart panels                  |
| Responsive tablet 768 and mobile browser 375               | Verified in browser                               | Drawer and responsive grids/labeled table rows                          |
| No body horizontal scrolling                               | Verified in browser                               | 75 route/width measurements, zero overflows                             |
| README, setup, API table, screenshots, limitations         | Implemented                                       | root README and docs                                                    |
| Git initialization                                         | Completed                                         | main branch, appropriate ignores                                        |
| Strictly 2–3 actual group members                          | Three supplied identifiers; confirm full names    | README member table                                                     |
| Meaningful commits by every actual member                  | Must be completed by members                      | Cannot be substituted by generated commits                              |
| GitHub repository link and instructor access               | Pending actual repository/account                 | README GitHub instructions                                              |
| Teams submission and defense                               | User/class action                                 | DOCX submission instructions; DEFENSE.md                                |

## Phase delivery record

| Phase | Completed implementation                                              | Files/areas                                           |
| ----- | --------------------------------------------------------------------- | ----------------------------------------------------- |
| 1     | Project structure, requested dependencies, npm workspaces             | root/client/server manifests, configs, lockfile       |
| 2     | MongoDB config and six timestamped schemas                            | server/config, server/models                          |
| 3     | Realistic related Filipino demo data                                  | server/seed                                           |
| 4     | CRUD and 35 REST endpoints                                            | server/controllers, server/routes                     |
| 5     | Availability, FCFS, matching, results, rankings, statistics           | server/services and utils                             |
| 6     | Logger, CORS, JSON 404 and errors                                     | server/middleware, app.ts                             |
| 7     | Axios, typed API hooks, schemas, UI primitives                        | client/services, hooks, schemas, types, components/ui |
| 8     | Desktop shell, forest sidebar, header, wide grids                     | client/components/layout, styles.css                  |
| 9     | Complete landing page                                                 | LandingPage, Brand, CourtCard                         |
| 10    | Dashboard counts/charts/live status/recent/upcoming                   | DashboardPage, Charts                                 |
| 11    | Courts filters, details, schedule, create/edit/delete                 | CourtsPage, CourtDetailPage, CourtForm                |
| 12    | Reservation table/details/create/edit/delete/availability             | ReservationsPage, ReservationFormPage                 |
| 13    | Live queue, join/leave/call/start/skip/complete                       | QueuePage, QueueCard, queue/result forms              |
| 14    | Player cards, profiles, CRUD, preferences/history                     | PlayersPage, PlayerProfilePage, PlayerForm            |
| 15    | Weighted player matching results                                      | MatchmakingPage, playerService                        |
| 16    | Match list, details, singles/doubles, results                         | MatchesPage, MatchDetailPage, MatchForm, ResultForm   |
| 17    | Ranked desktop table with subtle top-three accents                    | RankingsPage                                          |
| 18    | Four analytics cards and three responsive charts                      | StatisticsPage, Charts                                |
| 19    | Responsive drawer, stacked forms/cards, readable table rows           | styles.css, AppLayout; browser width checks           |
| 20    | Builds/type checks/integration/browser QA, screenshots, documentation | tests, README, docs                                   |

Intermediate type checks/builds were run while backend and frontend phases were added. Final verification is recorded in TESTING.md. No existing user project code was removed; the initial workspace was empty.
