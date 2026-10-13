import { Link } from "react-router-dom";
import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import UserContext from "../../../UserContext";
import MainButton from "../../MainButton";
import { clearTokens } from "../../../services/auth/authUtils";
import { me } from "../../../services/auth/auth";
import "react-loading-skeleton/dist/skeleton.css";
import { MdOutlineSell, MdOutlineAdminPanelSettings } from "react-icons/md";
import { BsHeartFill, BsListCheck, BsGraphUpArrow } from "react-icons/bs";
import { toast } from "react-toastify";
import { FaBars, FaGift } from 'react-icons/fa';
import RightContent from "./RightContent";
import { useTranslation } from "react-i18next";
import GiftTag from "../GiftTag";
import GamesMenu from "./GamesMenu";
import { NavLink } from "../gameLinks";
import useGiftReady from "../useGiftReady";
import i18n from "../../../i18n";

interface Navbar {
  openNotifications: boolean;
  setOpenNotifications: React.Dispatch<React.SetStateAction<boolean>>;
  openSidebar: boolean;
  setOpenSidebar: React.Dispatch<React.SetStateAction<boolean>>;
}

const Navbar: React.FC<Navbar> = ({ openNotifications, setOpenNotifications, openSidebar, setOpenSidebar }) => {
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const { isLogged, toggleLogin, toogleUserData, userData, openUserFlow, toogleUserFlow } = useContext(UserContext);
  const giftReady = useGiftReady();
  const { i18n: translator } = useTranslation();

  const linksRef = useRef<HTMLDivElement | null>(null);

  const handleHover = () => {
    setIsHovering(!isHovering);
  };

  const toggleUserFlow = () => {
    toogleUserFlow(!openUserFlow);
  }

  const toggleSidebar = () => {
    setOpenSidebar(!openSidebar);
  };

  const Logout = () => {
    clearTokens();
    toggleLogin(false);
    toogleUserData(null);
  };

  const getUserInfo = async () => {
    await me()
      .then((response: { data: any }) => {
        toogleUserData(response);
        setLoading(false);
      })
      .catch((error: any) => {
        // a 401 is already handled globally (session expired)
        if (error?.response?.status !== 401) {
          toast.error(i18n.t("header.pleaseLoginAgain"));
          Logout();
        }
        setLoading(false);
      });
  };


  // the games moved behind GamesMenu: ten of them across the bar stopped fitting in any
  // language. what stays here is everything that is not a game.
  const links: NavLink[] = [
    {
      name: i18n.t("nav.casino"),
      path: "/casino",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M21.41 11.41l-8.83-8.83c-.37-.37-.88-.58-1.41-.58H4c-1.1 0-2 .9-2 2v7.17c0 .53.21 1.04.59 1.41l8.83 8.83c.78.78 2.05.78 2.83 0l7.17-7.17c.78-.78.78-2.04-.01-2.83zM12.83 20L4 11.17V4h7.17L20 12.83 12.83 20z" />
        </svg>
      ),
    },
    {
      name: i18n.t("predictions.title"),
      path: "/predictions",
      icon: <BsGraphUpArrow className="text-2xl" />,
    },
    {
      name: i18n.t("nav.dailyGift"),
      path: "/gift",
      icon: <FaGift className="text-2xl" />,
      badge: giftReady ? <GiftTag /> : undefined,
    },
    // missions live on the caller's own profile, so there is nowhere to send a guest
    ...(userData?.id ? [{
      name: i18n.t("nav.missions"),
      path: `/profile/${userData.id}?tab=missions`,
      icon: <BsListCheck className="text-2xl" />,
    }] : []),
    // only admins see the backoffice; the api refuses everyone else anyway
    ...(userData?.isAdmin ? [{
      name: i18n.t("nav.backoffice"),
      path: "/backoffice",
      icon: <MdOutlineAdminPanelSettings className="text-2xl" />,
    }] : [])
  ];


  // the labelled row needs 1430px to 1890px depending on the language, so no css breakpoint
  // fits them all. a class hides the labels, keeping the measurement out of react's render.
  useLayoutEffect(() => {
    const row = linksRef.current;
    if (!row) return;
    const fit = () => {
      row.classList.remove("nav-icons-only");
      if (row.scrollWidth > row.clientWidth) row.classList.add("nav-icons-only");
    };
    fit();
    const done = document.fonts?.ready;
    if (done) done.then(fit).catch(() => undefined);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [links.length, translator.language, giftReady]);

  useEffect(() => {

    if (isLogged == true) {
      getUserInfo();
      toogleUserFlow(false);
    }
  }, [isLogged]);



  return (
    <div className="w-full flex justify-center">
      <nav className=" py-4 px-8 bg-surface-nav border-b border-line w-[calc(100vw-2rem)] max-w-[1920px] flex justify-center notched ">
        <div className="flex items-center justify-between w-full ">
          <div className="xl:hidden">
            <FaBars onClick={toggleSidebar} className="text-2xl cursor-pointer" />
          </div>
          <div className="hidden xl:flex min-w-0 flex-1 items-center">
            <Link to="/" className="shrink-0">
              <div
                className="flex items-center gap-2 "
                onMouseEnter={handleHover}
                onMouseLeave={handleHover}
              >
                <img
                  src="/images/troca/icone_bet_on_yourself.png"
                  alt={i18n.t("common.logo")}
                  className="w-12 h-12 object-contain rounded-full overflow-hidden"
                />
                <div className="hidden md:flex flex-col justify-center">
                  <div className="font-normal text-xl text-white">
                    {i18n.t("nav.kanicasino")}
                  </div>
                </div>
              </div>
            </Link>
            {
              <div
                ref={linksRef}
                className="flex min-w-0 flex-1 items-center gap-4 2xl:gap-6 ml-4 xl:ml-8"
              >
                <GamesMenu />
                {links.map((link, index) => (<Link
                  to={link.path}
                  key={index}
                  title={link.name}
                  className="flex shrink-0 items-center gap-2 font-normal text-xs 2xl:text-sm cursor-pointer "
                >
                  <span className="text-ink-soft hover:text-white transition-all ">
                    {link.icon}
                  </span>
                  <span className="nav-label whitespace-nowrap text-white hover:text-ink-soft transition-all ">
                    {link.name}
                  </span>
                  {link.badge}
                </Link>
                ))}
              </div>
            }
          </div>

          <div className="flex items-center gap-2">
            {isLogged === true ? (
              <RightContent loading={loading} userData={userData}
                openNotifications={openNotifications} setOpenNotifications={setOpenNotifications}
                Logout={Logout} />
            ) : (
              <div className="flex items-center gap-4">
                <MainButton
                  text={i18n.t("nav.signIn")}
                  onClick={toggleUserFlow} />
              </div>
            )}
          </div>

        </div>
      </nav>
    </div>
  );
};

export default Navbar;
