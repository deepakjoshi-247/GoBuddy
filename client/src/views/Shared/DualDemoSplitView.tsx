import React, { useState, useRef } from 'react';
import { RotateCcw, FileText, ExternalLink, RefreshCw } from 'lucide-react';
import { ChaloNaLogo } from '../../components/Common/ChaloNaLogo';
import { api } from '../../services/api';

interface DualDemoSplitViewProps {
  onOpenLogs?: () => void;
}

export const DualDemoSplitView: React.FC<DualDemoSplitViewProps> = ({ onOpenLogs }) => {
  const [isResetting, setIsResetting] = useState(false);
  const [resetNotice, setResetNotice] = useState('');
  const passengerIframeRef = useRef<HTMLIFrameElement>(null);
  const riderIframeRef = useRef<HTMLIFrameElement>(null);

  const handleReset = async () => {
    if (isResetting) return;
    setIsResetting(true);
    try {
      await api.resetDatabase();
      setResetNotice('Reset complete');
      setTimeout(() => setResetNotice(''), 2000);

      // Reload both iframes to reset their local states and sessions
      if (passengerIframeRef.current) {
        passengerIframeRef.current.src = '/passenger';
      }
      if (riderIframeRef.current) {
        riderIframeRef.current.src = '/rider';
      }
    } catch (err) {
      console.error('Database reset failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleRefreshPassenger = () => {
    if (passengerIframeRef.current) {
      passengerIframeRef.current.src = '/passenger';
    }
  };

  const handleRefreshRider = () => {
    if (riderIframeRef.current) {
      riderIframeRef.current.src = '/rider';
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0F1117] text-white font-sans">
      {/* Top Controller Bar */}
      <header className="h-12 bg-[#0F1117] text-white flex items-center justify-between px-3 sm:px-4 border-b border-[#222634] shrink-0 z-30">
        <div className="flex items-center gap-2.5">
          <ChaloNaLogo size={18} className="w-4 h-4 text-white" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-white flex items-center gap-0.5 font-mono">
              <span>g</span>
              <span className="w-2 h-2 rounded-full bg-[#6366F1] shadow-[0_0_6px_#6366F1] inline-block" />
              <span>BUDDY.</span>
            </span>
            <span className="text-[10px] bg-[#161822] text-[#6366F1] font-semibold px-2 py-0.5 rounded border border-[#6366F1]/30 font-mono">
              DUAL SPLIT DEMO
            </span>
          </div>
        </div>

        {/* Global Demo Actions */}
        <div className="flex items-center gap-3">
          {/* Discreet System Logs link */}
          <a
            href="/logs"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-[#94A3B8] hover:text-white transition-colors flex items-center gap-1 font-medium"
            title="Open System Audit Logs in new tab"
          >
            <span>System Logs</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>

          {/* Database Reset */}
          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#161822] hover:bg-[#1C1F2E] text-zinc-200 border border-[#222634] hover:border-[#6366F1] transition-colors shadow-none cursor-pointer"
            title="Reset database to pristine state & refresh both frames"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-zinc-400 ${isResetting ? 'animate-spin text-[#6366F1]' : ''}`} />
            <span>{resetNotice || (isResetting ? 'Resetting...' : 'Reset DB')}</span>
          </button>
        </div>
      </header>

      {/* 50% / 50% Split Screen Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#222634]">
        {/* Left Pane (50% width): PASSENGER INTERFACE */}
        <section className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col bg-[#0F1117] relative">
          <div className="h-8 bg-[#161822] text-zinc-200 text-xs font-semibold flex items-center justify-between px-3 border-b border-[#222634] shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#6366F1] shadow-[0_0_6px_#6366F1]" />
              <span className="tracking-wide">PASSENGER PORTAL</span>
              <span className="text-[10px] text-[#94A3B8] font-normal hidden lg:inline">
                (Independent Session • Booking & Search)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefreshPassenger}
                title="Reload Passenger Pane"
                className="text-zinc-400 hover:text-zinc-100 p-0.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <a
                href="/passenger"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#6366F1] hover:underline flex items-center gap-0.5 font-medium"
              >
                <span>Full Tab</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          <iframe
            ref={passengerIframeRef}
            src="/passenger"
            title="Passenger Portal"
            className="w-full flex-1 border-0 bg-[#0F1117]"
          />
        </section>

        {/* Right Pane (50% width): RIDER INTERFACE */}
        <section className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col bg-[#0F1117] relative">
          <div className="h-8 bg-[#161822] text-zinc-200 text-xs font-semibold flex items-center justify-between px-3 border-b border-[#222634] shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#6366F1] shadow-[0_0_6px_#6366F1]" />
              <span className="tracking-wide">RIDER PORTAL</span>
              <span className="text-[10px] text-[#94A3B8] font-normal hidden lg:inline">
                (Independent Session • Commutes & Requests)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefreshRider}
                title="Reload Rider Pane"
                className="text-zinc-400 hover:text-zinc-100 p-0.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <a
                href="/rider"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#6366F1] hover:underline flex items-center gap-0.5 font-medium"
              >
                <span>Full Tab</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          <iframe
            ref={riderIframeRef}
            src="/rider"
            title="Rider Portal"
            className="w-full flex-1 border-0 bg-[#0F1117]"
          />
        </section>
      </div>
    </div>
  );
};
