import React, { useEffect, useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import i18n from "../../i18n";
import api from "../../services/api";
import UserContext from "../../UserContext";

interface Game {
  id: number;
  name: string;
  title: string;
  provider: string;
  thumbnail: string;
  game_type: string;
}

interface ExternalGame {
  id: string;
  title: string;
  provider: string;
  thumbnail: string;
  url: string;
  gameId?: number; // Added to support direct demo launching
}

const EXTERNAL_GAMES: ExternalGame[] = [
  { id: 'amus-1', title: 'Italian Roulette', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/italian-roulette', gameId: 38 },
  { id: 'amus-2', title: 'Maxima Roulette 4444x', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/maxima-roulette-4444x', gameId: 39 },
  { id: 'amus-3', title: 'Jungle Trail Roulette 2000x', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/jungle-trail-roulette-2000x', gameId: 40 },
  { id: 'amus-4', title: 'VIP Live Roulette', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/vip-live-roulette', gameId: 41 },
  { id: 'amus-5', title: 'Greek Roulette 500x', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/greek-roulette-500x', gameId: 42 },
  { id: 'amus-6', title: 'VIP Saray Rulet', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/vip-saray-rulet', gameId: 43 },
  { id: 'amus-7', title: 'Eye of Ra Roulette 2000x', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/eye-of-ra-roulette-2000x', gameId: 44 },
  { id: 'amus-8', title: 'Showtime Roulette 500x', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/showtime-roulette-500x', gameId: 45 },
  { id: 'amus-9', title: 'Live Roulette - Russian', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/live-roulette-russian', gameId: 46 },
  { id: 'amus-10', title: 'Live Roulette - Bulgarian', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/live-roulette-bulgarian', gameId: 47 },
  { id: 'amus-11', title: 'Live Speed Roulette', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/live-speed-roulette', gameId: 48 },
  { id: 'amus-12', title: 'Live European Roulette', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/live-european-roulette', gameId: 49 },
  { id: 'amus-13', title: 'Live Altın Rulet', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/live-altin-rulet', gameId: 50 },
  { id: 'amus-14', title: 'Dynamic European Roulette', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/dynamic-european-roulette', gameId: 51 },
  { id: 'amus-15', title: 'Onyx Auto Roulette', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/onyx-auto-roulette', gameId: 52 },
  { id: 'amus-16', title: 'Dynamic Roulette 120x', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/dynamic-roulette-120x', gameId: 53 },
  { id: 'amus-17', title: 'Vegas Roulette 500x', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/vegas-roulette-500x', gameId: 38 },
  { id: 'amus-18', title: 'Winbet 500x Roulette', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/winbet-500x-roulette', gameId: 54 },
  { id: 'amus-19', title: 'European Roulette', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/european-roulette', gameId: 55 },
  { id: 'amus-20', title: 'Virtual Maxima Roulette 4444x', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/virtual-maxima-roulette-4444x', gameId: 56 },
  { id: 'amus-21', title: 'Virtual European Roulette', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/virtual-european-roulette', gameId: 57 },
  { id: 'amus-22', title: 'Virtual Eye of Ra Roulette 2000x', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/virtual-eye-of-ra-roulette-2000x', gameId: 58 },
  { id: 'amus-23', title: 'Golden Goal Roulette', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/golden-goal-roulette', gameId: 59 },
  { id: 'amus-24', title: 'Virtual Vegas Roulette', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/virtual-vegas-roulette', gameId: 60 },
  { id: 'amus-25', title: 'Virtual Space Roulette', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/virtual-space-roulette', gameId: 61 },
  { id: 'amus-26', title: 'Virtual Monaco Roulette', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/virtual-monaco-roulette', gameId: 62 },
  { id: 'amus-27', title: 'Virtual Roulette', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1718690966056-4288c4b3809c?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/virtual-roulette', gameId: 63 },
  { id: 'amus-28', title: 'Vegas Gobbler LIVE', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1771775606147?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/online-casino/vegas-gobbler-live', gameId: 64 },
  { id: 'amus-29', title: 'Candy Wheel', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1573788583000-fbe789b37b79?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/online-casino/candy-wheel', gameId: 65 },
  { id: 'amus-30', title: 'Speed Baccarat', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1740593101508-49ef3d3be814?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/live-casino/speed-baccarat', gameId: 66 },
  { id: 'amus-31', title: 'Extra Crown Deluxe Live', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1771775606147?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/online-casino/extra-crown-deluxe-live', gameId: 67 },
  { id: 'amus-32', title: 'Football Thrill', provider: 'Amusnet', thumbnail: 'https://images.unsplash.com/photo-1573788583000-fbe789b37b79?auto=format&fit=crop&w=600&q=80', url: 'https://demo.amusnet.com/games/online-casino/football-thrill', gameId: 68 },
];

const openGamePopup = (url: string) => {
  const width = 1280;
  const height = 720;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;

  window.open(
    url,
    'CasinoGame',
    `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`
  );
};

const BigBangLobby: React.FC = () => {
  const { isLogged, userData } = useContext(UserContext);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const { data } = await api.get("/api/bigbang/games");
        if (data.success) {
          setGames(data.data);
        }
      } catch (e) {
        console.error("Failed to fetch BigBang games:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, []);

const launchGame = async (game: Game | ExternalGame) => {
    try {
      let gameUrl = "";

      if ('url' in game) {
        const externalGame = game as ExternalGame;
        // For Amusnet external games, we use the direct URL to bypass backend token issues
        // that were redirecting to the home page.
        gameUrl = externalGame.url;
      } else {
        const payload = isLogged && userData
          ? { game_id: game.id, user_token: userData.username, demo: false }
          : { game_id: game.id, demo: true };

        const { data } = await api.post("/api/bigbang/launch", payload);
        if (data && data.success) {
          gameUrl = data.game_url;
        }
      }

      if (gameUrl) {
        openGamePopup(gameUrl);
      }
    } catch (e) {
      console.error("Failed to launch game:", e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050505] text-white">
        <span className="text-xl font-semibold animate-pulse">Loading Casino...</span>
      </div>
    );
  }

  const allGames = [
    ...games.map(g => ({ ...g, isExternal: false })),
    ...EXTERNAL_GAMES.map(g => ({ ...g, isExternal: true }))
  ];

  return (
    <div
      className="min-h-screen bg-[#050505] text-white p-6 flex flex-col items-center justify-start overflow-x-hidden"
      style={{ marginLeft: 'calc(-1 * var(--chat-shift, 0px))', width: 'calc(100% + var(--chat-shift, 0px))' } as any}
    >
      <div className="w-full flex flex-col items-center">
        <header className="mb-16 text-center w-full">
          <h1 className="text-5xl font-extrabold text-accent-gold mb-4 tracking-tight">
            BigBang <span className="text-white">Casino</span>
          </h1>
          <p className="text-ink-muted text-lg max-w-2xl mx-auto">
            Explore 6,000+ premium games from world-class providers. The ultimate gaming experience awaits.
          </p>
        </header>

        <div className="flex flex-wrap justify-center gap-6 w-full max-w-screen-2xl">
          {allGames.map((game, index) => (
            <motion.div
              key={(game as any).id + index}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => launchGame(game as any)}
              className="relative group cursor-pointer rounded-2xl overflow-hidden bg-surface-nav border border-line hover:border-accent-gold transition-all duration-300 shadow-lg hover:shadow-accent-gold/10 w-[180px] sm:w-[200px] md:w-[220px] shrink-0"
            >
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src={(game as any).thumbnail || "/images/placeholder-game.png"}
                  alt={(game as any).title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                <span className="text-sm font-bold text-white truncate leading-tight mb-1">{(game as any).title}</span>
                <span className="text-[10px] text-ink-muted truncate uppercase tracking-wider">{(game as any).provider}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BigBangLobby;
