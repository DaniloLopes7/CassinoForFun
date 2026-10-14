// Tipos dos endpoints de esportes do backend
export type SportEventStatus = 'scheduled' | 'live' | 'finished' | 'cancelled';
export type OutcomeKey = 'home' | 'draw' | 'away';

export interface SportOutcome {
  key: OutcomeKey;
  label: string;
  odds: number;
}

export interface SportMarket {
  _id: string;
  event: string;
  key: 'h2h';
  outcomes: SportOutcome[];
  status: 'open' | 'suspended' | 'settled' | 'cancelled';
  winningOutcome?: OutcomeKey | null;
}

export interface SportEvent {
  _id: string;
  sportKey: string;
  sportTitle: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: string; // ISO
  status: SportEventStatus;
  homeScore: number | null;
  awayScore: number | null;
  isDemo: boolean;
  markets?: SportMarket[];
}

export interface SportBet {
  _id: string;
  event: {
    homeTeam: string;
    awayTeam: string;
    startsAt: string;
    status: SportEventStatus;
    homeScore: number | null;
    awayScore: number | null;
    sportTitle: string;
  };
  outcome: OutcomeKey;
  odds: number;
  stake: number; // centavos
  potentialPayout: number; // centavos
  status: 'pending' | 'won' | 'lost' | 'refunded';
  createdAt: string;
}
