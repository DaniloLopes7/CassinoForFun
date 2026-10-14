import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import GameLayout from '../components/game/GameLayout';
import BetAmount from '../components/game/BetAmount';
import Money from '../components/Money';
import { games } from '../services/games';
import { useUser } from '../context/UserContext';

type Phase = 'idle' | 'active' | 'finished';
type Action = 'hit' | 'stand' | 'double' | 'split';
type Outcome = 'blackjack' | 'won' | 'push' | 'lost' | 'bust';

interface BJResult {
  outcome: Outcome;
  payout: number;
}
interface BJStateRes {
  sessionId: string;
  bet: number;
  hands: string[][];
  dealerUp: string;
  activeHand: number;
  values: number[];
  canDouble: boolean;
  canSplit: boolean;
}
interface BJFinishedRes {
  finished: true;
  results: BJResult[];
  dealer: string[];
  dealerValue: number;
  payout: number;
  hands?: string[][];
  values?: number[];
}
type BJRes = BJStateRes | BJFinishedRes;

function isFinished(res: BJRes): res is BJFinishedRes {
  return (res as BJFinishedRes).finished === true;
}

function CardView({ card, faceDown }: { card?: string; faceDown?: boolean }) {
  if (faceDown || !card) {
    return (
      <div className="flex h-[76px] w-14 items-center justify-center rounded-lg border border-line bg-surface shadow-card">
        <span className="font-display text-xl text-gold">?</span>
      </div>
    );
  }
  const suit = card.slice(-1);
  const rank = card.slice(0, -1);
  const red = suit === '♥' || suit === '♦';
  return (
    <div className="flex h-[76px] w-14 flex-col items-center justify-center rounded-lg border border-line bg-ink text-base shadow-card">
      <span className="text-lg font-bold leading-none">{rank}</span>
      <span className={`text-xl leading-none ${red ? 'text-danger' : ''}`}>{suit}</span>
    </div>
  );
}

