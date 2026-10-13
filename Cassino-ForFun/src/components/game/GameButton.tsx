interface GameButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "cashout" | "danger" | "secondary";
}

// the four actions a game can offer, so play is green everywhere and cashing out is always gold.
// hover is gated on :enabled, otherwise a disabled button still lights up under the cursor.
const variants = {
  primary: "bg-green-600 text-white enabled:hover:brightness-110",
  cashout: "bg-secondary text-black enabled:hover:brightness-110",
  danger: "bg-accent-ruby text-white enabled:hover:brightness-110",
  secondary: "bg-surface-raised text-white enabled:hover:brightness-110",
};

const GameButton: React.FC<GameButtonProps> = ({ children, onClick, disabled, variant = "primary" }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full min-h-[46px] px-3 font-bold transition-all disabled:opacity-40 ${variants[variant]}`}
  >
    {children}
  </button>
);

export default GameButton;
