import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import GameLayout from '../components/game/GameLayout';
import BetAmount from '../components/game/BetAmount';
import Money from '../components/Money';
import { getSocket } from '../services/socket';
import { useUser } from '../context/UserContext';

interface Lobby {
  id: string;
  username: string;
  bet: number;
  side: 'heads' | 'tails';
  createdAt: string;
}
interface FlipResult {
  lobbyId: string;
  flip: 'heads' | 'tails';
  winner: { id: string; username: string };
  loser: { id: string; username: string };
  bet: number;
  payout: number;
}

export default function Coinflip() {
  const { t } = useTranslation();
  const { user, setAuthOpen, refresh } = useUser();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [bet, setBet] = useState(500);
  const [side, setSide] = useState<'heads' | 'tails'>('heads');
  const [flipping, setFlipping] = useState<FlipResult | null>(null);

  useEffect(() => {
    const s = getSocket();
    const onLobbies = (l: Lobby[]) => setLobbies(l);
    const onResult = (r: FlipResult) => {
      setFlipping(r);
      setTimeout(() => setFlipping(null), 2600);
      if (user && (r.winner.id === user.id || r.loser.id === user.id)) {
        if (r.winner.id === user.id) toast.success(`🪙 ${t('common.won')} `);
        refresh();
      }
    };
    const onErr = (e: { scope: string; error: string }) => {
      if (e.scope === 'coinflip') toast.error(t(`errors.${e.error}`, { defaultValue: e.error }));
    };
    s.on('coinflip:lobbies', onLobbies);
    s.on('coinflip:result', onResult);
    s.on('actionError', onErr);
    return () => {
      s.off('coinflip:lobbies', onLobbies);
      s.off('coinflip:result', onResult);
      s.off('actionError', onErr);
    };
  }, [user, t, refresh]);

  function create() {
    if (!user) return setAuthOpen(true);
    getSocket().emit('coinflip:create', { amount: bet, side });
  }
  function join(lobbyId: string) {
    if (!user) return setAuthOpen(true);
    getSocket().emit('coinflip:join', { lobbyId });
  }

  return (
    <GameLayout
      title={`🪙 ${t('games.coinflip')}`}
      stage={
        <div className="flex w-full flex-col items-center gap-6">
          {/* Moeda animada */}
          <motion.div
            key={flipping?.lobbyId || 'idle'}
            animate={flipping ? { rotateX: [0, 720, 1080] } : {}}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-gold-dim bg-gradient-to-br from-gold-bright to-gold-dim font-display text-5xl text-base shadow-goldglow"
          >
            {flipping ? (flipping.flip === 'heads' ? '👑' : '⚡') : 'D'}
          </motion.div>
          {flipping && (
            <div className="text-center animate-pop">
              <p className="font-display text-2xl text-gold">
                {flipping.flip === 'heads' ? t('coinflip.heads') : t('coinflip.tails')}
              </p>
              <p className="text-sm text-ink-muted">
                {t('coinflip.winner')}: <span className="text-felt font-semibold">{flipping.winner.username}</span> (
                <Money cents={flipping.payout} />)
              </p>
            </div>
          )}
          {!flipping && <p className="max-w-xs text-center text-sm text-ink-muted">{t('coinflip.howItWorks')}</p>}
        </div>
      }
      controls={
        <div className="flex flex-col gap-3">
          <BetAmount value={bet} onChange={setBet} />
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`min-h-[44px] rounded-lg border font-semibold ${side === 'heads' ? 'border-gold bg-gold/10 text-gold' : 'border-line bg-surface text-ink-muted'}`}
              onClick={() => setSide('heads')}
            >
              👑 {t('coinflip.heads')}
            </button>
            <button
              className={`min-h-[44px] rounded-lg border font-semibold ${side === 'tails' ? 'border-gold bg-gold/10 text-gold' : 'border-line bg-surface text-ink-muted'}`}
              onClick={() => setSide('tails')}
            >
              ⚡ {t('coinflip.tails')}
            </button>
          </div>
          <button className="dbet-btn-gold w-full" onClick={create}>
            {t('coinflip.create')} — <Money cents={bet} />
          </button>
        </div>
      }
      info={
        <div>
          <p className="dbet-label mb-2">{t('coinflip.openFlips')}</p>
          <div className="space-y-2">
            {lobbies.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg bg-base p-2 text-sm">
                <div>
                  <span className="font-semibold">{l.username}</span>{' '}
                  <span className="text-ink-muted">{l.side === 'heads' ? `👑 ${t('coinflip.heads')}` : `⚡ ${t('coinflip.tails')}`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Money cents={l.bet} className="text-gold" />
                  {l.username === user?.username ? (
                    <button
                      className="dbet-btn-ghost px-2 py-1 text-xs"
                      onClick={() => getSocket().emit('coinflip:cancel', { lobbyId: l.id })}
                    >
                      ✕
                    </button>
                  ) : (
                    <button className="dbet-btn-gold px-3 py-1 text-xs" onClick={() => join(l.id)}>
                      {t('coinflip.join')}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {lobbies.length === 0 && <p className="text-xs text-ink-faint">{t('chat.empty')}</p>}
          </div>
        </div>
      }
    />
  );
}
