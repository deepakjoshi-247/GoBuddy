import React, { useState, useEffect } from 'react';
import { History as HistoryIcon, CheckCircle, XCircle } from 'lucide-react';
import { User } from '../../types';
import { api } from '../../services/api';

interface HistoryViewProps {
  user: User;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ user }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        if (user.role === 'passenger') {
          const res = await api.getPassengerHistory(user.id);
          setHistory(res.history || []);
        } else {
          const res = await api.getRidesHistory(user.id);
          setHistory(res.history || []);
        }
      } catch (err) {
        console.error('History fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, [user.id, user.role]);

  const isPassenger = user.role === 'passenger';

  return (
    <div className="flex-1 flex flex-col p-4 bg-[#0F1117] text-[#F4F4F5] overflow-y-auto font-sans">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-[#F4F4F5] flex items-center gap-1.5">
            <HistoryIcon className="w-5 h-5 text-[#6366F1]" />
            <span>Previous Rides</span>
          </h2>
          <p className="text-[11px] text-[#A1A1AA]">
            {isPassenger ? 'Your campus commute history & bookings' : 'Completed campus commutes'}
          </p>
        </div>
        <span className="text-[10px] font-mono bg-[#161822] text-zinc-300 px-2.5 py-0.5 rounded-full border border-[#222634] shadow-sm">
          {history.length} {isPassenger ? 'trips' : 'completed'}
        </span>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-[#A1A1AA] text-xs">
          Loading history...
        </div>
      ) : history.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[#161822] rounded-xl border border-dashed border-[#222634]">
          <HistoryIcon className="w-8 h-8 text-zinc-500 mb-2" />
          <p className="text-xs font-semibold text-zinc-300">No rides in history yet</p>
          <p className="text-[11px] text-[#A1A1AA] mt-0.5">
            {isPassenger
              ? 'Your completed and resolved ride requests will appear here.'
              : 'Completed rides from the prototype demo will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => {
            if (isPassenger) {
              const isRejected = item.status === 'rejected' || item.request_status === 'rejected';
              const fare = item.fare || 15;
              const riderName = item.rider_name || 'Verified Rider';

              return (
                <div
                  key={item.id || item.request_id}
                  className="bg-[#161822] border border-[#222634] rounded-xl p-3.5 space-y-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {item.vehicle === 'Bike' ? '🏍️' : '🛺'}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#F4F4F5]">
                            {item.vehicle || 'Bike'}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            • Rider: <span className="text-zinc-200 font-semibold">{riderName}</span>
                          </span>
                        </div>
                        <p className="text-[10px] text-[#A1A1AA]">
                          {item.date || 'Today'} at {item.time || '10:00'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-[#6366F1]">
                        ₹{fare}
                      </span>
                      <div className="mt-0.5 flex justify-end">
                        {isRejected ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/60 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3 text-rose-400" /> Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3 text-emerald-400" /> Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0F1117] border border-[#222634] rounded-lg p-2 text-[11px] text-zinc-300 space-y-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="truncate">{item.pickup_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                      <span className="truncate">{item.dest_name}</span>
                    </div>
                  </div>
                </div>
              );
            }

            // Rider history
            const isRider = item.user_role === 'rider';
            const fare = isRider ? item.total_fare || 60 : item.passenger_fare || 40;

            return (
              <div
                key={item.id}
                className="bg-[#161822] border border-[#222634] rounded-xl p-3.5 space-y-2.5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {item.vehicle === 'Bike' ? '🏍️' : '🛺'}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-[#F4F4F5]">
                        {item.vehicle} • {isRider ? 'Offered' : 'Pooled'}
                      </span>
                      <p className="text-[10px] text-[#A1A1AA]">
                        {item.date || 'Yesterday'} at {item.time}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-[#6366F1]">
                      {isRider ? `+₹${fare}` : `₹${fare}`}
                    </span>
                    <p className="text-[9px] text-zinc-400 font-medium flex items-center gap-0.5 justify-end">
                      <CheckCircle className="w-3 h-3 text-[#6366F1]" /> Completed
                    </p>
                  </div>
                </div>

                <div className="bg-[#0F1117] border border-[#222634] rounded-lg p-2 text-[11px] text-zinc-300 space-y-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="truncate">{item.pickup_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    <span className="truncate">{item.dest_name}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HistoryView;
