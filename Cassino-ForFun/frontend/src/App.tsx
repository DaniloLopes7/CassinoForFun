import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import AuthModal from './components/layout/AuthModal';
import Onboarding from './components/layout/Onboarding';
import ChatPanel from './components/chat/ChatPanel';
import { getSocket } from './services/socket';
import { useUser } from './context/UserContext';
import { useTranslation } from 'react-i18next';

import Home from './pages/Home';
import Crash from './pages/Crash';
import Coinflip from './pages/Coinflip';
import Slots from './pages/Slots';
import Dice from './pages/Dice';
import Plinko from './pages/Plinko';
import Blackjack from './pages/Blackjack';
import Mines from './pages/Mines';
import Hilo from './pages/Hilo';
import Sports from './pages/Sports';
import SportsEvent from './pages/SportsEvent';
import Leaderboard from './pages/Leaderboard';
import Gifts from './pages/Gifts';
import Missions from './pages/Missions';
import Profile from './pages/Profile';
import Fair from './pages/Fair';
import Backoffice from './pages/Backoffice';
import MyBets from './pages/MyBets';

export default function App() {
  const { user, applySocketUpdate } = useUser();
  const { t } = useTranslation();

  useEffect(() => {
    const s = getSocket();
    const onUpdate = (u: any) => applySocketUpdate(u);
    s.on('user:update', onUpdate);
    return () => {
      s.off('user:update', onUpdate);
    };
  }, [applySocketUpdate]);

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/crash" element={<Crash />} />
          <Route path="/coinflip" element={<Coinflip />} />
          <Route path="/slots" element={<Slots />} />
          <Route path="/dice" element={<Dice />} />
          <Route path="/plinko" element={<Plinko />} />
          <Route path="/blackjack" element={<Blackjack />} />
          <Route path="/mines" element={<Mines />} />
          <Route path="/hilo" element={<Hilo />} />
          <Route path="/sports" element={<Sports />} />
          <Route path="/sports/:id" element={<SportsEvent />} />
          <Route path="/sports/bets" element={<MyBets />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/gifts" element={<Gifts />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/fair" element={<Fair />} />
          {user?.role === 'admin' && <Route path="/backoffice" element={<Backoffice />} />}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <footer className="border-t border-line py-6 text-center text-xs text-ink-faint">
        <p className="font-display text-gold">DBET</p>
        <p className="mt-1">{t('legalNotice')}</p>
      </footer>
      <AuthModal />
      <Onboarding />
      <ChatPanel />
    </div>
  );
}
