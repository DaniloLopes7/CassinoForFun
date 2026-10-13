import { Route, Routes, Navigate } from "react-router-dom";
import Home from "./pages/Home/Home";
import Profile from "./pages/Profile/Profile";
import CasePage from "./pages/CasePage/CasePage";
import CoinFlip from "./pages/Coin/CoinFlip";
import CrashGame from "./pages/Crash/Crash";
import Upgrade from "./pages/Upgrade/Upgrade";
import Slot from "./pages/Slot/Slot";
import Plinko from "./pages/Plinko";
import Blackjack from "./pages/Blackjack";
import Dice from "./pages/Dice";
import Mines from "./pages/Mines";
import Hilo from "./pages/Hilo";
import BigBangLobby from "./pages/BigBang/BigBangLobby";
import PrivacyPolicy from "./pages/About/PrivacyPolicy"
import Terms from "./pages/About/Terms"
import Unsubscribe from "./pages/About/Unsubscribe"
import Gift from "./pages/Gift"
import Battles from "./pages/Battles/Battles";
import BattleRoom from "./pages/Battles/BattleRoom";
import ProvablyFair from "./pages/ProvablyFair";
import ReferralRedirect from "./pages/Affiliates/ReferralRedirect";
import Backoffice from "./pages/Backoffice/Backoffice";
import Predictions from "./pages/Predictions/Predictions";
import PredictionMarket from "./pages/Predictions/Market";

const defaultRoutes = (
  <>
    <Route path="/" element={<Home />} />
    <Route path="/profile/:id" element={<Profile />} />
    <Route path="/case/:id" element={<CasePage />} />
    <Route path="/coinflip" element={<CoinFlip />} />
    <Route path="/crash" element={<CrashGame />} />
    <Route path="/upgrade" element={<Upgrade />} />
    <Route path="/slot" element={<Slot />} />
    <Route path="/plinko" element={<Plinko />} />
    <Route path="/blackjack" element={<Blackjack />} />
    <Route path="/dice" element={<Dice />} />
    <Route path="/mines" element={<Mines />} />
    <Route path="/hilo" element={<Hilo />} />
    <Route path="/casino" element={<BigBangLobby />} />
    <Route path="/battles" element={<Battles />} />
    <Route path="/battles/:id" element={<BattleRoom />} />
    <Route path="/predictions" element={<Predictions />} />
    <Route path="/predictions/:slug" element={<PredictionMarket />} />
    <Route path="/provably-fair" element={<ProvablyFair />} />
    <Route path="/r/:code" element={<ReferralRedirect />} />
    <Route path="/backoffice" element={<Backoffice />} />
    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
    <Route path="/terms" element={<Terms />} />
    <Route path="/unsubscribe" element={<Unsubscribe />} />
    <Route path="/gift" element={<Gift />} />
  </>
);

const AppRoutes = () => {
  return (
    <Routes>
      {defaultRoutes}
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default AppRoutes;
