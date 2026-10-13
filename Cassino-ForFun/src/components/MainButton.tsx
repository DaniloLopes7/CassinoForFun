import { TailSpin } from "react-loader-spinner";

interface MainButton {
  text: string | JSX.Element;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  submit?: boolean;
  icon?: any;
  iconPosition?: "left" | "right";
  type?: "button" | "danger" | "success" | "warning" | "info" | "dark";
  pulse?: boolean;
  textSize?: string;
}

const MainButton: React.FC<MainButton> = ({
  text,
  onClick,
  disabled,
  loading,
  submit,
  icon,
  iconPosition = "left",
  type = "button",
  pulse,
  textSize,

}) => {

  const colorClasses = {
    button: "bg-accent-gold hover:bg-accent-light text-black shadow-lg shadow-accent-gold/20 focus:ring-accent-gold",
    danger: "bg-accent-ruby hover:bg-accent-ruby text-white shadow-lg shadow-accent-ruby/20 focus:ring-accent-ruby",
    success: "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 focus:ring-green-500",
    warning: "bg-secondary hover:bg-secondary-light text-white shadow-lg shadow-secondary/20 focus:ring-secondary",
    info: "bg-secondary hover:bg-secondary text-white shadow-lg shadow-secondary/20 focus:ring-secondary",
    dark: "bg-surface-raised hover:bg-surface-hover text-white shadow-lg shadow-black/40 focus:ring-secondary",
  };

  const pulseClass = pulse ? "animate-bounce " : "";

  return (
    <button
      className={`flex items-center justify-center w-full h-10 px-4 ${colorClasses[type]}
      focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-md
      font-medium transition-all duration-200 ${disabled ? "opacity-50 cursor-not-allowed" : pulseClass} ${
        textSize ? textSize : "md:text-lg"
      }`}
      onClick={onClick}
      disabled={disabled}
      type={submit ? "submit" : "button"}
    >
      {loading ? (
        <TailSpin
          height="20"
          width="20"
          color="#fff"
          ariaLabel="tail-spin-loading"
          radius="1"
        />
      ) : (
        <>
          {icon && iconPosition === "left" && <span className="mr-2">{icon}</span>}
          {text}
          {icon && iconPosition === "right" && <span className="ml-2">{icon}</span>}
        </>
      )}
    </button>
  );
};

export default MainButton;
