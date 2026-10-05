import { lazy, Suspense } from 'react';
import { Route, Routes, Link } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { EmptyState, Skeleton } from './components/ui';
const ActivityPage = lazy(() =>
  import('./pages/ActivityPage').then((module) => ({ default: module.ActivityPage })),
);
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const CourtsPage = lazy(() =>
  import('./pages/CourtsPage').then((module) => ({ default: module.CourtsPage })),
);
const CourtDetailPage = lazy(() =>
  import('./pages/CourtDetailPage').then((module) => ({ default: module.CourtDetailPage })),
);
const ReservationsPage = lazy(() =>
  import('./pages/ReservationsPage').then((module) => ({ default: module.ReservationsPage })),
);
const ReservationFormPage = lazy(() =>
  import('./pages/ReservationFormPage').then((module) => ({ default: module.ReservationFormPage })),
);
const QueuePage = lazy(() =>
  import('./pages/QueuePage').then((module) => ({ default: module.QueuePage })),
);
const PlayersPage = lazy(() =>
  import('./pages/PlayersPage').then((module) => ({ default: module.PlayersPage })),
);
const PlayerProfilePage = lazy(() =>
  import('./pages/PlayerProfilePage').then((module) => ({ default: module.PlayerProfilePage })),
);
const MatchmakingPage = lazy(() =>
  import('./pages/MatchmakingPage').then((module) => ({ default: module.MatchmakingPage })),
);
const MatchesPage = lazy(() =>
  import('./pages/MatchesPage').then((module) => ({ default: module.MatchesPage })),
);
const MatchDetailPage = lazy(() =>
  import('./pages/MatchDetailPage').then((module) => ({ default: module.MatchDetailPage })),
);
const RankingsPage = lazy(() =>
  import('./pages/RankingsPage').then((module) => ({ default: module.RankingsPage })),
);
const StatisticsPage = lazy(() =>
  import('./pages/StatisticsPage').then((module) => ({ default: module.StatisticsPage })),
);
export function App() {
  return (
    <Suspense
      fallback={
        <div className="page-content">
          <Skeleton />
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/courts" element={<CourtsPage />} />
          <Route path="/courts/:id" element={<CourtDetailPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/reservations/new" element={<ReservationFormPage />} />
          <Route path="/reservations/:id/edit" element={<ReservationFormPage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/players/:id" element={<PlayerProfilePage />} />
          <Route path="/matchmaking" element={<MatchmakingPage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/matches/:id" element={<MatchDetailPage />} />
          <Route path="/rankings" element={<RankingsPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route
            path="*"
            element={
              <EmptyState
                title="Page not found"
                description="This page isn’t available. Head back to your club dashboard."
                action={
                  <Link to="/dashboard" className="button button-primary">
                    Go to Dashboard
                  </Link>
                }
              />
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