export default function Blackjack() {
  const { t } = useTranslation();
  const { user, setAuthOpen, refresh } = useUser();
  const [bet, setBet] = useState(500);
  const [phase, setPhase] = useState<Phase>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hands, setHands] = useState<string[][]>([]);
  const [dealerUp, setDealerUp] = useState<string | null>(null);
  const [dealerCards, setDealerCards] = useState<string[] | null>(null);
  const [dealerValue, setDealerValue] = useState<number | null>(null);
  const [activeHand, setActiveHand] = useState(0);
  const [values, setValues] = useState<number[]>([]);
  const [canDouble, setCanDouble] = useState(false);
  const [canSplit, setCanSplit] = useState(false);
  const [results, setResults] = useState<BJResult[] | null>(null);
  const [payout, setPayout] = useState(0);
  const [busy, setBusy] = useState(false);

  const onError = (e: unknown) => {
    const code = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'server_error';
    toast.error(t(`errors.${code}`, { defaultValue: code }));
  };

  const applyRes = (res: BJRes) => {
    if (isFinished(res)) {
      if (res.hands) setHands(res.hands);
      if (res.values) setValues(res.values);
      setResults(res.results);
      setDealerCards(res.dealer);
      setDealerValue(res.dealerValue);
      setPayout(res.payout);
      setCanDouble(false);
      setCanSplit(false);
      setPhase('finished');
    } else {
      setSessionId(res.sessionId);
      setHands(res.hands);
      setDealerUp(res.dealerUp);
      setActiveHand(res.activeHand);
      setValues(res.values);
      setCanDouble(res.canDouble);
      setCanSplit(res.canSplit);
      setPhase('active');
    }
  };

  const deal = async () => {
    if (!user) return setAuthOpen(true);
    if (busy) return;
    setBusy(true);
    try {
      const res: BJRes = await games.blackjackDeal(bet);
      setResults(null);
      setDealerCards(null);
      setDealerValue(null);
      setPayout(0);
      applyRes(res);
      refresh();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const act = async (action: Action) => {
    if (phase !== 'active' || !sessionId || busy) return;
    setBusy(true);
    try {
      const res: BJRes = await games.blackjackAction(sessionId, action);
      const fin = isFinished(res);
      applyRes(res);
      if (fin) refresh();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const outcomeLabel = (o: Outcome): string => {
    switch (o) {
      case 'blackjack':
        return t('blackjack.blackjack');
      case 'won':
        return t('blackjack.youWin');
      case 'push':
        return t('common.push');
      case 'bust':
        return t('blackjack.bust');
      default:
        return t('common.lost');
    }
  };
  const outcomeColor = (o: Outcome): string =>
    o === 'blackjack' || o === 'won' ? 'text-felt' : o === 'push' ? 'text-gold' : 'text-danger';

  return (
    <GameLayout
      title={`♠ ${t('games.blackjack')}`}
      stage={
        <div className="flex h-full w-full flex-col items-center justify-center gap-6 rounded-lg bg-gradient-to-b from-felt/40 to-transparent p-4">
          <div className="flex flex-col items-center gap-2">
            <p className="dbet-label">
              {t('blackjack.dealer')}
              {phase === 'finished' && dealerValue != null ? ` · ${dealerValue}` : ''}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {phase === 'finished' && dealerCards ? (
                dealerCards.map((c, i) => <CardView key={i} card={c} />)
              ) : dealerUp ? (
                <>
                  <CardView card={dealerUp} />
                  <CardView faceDown />
                </>
              ) : (
                <>
                  <div className="h-[76px] w-14 rounded-lg border border-dashed border-line" />
                  <div className="h-[76px] w-14 rounded-lg border border-dashed border-line" />
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-end justify-center gap-4">
            {hands.length === 0 ? (
              <div className="flex gap-2">
                <div className="h-[76px] w-14 rounded-lg border border-dashed border-line" />
                <div className="h-[76px] w-14 rounded-lg border border-dashed border-line" />
              </div>
            ) : (
              hands.map((hand, hi) => (
                <div
                  key={hi}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-2 transition-colors ${
                    phase === 'active' && hi === activeHand ? 'border-gold shadow-goldglow' : 'border-transparent'
                  }`}
                >
                  <div className="flex flex-wrap justify-center gap-2">
                    {hand.map((c, ci) => (
                      <CardView key={ci} card={c} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="dbet-label">{t('blackjack.player')}</span>
                    <span className="tabular font-semibold text-ink">{values[hi] ?? ''}</span>
                    {phase === 'finished' && results?.[hi] && (
                      <span className={`font-semibold ${outcomeColor(results[hi].outcome)}`}>
                        {outcomeLabel(results[hi].outcome)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      }
      controls={
        <div className="flex flex-col gap-3">
          {phase !== 'active' ? (
            <>
              <BetAmount value={bet} onChange={setBet} disabled={busy} />
              <button className="dbet-btn-gold w-full text-lg" disabled={busy} onClick={deal}>
                {t('blackjack.deal')}
              </button>
              {phase === 'finished' && results && (
                <div className="space-y-1 text-sm">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className={outcomeColor(r.outcome)}>
                        {results.length > 1 ? `#${i + 1} · ` : ''}
                        {outcomeLabel(r.outcome)}
                      </span>
                      <Money cents={r.payout} />
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-line pt-1 font-semibold">
                    <span className="text-gold">{t('games.payout')}</span>
                    <Money cents={payout} className="text-gold" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button className="dbet-btn-ghost" disabled={busy} onClick={() => act('hit')}>
                  {t('blackjack.hit')}
                </button>
                <button className="dbet-btn-ghost" disabled={busy} onClick={() => act('stand')}>
                  {t('blackjack.stand')}
                </button>
              </div>
              {canDouble && (
                <button className="dbet-btn-gold" disabled={busy} onClick={() => act('double')}>
                  {t('blackjack.double')}
                </button>
              )}
              {canSplit && (
                <button className="dbet-btn-ghost" disabled={busy} onClick={() => act('split')}>
                  {t('blackjack.split')}
                </button>
              )}
            </>
          )}
        </div>
      }
      info={
        <div>
          <p className="dbet-label mb-1">{t('games.rules')}</p>
          <p className="text-xs">
            {t('blackjack.dealer')} · 17 · {t('blackjack.blackjack')} 3:2
          </p>
        </div>
      }
    />
  );
}
