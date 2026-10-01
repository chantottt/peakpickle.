export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type PlayPreference = 'singles' | 'doubles' | 'both';
export interface Player {
  _id: string;
  name: string;
  email: string;
  skillLevel: SkillLevel;
  preferredPlay: PlayPreference;
  isActive: boolean;
  availability: string[];
  wins: number;
  losses: number;
  winRate: number;
  matchesPlayed: number;
  rank: number;
  recentMatches?: Match[];
  matchPercentage?: number;
  matchingReason?: string;
}
export interface Court {
  _id: string;
  name: string;
  courtNumber: number;
  location: string;
  type: 'indoor' | 'outdoor';
  status: 'available' | 'occupied' | 'maintenance';
  openingTime: string;
  closingTime: string;
  queueCount?: number;
  nextSchedule?: Reservation | null;
  schedule?: Reservation[];
  nextAvailableTime?: string | null;
}
export interface Reservation {
  _id: string;
  playerId: Player;
  courtId: Court;
  reservationDate: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}
export interface MatchResult {
  _id: string;
  matchId: string;
  teamOneScore: number;
  teamTwoScore: number;
  winnerPlayerIds: string[];
}
export interface Match {
  _id: string;
  courtId: Court;
  players: Player[];
  playType: 'singles' | 'doubles';
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: MatchResult | null;
}
export interface QueueEntry {
  _id: string;
  playerId: Player;
  courtId: string;
  status: 'waiting' | 'called' | 'playing' | 'completed' | 'cancelled' | 'skipped';
  joinedAt: string;
  position: number;
  playersAhead: number;
  estimatedWait: number;
}
export interface QueueSummary {
  court: Court;
  entries: QueueEntry[];
  waitingCount: number;
  averageMatchDuration: number;
  estimatedFinish: string | null;
  currentMatch: Match | null;
}
export interface Analytics {
  totalPlayers: number;
  courtsOpen: number;
  courtsAvailable: number;
  matchesToday: number;
  playersInQueue: number;
  totalMatches: number;
  averageMatchDuration: number;
  mostUsedCourt: string;
  peakPlayingHour: string;
  courtUsage: { _id: string; name: string; matches: number; usedMinutes: number }[];
  matchesByDay: { date: string; label: string; matches: number }[];
  peakHours: { hour: number; label: string; matches: number }[];
}
export interface DashboardData extends Analytics {
  courts: Court[];
  recentMatches: Match[];
  upcomingReservations: Reservation[];
}
