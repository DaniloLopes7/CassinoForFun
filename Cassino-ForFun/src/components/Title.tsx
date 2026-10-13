interface TitleProps {
  title: string;
  // game pages only: the full py-10 pushed the board too far down the page
  compact?: boolean;
  showBar?: boolean;
}

const Title: React.FC<TitleProps> = ({ title, compact = false, showBar = true }) => {
  return (
    <div className={`w-fit ${compact ? "pb-4 short:pb-1" : "py-10 short:py-4"}`}>
      <div className="text-white w-auto text-3xl font-semibold">
        {title.toUpperCase()}
      </div>

      {showBar && (
        <div
          className="w-auto mt-1 h-1 bg-[#0A0A0A] rounded-full shadow-lg transition-all "
          style={{
            boxShadow: "0px 0px 50px 10px #D4AF37",
          }}
        />
      )}
    </div>
  );
};

export default Title;
