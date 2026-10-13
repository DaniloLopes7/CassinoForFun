import { useState, useEffect, useMemo } from "react";
import CaseListing from "./CaseListing";
import CategoryBar from "./CategoryBar";
import GameListing from "./GamesListing";
import Leaderboard from "./Leaderboard";
import DiscordWidget from "./DiscordWidget";
import { groupCasesByCategory } from "./groupCases";
import {
  getCases,
} from "../../services/cases/CaseServices";
import { toast } from "react-toastify";
import i18n from "../../i18n";

// its own namespace, so a category literally called "Most Opened" cannot take the anchor
const TOP_CASES_ID = "top-cases";

const Home = () => {
  const [cases, setCases] = useState<any>();
  const [loading, setLoading] = useState<boolean>(true);

  const getNewCases = async () => {
    setLoading(true);
    try {
      const response = await getCases();
      setCases(response);
    } catch {
      setCases([]);
      toast.error(i18n.t("home.errorWhileConnectingTo"));
    }
    setLoading(false);
  };

  useEffect(() => {
    getNewCases();
  }, []);

  const groups = useMemo(() => (loading ? [] : groupCasesByCategory(cases?.filter(c => c.category !== "Touhou" && c.category !== "Most Opened" && c.category !== "Mais Abertas"))), [cases, loading]);

  const sections = useMemo(
    () => [
      ...groups.map((group) => ({ id: group.id, label: group.category })),
    ],
    [groups]
  );

  return (
    <div className="w-full flex justify-center">
      <div className=" flex-col w-full max-w-[1920px] ">
        <div className="w-full flex justify-center mb-8">
          <img
            src="/images/troca/d2ef1692-5031-4ec7-93b7-9e22b1e61532.png"
            alt="Home Banner"
            className="w-full h-64 md:h-80 shadow-2xl object-cover overflow-hidden"
          />
        </div>
        <CategoryBar sections={sections} loading={loading} />

        <GameListing name={i18n.t("home.ourGames")} />

        <Leaderboard aside={<DiscordWidget />} />

        {loading ? (
          <CaseListing name="Cases" loading cases={[]} />
        ) : (
          groups.map((group) => (
            <CaseListing
              key={group.category}
              name={`${group.category} Cases`}
              cases={group.cases}
              sectionId={group.id}
              collapsible
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Home;
