import React, { useState } from 'react';
import {
  PhoneCall,
  Settings,
  LogOut,
  RefreshCw,
  Info,
  X,
} from 'lucide-react';
import { User } from '../../types';
import { RiderProfileCard } from '../../components/Rider/RiderProfileCard';

interface ProfileViewProps {
  user: User;
  onLogout: () => void;
  onSwitchRole: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onLogout,
  onSwitchRole,
}) => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col p-4 bg-[#0F1117] text-[#F4F4F5] overflow-y-auto font-sans space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-[#F4F4F5]">Rider & Student Profile</h2>
        <p className="text-[11px] text-[#A1A1AA]">
          Verified Campus Community Member • Autonomous Fail-Safe Active
        </p>
      </div>

      {/* Fail-Safe Static Injected Rider Profile (Aarav Sharma 19, Badge, Vehicle Inspection & Reviews) */}
      <RiderProfileCard />

      {/* Actions */}
      <div className="space-y-2">
        {/* Switch Role Button */}
        <button
          onClick={onSwitchRole}
          className="w-full p-3 rounded-xl bg-[#161822] hover:bg-zinc-700/80 border border-[#222634] flex items-center justify-between text-xs font-semibold text-[#F4F4F5] transition-colors shadow-sm cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-[#6366F1]" />
            <span>Switch Role to {user.role === 'rider' ? 'Passenger' : 'Rider'}</span>
          </div>
          <span className="text-[10px] text-[#6366F1] uppercase font-semibold">Change</span>
        </button>

        {/* About goBUDDY Button */}
        <button
          type="button"
          onClick={() => setIsAboutOpen(true)}
          className="w-full p-3 rounded-xl bg-[#161822] hover:bg-[#1C1F2E] border border-[#222634] hover:border-[#6366F1]/50 flex items-center justify-between text-xs font-semibold text-[#F4F4F5] transition-colors shadow-sm cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-[#6366F1]" />
            <span>About goBUDDY</span>
          </div>
          <span className="text-[10px] text-[#94A3B8] font-mono">v2.4 LTS →</span>
        </button>

        {/* Emergency SOS */}
        <div className="p-3 rounded-xl bg-[#161822] border border-[#222634] flex items-center justify-between text-xs text-zinc-300 shadow-sm">
          <div className="flex items-center gap-2.5">
            <PhoneCall className="w-4 h-4 text-rose-400" />
            <div>
              <p className="font-semibold text-[#F4F4F5]">Campus Security Helpline</p>
              <p className="text-[10px] text-[#A1A1AA]">+91 020-2550-7000 (Gate 1 Security)</p>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-rose-950/60 text-rose-300 px-2 py-0.5 rounded border border-rose-800 font-semibold">
            SOS 24x7
          </span>
        </div>

        {/* App Settings */}
        <div className="p-3 rounded-xl bg-[#161822] border border-[#222634] flex items-center justify-between text-xs text-zinc-300 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-zinc-400" />
            <span>App Preferences & Notifications</span>
          </div>
          <span className="text-[10px] text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-full border border-[#222634] font-medium">
            Enabled
          </span>
        </div>
      </div>

      {/* Logout */}
      <div className="pt-2">
        <button
          onClick={onLogout}
          className="w-full py-2.5 rounded-xl bg-[#161822] hover:bg-rose-950/40 hover:text-rose-300 text-zinc-300 text-xs font-semibold border border-[#222634] hover:border-rose-800 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Switch Account / Logout</span>
        </button>
      </div>

      {/* About Us Page/Modal */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#161822] border border-[#222634] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222634] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-0.5 font-mono">
                  <span>g</span>
                  <span className="w-2 h-2 rounded-full bg-[#6366F1] shadow-[0_0_8px_#6366F1] inline-block" />
                  <span>BUDDY.</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAboutOpen(false)}
                className="p-1 rounded-lg hover:bg-[#1C1F2E] text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white tracking-tight">goBUDDY.</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Peer-to-peer campus transit architecture. Built with clean code, modern web standards, and zero legacy bloat.
              </p>
            </div>

            <div className="bg-[#0F1117] rounded-xl p-3 border border-[#222634] space-y-2 text-xs">
              <div className="flex justify-between text-[#94A3B8]">
                <span>Architecture</span>
                <span className="text-white font-mono">React 19 • Express 5</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>Database</span>
                <span className="text-white font-mono">SQLite (ACID Compliant)</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>State Security</span>
                <span className="text-[#6366F1] font-mono">Atomic Handshake PIN</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>Design System</span>
                <span className="text-white font-mono">Linear Dark Slate</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAboutOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(99,102,241,0.25)] cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;
