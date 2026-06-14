type StylizedVersusProps = {
  className?: string;
  compact?: boolean;
};

export function StylizedVersus({ className = "", compact = false }: StylizedVersusProps) {
  const sizeClass = compact ? "h-10 w-14 md:h-11 md:w-16" : "h-12 w-18 md:h-14 md:w-20";
  const textClass = compact ? "text-[1.8rem] md:text-[2.2rem]" : "text-[2rem] md:text-[2.5rem]";
  const rightClass = compact ? "right-[0.42rem]" : "right-[0.5rem]";

  return (
    <div className={`relative flex items-center justify-center ${sizeClass} ${className}`}>
      <span className={`absolute left-[0.05rem] top-1/2 -translate-y-1/2 font-black italic leading-none text-[#171717] drop-shadow-[1px_1px_0_rgba(255,255,255,0.8)] ${textClass}`}>
        V
      </span>
      <span className={`absolute ${rightClass} top-1/2 -translate-y-1/2 font-black italic leading-none text-[#171717] drop-shadow-[1px_1px_0_rgba(255,255,255,0.8)] ${textClass}`}>
        S
      </span>
      <span className="absolute left-1/2 top-1/2 h-[150%] w-[2px] -translate-x-1/2 -translate-y-1/2 rotate-[22deg] bg-[#171717]" />
      <span className="absolute left-[54%] top-1/2 h-[132%] w-px -translate-x-1/2 -translate-y-1/2 rotate-[22deg] bg-[#171717]/70" />
      <span className="absolute left-[46%] top-1/2 h-[132%] w-px -translate-x-1/2 -translate-y-1/2 rotate-[22deg] bg-[#171717]/55" />
    </div>
  );
}
