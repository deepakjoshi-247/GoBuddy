import React from 'react';

interface MobileFrameProps {
  children: React.ReactNode;
  headerTitle?: string;
  isFramed?: boolean;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  return (
    <div className="w-full flex-1 bg-[#0F1117] flex flex-col min-h-screen text-white">
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col bg-[#0F1117] sm:border-x sm:border-[#222634]">
        {children}
      </div>
    </div>
  );
};
