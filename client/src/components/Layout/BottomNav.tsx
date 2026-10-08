import React from 'react';
import { Home, Compass, Wallet, History, UserCheck, PlusCircle } from 'lucide-react';
import { UserRole } from '../../types';

export type NavTab = 'home' | 'ride' | 'wallet' | 'history' | 'profile';

interface BottomNavProps {
  role: UserRole;
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onGoHome?: () => void;
  hasActiveRide?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  role,
  currentTab,
  onTabChange,
  onGoHome,
  hasActiveRide = false,
}) => {
  const isRider = role === 'rider';

  return (
    <nav className="sticky bottom-0 z-40 bg-[#0F1117] border-t border-[#222634] px-4 py-2 shadow-none">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Persistent Home Tab (Ticket 3) */}
        <button
          type="button"
          onClick={() => {
            if (onGoHome) {
              onGoHome();
            } else {
              onTabChange('home');
            }
          }}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors relative cursor-pointer ${
            currentTab === 'home'
              ? 'text-[#6366F1] font-bold'
              : 'text-[#94A3B8] hover:text-white'
          }`}
          title="Main Dashboard"
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Home</span>
        </button>

        {/* Main Action Tab */}
        <button
          onClick={() => onTabChange('ride')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors relative cursor-pointer ${
            currentTab === 'ride'
              ? 'text-[#6366F1] font-bold'
              : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          {isRider ? (
            <PlusCircle className="w-5 h-5 mb-0.5" />
          ) : (
            <Compass className="w-5 h-5 mb-0.5" />
          )}
          <span className="text-[10px] tracking-tight">
            {isRider ? 'Offer Ride' : 'Find Ride'}
          </span>
          {hasActiveRide && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#6366F1] shadow-[0_0_6px_#6366F1] animate-pulse" />
          )}
        </button>

        {/* Wallet Tab - Rider Only */}
        {isRider && (
          <button
            onClick={() => onTabChange('wallet')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors cursor-pointer ${
              currentTab === 'wallet'
                ? 'text-[#6366F1] font-bold'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Wallet className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Wallet</span>
          </button>
        )}

        {/* History Tab */}
        <button
          onClick={() => onTabChange('history')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors cursor-pointer ${
            currentTab === 'history'
              ? 'text-[#6366F1] font-bold'
              : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          <History className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Rides</span>
        </button>

        {/* Profile Tab */}
        <button
          onClick={() => onTabChange('profile')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors cursor-pointer ${
            currentTab === 'profile'
              ? 'text-[#6366F1] font-bold'
              : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          <UserCheck className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Profile</span>
        </button>
      </div>
    </nav>
  );
};
