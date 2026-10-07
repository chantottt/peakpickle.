import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarDays,
  ListOrdered,
  Users,
  Grid2X2,
  Trophy,
  Menu,
  X,
  Clock3,
} from 'lucide-react';
import { Brand } from '../components/layout/Brand';
import { Avatar, Badge, DataState, EmptyState, Button } from '../components/ui';
import { CourtCard } from '../components/courts/CourtCard';
import { useApi } from '../hooks/useApi';
import type { Court, DashboardData, Player } from '../types';
import { capitalize } from '../utils/format';
const links = [
  { to: '/', label: 'Home' },
  { to: '/courts', label: 'Courts' },
  { to: '/players', label: 'Players' },
  { to: '/matches', label: 'Matches' },
  { to: '/rankings', label: 'Rankings' },
  { to: '/dashboard', label: 'Dashboard' },
];
export function LandingPage() {
  const [menu, setMenu] = useState(false);
  const courts = useApi<Court[]>('/public/courts');
  const rankings = useApi<Player[]>('/public/rankings');
  const stats = useApi<DashboardData>('/public/summary');
  return (
    <div className="landing">
      <header className="landing-navbar">
        <div className="site-container nav-inner">
          <Brand />
          <nav aria-label="Main navigation" className={menu ? 'landing-nav open' : 'landing-nav'}>
            {links.map((link) => (
              <Link className={link.to === '/' ? 'active' : ''} key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </nav>
          <Link className="button button-primary nav-reserve" to="/reservations/new">
            <CalendarDays size={17} />
            Reserve Court
          </Link>
          <Button
            className="landing-menu-button"
            variant="ghost"
            onClick={() => setMenu(!menu)}
            aria-label={menu ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menu}
          >
            {menu ? <X size={22} /> : <Menu size={22} />}
          </Button>
        </div>
      </header>
      <main>
        <section className="hero site-container">
          <div className="hero-copy">
            <span className="hero-eyebrow">
              <span />
              MORE PLAY. LESS WAIT.
            </span>
            <h1>
              Your Court.
              <br />
              Your Match.
              <br />
              <span>Your Turn.</span>
            </h1>
            <p>
              Reserve pickleball courts, join live queues, find players, and keep every game moving.
            </p>
            <div className="hero-actions">
              <Link to="/reservations/new" className="button button-lime">
                Reserve a Court <ArrowUpRight size={19} />
              </Link>
              <Link to="/queue" className="button button-outline-light">
                <ListOrdered size={18} />
                Live Queue
              </Link>
            </div>
            <div className="hero-community">
              <div className="avatar-group">
                {rankings.data?.slice(0, 3).map((player) => (
                  <Avatar key={player._id} name={player.name} id={player._id} />
                ))}
              </div>
              <span>A community built for the love of the game.</span>
            </div>
          </div>
          <div className="hero-photo">
            <img
              src="/pickleball-courts.jpg"
              alt="Outdoor pickleball courts in a green park setting"
              fetchPriority="high"
            />
            <div className="hero-photo-label">
              <span className="hero-photo-icon">
                <Grid2X2 size={23} />
              </span>
              <div>
                <strong>Your next great game starts here.</strong>
                <span>Find your court. Make your move.</span>
              </div>
              <ArrowUpRight size={24} />
            </div>
            <div className="hero-vertical-label">PICKLEBALL BRINGS PEOPLE TOGETHER</div>
          </div>
        </section>
        <section className="site-container landing-stat-section">
          <DataState
            loading={stats.loading}
            error={stats.error}
            hasData={!!stats.data}
            onRetry={stats.refetch}
          >
            {stats.data && (
              <div className="landing-stats">
                {[
                  { label: 'Active players', value: stats.data.totalPlayers, icon: Users },
                  { label: 'Courts available', value: stats.data.courtsAvailable, icon: Grid2X2 },
                  { label: 'Matches played', value: stats.data.totalMatches, icon: Trophy },
                  {
                    label: 'Players in queue',
                    value: stats.data.playersInQueue,
                    icon: ListOrdered,
                  },
                ].map((stat) => (
                  <div className="landing-stat" key={stat.label}>
                    <stat.icon size={27} />
                    <div>
                      <strong>{stat.value.toLocaleString()}</strong>
                      <span>{stat.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DataState>
        </section>
        <section className="site-container landing-section">
          <div className="section-title">
            <div>
              <p className="eyebrow">SPACE TO PLAY</p>
              <h2>Find your home court.</h2>
              <p className="muted">A good court. Great company. All you need for your next game.</p>
            </div>
            <Link to="/courts" className="text-link">
              View all courts <ArrowUpRight size={17} />
            </Link>
          </div>
          <DataState
            loading={courts.loading}
            error={courts.error}
            hasData={!!courts.data}
            onRetry={courts.refetch}
          >
            <div className="landing-courts">
              {courts.data
                ?.filter((court) => court.status !== 'maintenance')
                .slice(0, 3)
                .map((court) => (
                  <CourtCard key={court._id} court={court} />
                ))}
            </div>
            {courts.data?.length === 0 && (
              <EmptyState
                title="Courts are coming soon"
                description="Check back for the next available court."
              />
            )}
          </DataState>
        </section>
        <section className="players-section">
          <div className="site-container landing-section">
            <div className="section-title">
              <div>
                <p className="eyebrow">THE PEOPLE BEHIND THE PLAY</p>
                <h2>Meet the top players.</h2>
                <p className="muted">A little competition. A lot of community.</p>
              </div>
              <Link to="/rankings" className="text-link">
                Full rankings <ArrowUpRight size={17} />
              </Link>
            </div>
            <DataState
              loading={rankings.loading}
              error={rankings.error}
              hasData={!!rankings.data}
              onRetry={rankings.refetch}
            >
              <div className="top-players">
                {rankings.data?.slice(0, 3).map((player) => (
                  <Link to={`/players/${player._id}`} className="top-player" key={player._id}>
                    <span className={`rank-medal rank-${player.rank}`}>
                      {String(player.rank).padStart(2, '0')}
                    </span>
                    <Avatar name={player.name} id={player._id} large />
                    <div>
                      <h3>{player.name}</h3>
                      <p className="muted">
                        {capitalize(player.skillLevel)} · {player.wins} wins
                      </p>
                    </div>
                    <Badge tone="status-available">{player.winRate}%</Badge>
                  </Link>
                ))}
              </div>
              {rankings.data?.length === 0 && (
                <EmptyState
                  title="Be part of the first lineup"
                  description="Add a player to start building the community."
                />
              )}
            </DataState>
          </div>
        </section>
        <section className="site-container">
          <div className="landing-cta">
            <div>
              <span className="eyebrow">THE COURT IS CALLING</span>
              <h2>
                Less planning.
                <br />
                More pickleball.
              </h2>
              <p>Your next match is just a court reservation away.</p>
            </div>
            <div>
              <Link className="button button-lime" to="/reservations/new">
                Let’s Play <ArrowUpRight size={19} />
              </Link>
              <span>
                <Clock3 size={15} />
                Your turn, on your schedule.
              </span>
            </div>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <div className="site-container footer-grid">
          <div>
            <Brand light />
            <p>
              Better courts. Better matches.
              <br />A stronger community.
            </p>
          </div>
          <div>
            <strong>Play</strong>
            <Link to="/courts">Courts</Link>
            <Link to="/players">Players</Link>
            <Link to="/matchmaking">Find a match</Link>
          </div>
          <div>
            <strong>Your club</strong>
            <Link to="/queue">Live Queue</Link>
            <Link to="/rankings">Rankings</Link>
            <Link to="/dashboard">Dashboard</Link>
          </div>
          <div className="footer-tagline">
            Your Court.
            <br />
            Your Match.
            <br />
            <span>Your Turn.</span>
          </div>
        </div>
        <div className="site-container footer-bottom">
          <span>© {new Date().getFullYear()} PeakPickle. Play more, together.</span>
          <span>Made for the game.</span>
        </div>
      </footer>
    </div>
  );
}
