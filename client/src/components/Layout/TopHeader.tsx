import React, { useState } from 'react';
import { RotateCcw, Columns, Smartphone, FileText, LogOut, LayoutDashboard } from 'lucide-react';
import { User } from '../../types';
import { api } from '../../services/api';
import { ChaloNaLogo } from '../Common/ChaloNaLogo';

interface TopHeaderProps {
  user: User | null;
  onLogout?: () => void;
  onRoleSwitch?: (newRole: 'rider' | 'passenger') => void;
  isSplitView?: boolean;
  onToggleSplitView?: () => void;
  onResetComplete?: () => void;
  onOpenLogs?: () => void;
  onGoDashboard?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  user,
  onLogout,
  onRoleSwitch,
  isSplitView = false,
  onToggleSplitView,
  onResetComplete,
  onOpenLogs,
  onGoDashboard,
}) => {
  const [isResetting, setIsResetting] = useState(false);
  const [resetNotice, setResetNotice] = useState('');

  const handleReset = async () => {
    if (isResetting) return;
    setIsResetting(true);
    try {
      await api.resetDatabase();
      setResetNotice('Reset done');
      setTimeout(() => setResetNotice(''), 2000);
      if (onResetComplete) onResetComplete();
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0F1117] text-white border-b border-[#222634] px-3 py-2.5 shadow-none">
      <div className="flex items-center justify-between gap-2 max-w-5xl mx-auto">
        {/* Brand with pure typographic wordmark */}
        <div className="flex items-center gap-2.5">
          {onGoDashboard ? (
            <button
              type="button"
              onClick={onGoDashboard}
              className="flex items-center gap-2.5 hover:opacity-90 transition-opacity cursor-pointer"
              title="Go to Dashboard"
            >
              <ChaloNaLogo size={22} showText={true} />
            </button>
          ) : (
            <ChaloNaLogo size={22} showText={true} />
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Dashboard Button */}
          {user && onGoDashboard && (
            <button
              type="button"
              onClick={onGoDashboard}
              title="Return to Dashboard"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-[#161822] hover:bg-[#1C1F2E] text-zinc-200 border border-[#222634] hover:border-[#6366F1] transition-colors cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-[#6366F1]" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          )}

          {/* Quick Demo Reset */}
          <button
            onClick={handleReset}
            disabled={isResetting}
            title="Reset database to clean demo state"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-[#161822] hover:bg-[#1C1F2E] text-zinc-200 border border-[#222634] hover:border-[#6366F1] transition-colors cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-zinc-400 ${isResetting ? 'animate-spin text-[#6366F1]' : ''}`} />
            <span className="hidden sm:inline">{resetNotice || 'Reset'}</span>
          </button>

          {/* Active User Chip & Clear Logout Button */}
          {user && (
            <div className="flex items-center gap-1.5 pl-1 border-l border-[#222634]">
              <div className="flex items-center gap-1.5 bg-[#161822] px-2 py-1 rounded-md border border-[#222634]">
                <span className="text-xs font-medium text-zinc-200 hidden sm:inline max-w-[80px] truncate">
                  {user.name.split(' ')[0]}
                </span>
                <span
                  className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md ${
                    user.role === 'rider'
                      ? 'bg-[#0F1117] text-[#6366F1] border border-[#6366F1]/40'
                      : 'bg-[#0F1117] text-white border border-[#222634]'
                  }`}
                >
                  {user.role}
                </span>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Logout from this portal"
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:text-white bg-[#161822] hover:bg-[#1C1F2E] rounded-md border border-[#222634] hover:border-[#6366F1]/50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

