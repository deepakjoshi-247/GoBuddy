import React from 'react';
import { User } from '../../types';
import { RiderFlowContainer } from '../../components/Containers/RiderFlowContainer';
import { PassengerFlowContainer } from '../../components/Containers/PassengerFlowContainer';

interface SplitDemoViewProps {
  resetKey?: number;
  onResetDatabase?: () => void;
  onOpenLogs?: () => void;
}

export const SplitDemoView: React.FC<SplitDemoViewProps> = ({
  resetKey = 0,
  onOpenLogs,
}) => {
  // Pre-configured demo users
  const riderUser: User = {
    id: 'user_aarav',
    name: 'Aarav Sharma',
    pid: 'COEP-2024-R42',
    role: 'rider',
    avatar_seed: 'Aarav',
  };

  const passengerUser: User = {
    id: 'user_rohan',
    name: 'Rohan Verma',
    pid: 'COEP-2024-P19',
    role: 'passenger',
    avatar_seed: 'Rohan',
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] text-slate-800 p-2 sm:p-4 overflow-y-auto">
      {/* Side-by-Side Mobile Frames */}
      <div
        key={resetKey}
        className="max-w-6xl mx-auto w-full flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start"
      >
        {/* LEFT COLUMN: RIDER VIEWPORT (AARAV) */}
        <div className="flex flex-col items-center">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
            <span>🏍️</span>
            <span>RIDER (Aarav Sharma • COEP-2024-R42)</span>
          </div>
          <div className="w-full max-w-[420px] min-h-[760px] bg-white rounded-[32px] border-[4px] border-slate-300 shadow-xl overflow-hidden flex flex-col relative">
            <RiderFlowContainer initialUser={riderUser} />
          </div>
        </div>

        {/* RIGHT COLUMN: PASSENGER VIEWPORT (ROHAN) */}
        <div className="flex flex-col items-center">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
            <span>🚶‍♂️</span>
            <span>PASSENGER (Rohan Verma • COEP-2024-P19)</span>
          </div>
          <div className="w-full max-w-[420px] min-h-[760px] bg-white rounded-[32px] border-[4px] border-slate-300 shadow-xl overflow-hidden flex flex-col relative">
            <PassengerFlowContainer initialUser={passengerUser} />
          </div>
        </div>
      </div>
    </div>
  );
};
