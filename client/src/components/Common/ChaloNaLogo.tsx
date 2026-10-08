import React from 'react';

interface ChaloNaLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const ChaloNaLogo: React.FC<ChaloNaLogoProps> = ({
  className = '',
  size = 20,
  showText = false,
}) => {
  const circleSize = Math.max(8, Math.round(size * 0.52));

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <div className="flex items-center tracking-tight font-extrabold text-white text-lg sm:text-xl font-sans">
        <span className="text-white leading-none">g</span>
        <span
          className="inline-block rounded-full bg-[#6366F1] mx-[1.5px] shadow-[0_0_12px_#6366F1] shrink-0"
          style={{ width: `${circleSize}px`, height: `${circleSize}px` }}
          aria-label="o"
        />
        <span className="text-white leading-none">BUDDY</span>
        <span className="text-[#6366F1] font-black leading-none">.</span>
      </div>
      {showText && (
        <span className="text-[9px] uppercase tracking-widest bg-[#161822] text-[#6366F1] font-bold px-1.5 py-0.5 rounded border border-[#222634] shadow-xs">
          CAMPUS
        </span>
      )}
    </div>
  );
};

export const GoBuddyLogo = ChaloNaLogo;
