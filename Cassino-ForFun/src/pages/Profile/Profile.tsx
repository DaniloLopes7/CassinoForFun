import { useContext, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { getUser, getInventory } from "../../services/users/UserServices";
import { FiFilter } from 'react-icons/fi'
import UserInfo from "./UserInfo";
import FriendButton from "./FriendButton";
import Item from "../../components/Item";
import UserContext from "../../UserContext";
import Skeleton from "react-loading-skeleton";
import Filters from "../../components/InventoryFilters";
import Pagination from "../../components/Pagination";
import BalanceHistory from "./BalanceHistory";
import CollectionsPanel from "../Collections/CollectionsPanel";
import MissionsPanel from "../Missions/MissionsPanel";
import AffiliatesPanel from "../Affiliates/AffiliatesPanel";
import { resolveTab, Tab } from "./tabs";
import PredictionsPanel from "./PredictionsPanel";
import EmailSettings from "./EmailSettings";
import { User } from '../../components/Types'
import i18n from "../../i18n";

interface Inventory {
  totalPages: number;
  currentPage: number;
  items: any[];
}

// tabs that show a "NEW!" badge until the owner opens them for the first time
const NEW_TABS = ["collections", "missions", "affiliates"];

const Profile = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState<User>();
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingInventory, setLoadingInventory] = useState<boolean>(true);
  const [inventory, setInventory] = useState<Inventory>();
  const [invItems, setInvItems] = useState<any[]>([]);
  const { userData } = useContext(UserContext);
  const [isSameUser, setIsSameUser] = useState<boolean>(false);
  const [refresh, setRefresh] = useState<boolean>(false);
  // pinning an item or picking a badge changes the user, never the inventory, so they
  // get their own signal instead of pulling the whole grid down with them
  const [userRefresh, setUserRefresh] = useState<number>(0);
  const refreshUser = () => setUserRefresh((v) => v + 1);
  const [openFilters, setOpenFilters] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const activeTab = resolveTab(searchParams.get("tab"), isSameUser);
  const [seenTabs, setSeenTabs] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    name: '',
    rarity: '',
    sortBy: 'newer',
    order: 'asc',
  });
  const delayDebounceFn = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  // the url param may be a slug, so anything that speaks to the api by id waits for the
  // resolved one off the loaded profile
  const resolvedId = (user as any)?._id as string | undefined;
  const canonical = (user as any)?.slug as string | undefined;
  const profileId = resolvedId ?? id;
  // an id link still resolves, but the address bar becomes the slug once the profile is
  // known, so whatever a player copies from here carries their name
  const sameProfile = Boolean(user) && (id === canonical || id === resolvedId);

  useEffect(() => {
    if (invItems?.length > 0) {
      delayDebounceFn.current = setTimeout(() => {
        getInventoryInfo();
      }, 1000);
      return () => {
        if (delayDebounceFn.current) {
          clearTimeout(delayDebounceFn.current);
        }
      };
    }
  }, [filters]);


  const getUserInfo = async () => {
    try {
      const response = await getUser(id as string);
      setUser(response);
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };

  const getInventoryInfo = async (newPage?: boolean) => {
    setLoadingInventory(true);
    try {
      const response = await getInventory(
        resolvedId as string,
        page,
        { ...filters, grouped: true }
      );
      setInventory(response);
      newPage
        ? setInvItems((prev) => [...prev, ...response.items])
        : setInvItems(response.items);
    } catch (error) {
      console.log(error);
    }
    setLoadingInventory(false);
  };

  const handleEnterPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Cancel the debounce
      clearTimeout(delayDebounceFn.current as NodeJS.Timeout);
      // Fetch the inventory immediately
      getInventoryInfo();
    }
  };

  useEffect(() => {
    setIsSameUser(Boolean(userData?.id) && userData.id == profileId);
  }, [profileId, userData]);

  useEffect(() => {
    if (refresh) {
      getUserInfo();
      getInventoryInfo();
      setRefresh(false);
    }
  }, [refresh]);

  useEffect(() => {
    if (userRefresh) getUserInfo();
  }, [userRefresh]);

  useEffect(() => {
    if (!canonical || !id || id === canonical) return;
    const query = searchParams.toString();
    navigate(`/profile/${canonical}${query ? `?${query}` : ""}`, { replace: true });
  }, [canonical, id]);

  useEffect(() => {
    // the param turning from an id into the slug is the same profile, so nothing reloads
    if (sameProfile) return;
    setInvItems([]);
    setPage(1);
    getUserInfo();
  }, [id]);

  // load which "new" tabs this user has already opened (per user, per browser)
  useEffect(() => {
    if (!userData?.id) return;
    try {
      setSeenTabs(JSON.parse(localStorage.getItem(`kani.tabSeen.${userData.id}`) || "[]"));
    } catch {
      setSeenTabs([]);
    }
  }, [userData?.id]);

  // opening a new tab (by click or deep-link) clears its badge for good
  useEffect(() => {
    if (!userData?.id || !isSameUser) return;
    if (!NEW_TABS.includes(activeTab) || seenTabs.includes(activeTab)) return;
    const next = [...seenTabs, activeTab];
    setSeenTabs(next);
    localStorage.setItem(`kani.tabSeen.${userData.id}`, JSON.stringify(next));
  }, [activeTab, isSameUser, userData?.id, seenTabs]);

  // keyed on the resolved id, so the canonical swap never costs a second aggregation
  useEffect(() => {
    if (!resolvedId) return;
    getInventoryInfo();
  }, [page, resolvedId]);


  const tabs: { key: Tab; label: string }[] = [
    ...(isSameUser
      ? [
          { key: "missions" as const, label: i18n.t("profile.missions") },
          { key: "affiliates" as const, label: i18n.t("profile.affiliates") },
          { key: "predictions" as const, label: i18n.t("predictions.myPositions") },
          { key: "history" as const, label: i18n.t("profile.balanceHistory") },
          { key: "settings" as const, label: i18n.t("settings.title") },
        ]
      : []),
  ];

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-screen bg-[#0e0e0f] py-12 px-4">
      <div className="flex flex-col max-w-[1200px] w-full gap-12">

        {/* Profile Header Card */}
        <div className="relative w-full bg-[#050505]/50 rounded-3xl p-8 border border-white/5 shadow-2xl backdrop-blur-sm">
          {loading ? (
            <div className="flex items-center justify-start pb-7">
              <Skeleton
                circle={true}
                height={144}
                width={144}
                highlightColor="#050505"
                baseColor="#050505"
              />
            </div>
          ) : (
            user && (
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                <UserInfo
                  user={user}
                  isSameUser={isSameUser}
                  setRefresh={refreshUser}
                />
                <div className="flex items-center justify-center">
                  <FriendButton profileId={profileId as string} isSameUser={isSameUser} />
                </div>
              </div>
            )
          )}
        </div>

        {/* Navigation Dock */}
        <div className="flex justify-center w-full">
          <div className="inline-flex p-1.5 bg-[#050505] rounded-2xl border border-white/5 shadow-inner gap-3">
            {tabs.map((t) => {
              const active = activeTab === t.key;
              const isNew =
                isSameUser && NEW_TABS.includes(t.key) && !seenTabs.includes(t.key);
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    if (activeTab === t.key) return;
                    setSearchParams({ tab: t.key }, { replace: true });
                  }}
                  className={`relative px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
                    active
                      ? "bg-accent-gold text-black shadow-lg shadow-accent-gold/20 scale-105"
                      : "text-[#84819a] hover:text-white hover:bg-surface-raised/5"
                  }`}
                >
                  {t.label}
                  {isNew && (
                    <span className="absolute -top-1 -right-1 flex items-center rounded-full bg-accent-gold px-1.5 py-0.5 text-[9px] font-extrabold uppercase leading-none text-black shadow animate-pulse">
                      {i18n.t("profile.new")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Stage */}
        <div className="w-full min-h-[400px] bg-[#050505]/30 rounded-3xl p-6 md:p-10 border border-white/5 backdrop-blur-sm transition-all duration-500">
          {activeTab === "history" ? (
            <BalanceHistory />
          ) : activeTab === "missions" ? (
            <MissionsPanel userId={profileId as string} isOwner={isSameUser} />
          ) : activeTab === "affiliates" ? (
            <AffiliatesPanel isOwner={isSameUser} />
          ) : activeTab === "predictions" ? (
            <PredictionsPanel />
          ) : activeTab === "settings" ? (
            <EmailSettings />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Profile;
