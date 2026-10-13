import { FaCrown } from "react-icons/fa";
import { RotatingLines } from "react-loader-spinner";
import Monetary from "../../../components/Monetary";
import Avatar from "../../../components/Avatar";
import BattleReel from "../../../components/battle/BattleReel";
import TieBreaker from "../../../components/battle/TieBreaker";
import { BattleRoomViewProps } from "./BattleRoom.types";
import i18n from "../../../i18n";

const BattleRoomView: React.FC<BattleRoomViewProps> = ({
  loading,
  notFound,
  mode,
  bakaMode,
  casesCount,
  entryCost,
  displayRound,
  windowHeight,
  reelDurationMs,
  activeCaseRef,
  caseQueue,
  columns,
  banner,
  tie,
  tieDurationMs,
  myResult,
  showCopyLink,
  onCopyLink,
  onBack,
  showStart,
  startDisabled,
  startLoading,
  startLabel,
  showLeave,
  leaveLabel,
  showWaitingForHost,
  waitingForHostLabel,
  showCancelled,
  showBack,
  onStart,
  onLeave,
}) => {
  if (loading)
    return <div className="w-full py-16 text-center">{i18n.t("battles.loadingBattle")}</div>;
  if (notFound)
    return <div className="w-full py-16 text-center">{i18n.t("battles.battleNotFound")}</div>;

  return (
    <div className="w-full flex flex-col items-center py-6 gap-5 px-4">
      <div className="w-full max-w-[1200px] flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm text-[#84819a] hover:text-white"
        >
          ‹ Back to battles
        </button>
        <span className="font-bold">
          {mode}
          {bakaMode ? " · baka mode" : ""}
        </span>
        {showCopyLink ? (
          <button
            onClick={onCopyLink}
            className="text-sm text-[#84819a] hover:text-white"
          >
            {i18n.t("battles.copyLink")}
          </button>
        ) : (
          <span className="w-24" />
        )}
      </div>

      <div className="w-full max-w-[1200px] flex items-stretch gap-3 rounded-xl bg-[#050505] p-3">
        <div className="flex flex-col justify-center px-2">
          <span className="text-[10px] text-[#84819a] tracking-wider">
            {i18n.t("battles.round")}
          </span>
          <span className="font-bold text-lg whitespace-nowrap">
            {displayRound}{" "}
            <span className="text-[#84819a] text-sm">of {casesCount}</span>
          </span>
        </div>
        <div className="flex-1 overflow-x-auto">
          <div className="flex items-center gap-2 w-max mx-auto">
            {caseQueue.map((c) => (
              <div
                key={c.key}
                ref={c.active ? activeCaseRef : undefined}
                className={`flex-shrink-0 rounded-lg p-1 border-2 transition-all ${
                  c.active
                    ? "border-indigo-500 bg-[#050505]"
                    : "border-transparent"
                }`}
              >
                {c.image ? (
                  <img
                    src={c.image}
                    alt={c.title}
                    className={`w-12 h-12 object-contain transition-opacity ${
                      c.revealed ? "opacity-100" : "opacity-40"
                    }`}
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-[#050505]" />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-center px-2 items-end">
          <span className="text-[10px] text-[#84819a] tracking-wider">
            {i18n.t("battles.totalCost")}
          </span>
          <span className="font-bold text-lg text-green-400 whitespace-nowrap">
            <Monetary value={entryCost} showFraction />
          </span>
        </div>
      </div>

      {tie && (
        <div className="w-full max-w-[1200px] flex flex-col items-center gap-2 animate-fade-in">
          <span className="text-secondary-light font-bold text-lg">
            {i18n.t("battles.itSATie")}
          </span>
          <TieBreaker
            players={tie.players}
            winner={tie.winner}
            durationMs={tieDurationMs}
          />
        </div>
      )}

      {myResult && myResult != "won" && (
        <div
          className={`w-full max-w-[1200px] rounded-xl border py-3 text-center animate-fade-in bg-accent-ruby/10 border-red-500/30`}
        >
          <span className={`font-bold text-secondary-light`}>
            {i18n.t("battles.youLostThisBattle")}
          </span>
        </div>
      )}

      {banner && (
        <div className="w-full max-w-[1200px] rounded-xl bg-gradient-to-r from-yellow-500/20 via-yellow-400/10 to-yellow-500/20 border border-yellow-400/40 py-4 flex flex-col items-center gap-1 animate-fade-in">
          <span className="text-secondary-light font-bold text-lg flex items-center gap-2">
            <FaCrown /> {banner.winnerNames} win{banner.teamSize > 1 ? "" : "s"}{" "}
            the battle
          </span>
          <span className="text-xl font-extrabold flex items-center gap-1">
            {banner.perItemEach
              ? i18n.t(banner.totalItems === 1 ? "battles.splitItems" : "battles.splitItemsPlural", { count: banner.totalItems, players: banner.teamSize })
              : i18n.t(banner.totalItems === 1 ? "battles.takesAll" : "battles.takesAllPlural", { count: banner.totalItems })}
          </span>
          <span className="text-sm text-[#0A0A0A] flex items-center gap-1">
            worth <Monetary value={banner.value} showFraction />
            {banner.perItemEach ? " of items each" : " in unboxed items"}
          </span>
          <span className="text-xs text-[#84819a]">{banner.bakaHint}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-4 justify-center w-full max-w-[1200px]">
        {columns.map((col) =>
          !col.player ? (
            <div
              key={col.key}
              className="flex flex-col items-center justify-center gap-3 rounded-xl p-3 w-[280px] bg-[#050505] border-2 border-transparent text-[#84819a]"
              style={{ minHeight: windowHeight + 120 }}
            >
              <span>{i18n.t("battles.waitingForPlayer")}</span>
              {col.canJoin && (
                <button
                  onClick={col.onJoin}
                  className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
                >
                  {i18n.t("battles.join")}
                </button>
              )}
              {col.canAddBot && (
                <button
                  onClick={col.onAddBot}
                  className="px-3 py-1 rounded bg-[#0A0A0A] hover:bg-[#3a2c5c] text-white text-sm"
                >
                  {i18n.t("battles.addBot")}
                </button>
              )}
            </div>
          ) : (
            <div
              key={col.key}
              className={`flex flex-col gap-3 rounded-xl p-3 w-[280px] border-2 transition-all ${
                col.isWinner
                  ? "border-yellow-400 bg-secondary/5"
                  : "border-transparent bg-[#050505]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar
                    image={col.player.profilePicture}
                    id={col.player.userId || ""}
                    size="small"
                    level={0}
                  />
                  <span className="font-bold text-sm truncate">
                    {col.player.username}
                  </span>
                  {col.player.isBot && (
                    <span className="text-[10px] bg-[#050505] px-1 rounded">
                      {i18n.t("battles.bot")}
                    </span>
                  )}
                  {col.teamTag && (
                    <span className="text-[10px] bg-[#0A0A0A] text-[#a9a6c9] px-1 rounded">
                      {col.teamTag}
                    </span>
                  )}
                </div>
                {col.showTotal && (
                  <span
                    className="font-bold text-green-400 flex items-center gap-1 text-sm whitespace-nowrap"
                    title={i18n.t("battles.valueOfItemsUnboxed")}
                  >
                    <Monetary value={col.total} showFraction />
                  </span>
                )}
              </div>

              {col.reel.kind === "spin" ? (
                <BattleReel
                  key={col.reel.spinKey}
                  pool={col.reel.pool}
                  winner={col.reel.winner}
                  durationMs={reelDurationMs}
                />
              ) : col.reel.kind === "settled" ? (
                <div
                  className="relative w-full flex flex-col items-center justify-center rounded-lg bg-[#050505] animate-fade-in"
                  style={{ height: windowHeight }}
                >
                  <img
                    src={col.reel.item.image}
                    alt={col.reel.item.name}
                    className="h-32 w-32 object-contain"
                    style={{ borderBottom: `4px solid ${col.reel.color}` }}
                  />
                  <span className="text-xs text-center px-2 truncate max-w-full mt-1">
                    {col.reel.item.name}
                  </span>
                  <span
                    className="mt-1 font-bold text-sm"
                    style={{ color: col.reel.color }}
                  >
                    <Monetary
                      value={col.reel.item.baseValue || 0}
                      showFraction
                    />
                  </span>
                </div>
              ) : (
                <div
                  className="w-full flex items-center justify-center rounded-lg bg-[#050505]"
                  style={{ height: windowHeight }}
                >
                  {col.reel.image ? (
                    <img
                      src={col.reel.image}
                      alt={col.reel.title}
                      className="h-32 w-32 object-contain opacity-70"
                    />
                  ) : (
                    <span className="text-[#84819a] text-sm">{i18n.t("battles.ready")}</span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 justify-center">
                {col.wonItems.map((w, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center bg-[#050505] rounded p-1 w-[52px]"
                  >
                    <img
                      src={w.item.image}
                      alt={w.item.name}
                      className="w-9 h-9 object-contain"
                    />
                    <span className="text-[10px] text-green-400">
                      <Monetary value={w.item.baseValue || 0} showFraction />
                    </span>
                  </div>
                ))}
              </div>

              {col.isWinner && (
                <span className="text-secondary font-bold flex items-center justify-center gap-1 mt-auto">
                  <FaCrown /> Winner
                </span>
              )}
              {col.canKick && (
                <button
                  onClick={col.onKick}
                  className="text-xs text-accent-ruby hover:text-secondary-light mt-auto"
                >
                  {i18n.t("battles.kick")}
                </button>
              )}
            </div>
          ),
        )}
      </div>

      <div className="flex items-center gap-4">
        {showStart && (
          <button
            onClick={onStart}
            disabled={startDisabled}
            className="px-6 py-2 rounded bg-green-700 hover:bg-green-600 font-semibold disabled:opacity-50 flex items-center gap-2"
          >
            {startLoading && (
              <RotatingLines strokeColor="white" strokeWidth="5" animationDuration="0.75" width="18" visible={true} />
            )}
            {startLoading ? "Starting..." : startLabel}
          </button>
        )}
        {showWaitingForHost && (
          <span className="text-[#84819a] text-sm">{waitingForHostLabel}</span>
        )}
        {showLeave && (
          <button
            onClick={onLeave}
            className="px-4 py-2 rounded bg-[#0A0A0A] hover:bg-accent-ruby font-semibold"
          >
            {leaveLabel}
          </button>
        )}
        {showCancelled && (
          <span className="text-accent-ruby">{i18n.t("battles.thisBattleWasCancelled")}</span>
        )}
        {showBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 rounded bg-[#0A0A0A] hover:bg-[#3a2c5c] font-semibold"
          >
            {i18n.t("battles.backToBattles")}
          </button>
        )}
      </div>
    </div>
  );
};

export default BattleRoomView;
