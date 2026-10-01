import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import type { Player } from '../types';
import { Avatar, Card, DataState, EmptyState, PageHeader, Table } from '../components/ui';
import { capitalize } from '../utils/format';
export function RankingsPage() {
  const state = useApi<Player[]>('/players/rankings');
  return (
    <>
      <PageHeader
        title="Rankings"
        description="A little friendly competition. A lot of great pickleball."
      />
      <Card className="rankings-intro">
        <Trophy size={33} />
        <div>
          <h2>Earn your place, one game at a time.</h2>
          <p>Ranked by wins, then win rate. Every completed match counts.</p>
        </div>
      </Card>
      <DataState {...state} hasData={!!state.data} onRetry={state.refetch}>
        {state.data?.length ? (
          <Table headers={['Rank', 'Player', 'Wins', 'Losses', 'Matches', 'Win Rate']}>
            <>
              {state.data.map((player) => (
                <tr key={player._id} className={`ranking-top-${player.rank}`}>
                  <td data-label="Rank">
                    <span className="rank-number">{player.rank}</span>
                  </td>
                  <td data-label="Player">
                    <Link className="table-person" to={`/players/${player._id}`}>
                      <Avatar name={player.name} id={player._id} />
                      <div>
                        <strong>{player.name}</strong>
                        <small>{capitalize(player.skillLevel)}</small>
                      </div>
                    </Link>
                  </td>
                  <td data-label="Wins">
                    <strong>{player.wins}</strong>
                  </td>
                  <td data-label="Losses">{player.losses}</td>
                  <td data-label="Matches">{player.matchesPlayed}</td>
                  <td data-label="Win Rate">
                    <div className="win-rate-bar">
                      <strong>{player.winRate}%</strong>
                      <span>
                        <i style={{ width: `${player.winRate}%` }} />
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </>
          </Table>
        ) : (
          <EmptyState
            title="The leaderboard is open"
            description="Add players and record match results to build the rankings."
          />
        )}
      </DataState>
      <p className="table-footnote">
        Singles and doubles results both count. A player with no completed matches has a 0% win
        rate.
      </p>
    </>
  );
}
