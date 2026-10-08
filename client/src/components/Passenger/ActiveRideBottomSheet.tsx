import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { User, Ride, JoinRequest } from '../../types';
import { PassengerActiveView } from '../../views/Passenger/PassengerActiveView';

interface ActiveRideBottomSheetProps {
  user: User;
  request: JoinRequest;
  ride: Ride;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onBackToSearch: () => void;
  onRideCompleted: () => void;
  onRideCancelled?: () => void;
  onDroppedOff?: () => void;
  onRejected?: (msg?: string) => void;
}

export const ActiveRideBottomSheet: React.FC<ActiveRideBottomSheetProps> = ({
  user,
  request,
  ride,
  isExpanded,
  onToggleExpand,
  onBackToSearch,
  onRideCompleted,
  onRideCancelled,
  onDroppedOff,
  onRejected,
}) => {
  const isApproved = request.status === 'approved';

  return (
    <>
      {/* 1. DOCKED PERSISTENT BOTTOM BAR (Linear Slate Mode) */}
      {!isExpanded && (
        <div
          onClick={onToggleExpand}
          className="mx-3 mb-2 bg-[#161822] border border-[#222634] hover:border-[#6366F1]/60 rounded-2xl p-3 shadow-2xl transition-all cursor-pointer flex items-center justify-between z-30 animate-in slide-in-from-bottom-2 duration-300"
        >
          <div className="flex items-center gap-3">
            {/* Pulsating status dot */}
            <div className="relative flex items-center justify-center">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isApproved ? 'bg-[#6366F1] shadow-[0_0_8px_#6366F1]' : 'bg-[#6366F1]'
                }`}
              />
              <span
                className={`absolute w-3.5 h-3.5 rounded-full animate-ping opacity-60 bg-[#6366F1]`}
              />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate max-w-[140px]">
                  {ride.rider_name}
                </span>
                <span className="text-[10px] text-[#94A3B8]">• {ride.vehicle}</span>
              </div>
              <p className="text-[10px] text-[#94A3B8] truncate max-w-[160px]">
                Drop: {request.dest_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-[#6366F1]">
                ₹{request.fare}
              </span>
              <span
                className={`block text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                  isApproved
                    ? 'bg-[#0F1117] text-[#6366F1] border border-[#6366F1]/40'
                    : 'bg-[#0F1117] text-white border border-[#222634] animate-pulse'
                }`}
              >
                {isApproved ? 'CONFIRMED' : 'PENDING'}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              title="Expand live ride details"
              className="p-1.5 rounded-lg bg-[#161822] hover:bg-[#1C1F2E] text-zinc-300 hover:text-white border border-[#222634] transition-colors cursor-pointer"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. EXPANDED SLIDE-UP VIEWPORT OVERLAY */}
      {isExpanded && (
        <div className="absolute inset-0 z-40 bg-[#0F1117] flex flex-col animate-in slide-in-from-bottom duration-300">
          {/* Top handle bar to collapse */}
          <div className="bg-[#161822] border-b border-[#222634] px-4 py-2.5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#6366F1] shadow-[0_0_6px_#6366F1] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Active Ride Tracking
              </span>
            </div>

            <button
              type="button"
              onClick={onToggleExpand}
              className="text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1 bg-[#0F1117] hover:bg-[#1C1F2E] px-2.5 py-1 rounded-lg border border-[#222634] transition-all cursor-pointer"
            >
              <span>Collapse</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Full Active View with Boarding Pass Ticket & OTP */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-[#0F1117]">
            <PassengerActiveView
              user={user}
              request={request}
              ride={ride}
              onBackToSearch={onBackToSearch}
              onRideCompleted={onRideCompleted}
              onRideCancelled={onRideCancelled}
              onDroppedOff={onDroppedOff}
              onRejected={onRejected}
              onCollapse={onToggleExpand}
            />
          </div>
        </div>
      )}
    </>
  );
};
