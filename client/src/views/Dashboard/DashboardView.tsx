import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Search,
  Bike,
  Clock,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { User, Ride, JoinRequest } from '../../types';
import { api } from '../../services/api';

interface DashboardViewProps {
  user: User;
  onFindRide: () => void;
  onOfferRide: () => void;
  onOpenActiveRide?: (ride: Ride, request?: JoinRequest) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  onFindRide,
  onOfferRide,
  onOpenActiveRide,
}) => {
  const [activeRideData, setActiveRideData] = useState<{
    role: string | null;
    ride: Ride | null;
    request?: JoinRequest | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchRide = async () => {
      try {
        const res = await api.getUserActiveRide(user.id);
        if (!isMounted) return;
        if (res?.ride) {
          setActiveRideData({
            role: res.role,
            ride: res.ride,
            request: (res as any).request || null,
          });
        } else {
          setActiveRideData(null);
        }
      } catch (err) {
        console.error('Error fetching active ride in dashboard:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRide();
    const interval = setInterval(fetchRide, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user.id]);

  const ride = activeRideData?.ride;
  const request = activeRideData?.request;

  return (
    <div className="flex-1 flex flex-col p-4 bg-[#0F1117] text-white overflow-y-auto font-sans justify-between min-h-full">
      <div className="space-y-4">
        {/* Welcome Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#222634]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/30 flex items-center justify-center text-sm font-bold text-[#6366F1]">
              {(user.name || 'U').charAt(0)}
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">
                Hey, {user.name}
              </h1>
              <p className="text-[10px] text-[#94A3B8] font-mono">
                {user.pid} • {user.gender || 'Male'}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#161822] text-[#6366F1] border border-[#222634] font-semibold">
            {user.role === 'rider' ? 'Bike Owner' : 'Passenger'}
          </span>
        </div>

        {/* TOP: SLEEK "BOARDING PASS" CARD / EMPTY STATE (TICKET 3) */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-[#6366F1]" />
              Scheduled Commute
            </span>
            {ride && (
              <span className="text-[10px] font-mono font-bold text-[#6366F1] bg-[#6366F1]/10 px-2 py-0.5 rounded-full border border-[#6366F1]/30 animate-pulse">
                ACTIVE
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="bg-[#161822] border border-[#222634] rounded-2xl p-6 text-center animate-pulse space-y-2">
              <div className="w-8 h-8 rounded-full bg-[#222634] mx-auto" />
              <div className="h-3 w-32 bg-[#222634] mx-auto rounded" />
            </div>
          ) : ride ? (
            /* Active Boarding Pass Card */
            <div className="relative bg-[#161822] border border-[#222634] rounded-2xl p-4 shadow-xl space-y-3.5 overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#222634] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-wider uppercase text-white font-mono">
                    BOARDING PASS
                  </span>
                  <span className="text-[10px] font-mono text-[#94A3B8]">
                    • {ride.id.slice(0, 10)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-[#6366F1]">
                    ₹{request?.fare || (ride as any).calculated_fare || Math.round(10 + (ride.route_distance_km || 4.2) * 5)}
                  </span>
                  <span className="block text-[8px] text-[#94A3B8] uppercase">Fixed Fare</span>
                </div>
              </div>

              {/* Route Details */}
              <div className="space-y-2.5 bg-[#0F1117] p-3 rounded-xl border border-[#222634]">
                <div className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-[#6366F1] mt-1 shrink-0 shadow-[0_0_8px_#6366F1]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] uppercase font-bold tracking-wider text-[#94A3B8]">Pickup</p>
                    <p className="text-xs font-semibold text-white truncate">{ride.pickup_name}</p>
                  </div>
                </div>

                <div className="ml-1 pl-0.5 border-l-2 border-dashed border-[#222634] h-2" />

                <div className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-white mt-1 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] uppercase font-bold tracking-wider text-[#94A3B8]">Destination</p>
                    <p className="text-xs font-semibold text-white truncate">{ride.dest_name}</p>
                  </div>
                </div>
              </div>

              {/* Trip metadata */}
              <div className="grid grid-cols-3 gap-2 p-2 bg-[#0F1117] border border-[#222634] rounded-xl text-center">
                <div>
                  <p className="text-[8px] uppercase text-[#94A3B8] font-semibold">Rider</p>
                  <p className="text-[11px] font-bold text-white truncate">{ride.rider_name}</p>
                </div>
                <div>
                  <p className="text-[8px] uppercase text-[#94A3B8] font-semibold">Time</p>
                  <p className="text-[11px] font-mono font-bold text-white">{ride.time || '08:30'}</p>
                </div>
                <div>
                  <p className="text-[8px] uppercase text-[#94A3B8] font-semibold">Status</p>
                  <p className="text-[11px] font-bold text-[#6366F1] uppercase">
                    {ride.is_live ? 'Live' : 'Scheduled'}
                  </p>
                </div>
              </div>

              {/* PIN callout if OTP present */}
              {request?.trip_otp && (
                <div className="bg-[#0F1117] border border-[#6366F1]/40 rounded-xl p-2.5 text-center">
                  <span className="text-[9px] font-bold tracking-widest uppercase text-[#6366F1]">
                    HANDSHAKE PIN
                  </span>
                  <div className="text-2xl font-mono font-bold tracking-[0.3em] text-[#6366F1] my-0.5">
                    {request.trip_otp}
                  </div>
                </div>
              )}

              {/* Action button to open active ride */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenActiveRide) {
                    onOpenActiveRide(ride, request || undefined);
                  } else if (activeRideData?.role === 'rider') {
                    onOfferRide();
                  } else {
                    onFindRide();
                  }
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer"
              >
                <span>View Live Ride Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* Empty State: "No scheduled rides" */
            <div className="bg-[#161822] border border-[#222634] rounded-2xl p-6 text-center space-y-3 shadow-md">
              <div className="w-12 h-12 rounded-2xl bg-[#0F1117] border border-[#222634] text-[#6366F1] flex items-center justify-center mx-auto shadow-inner">
                <Ticket className="w-6 h-6 stroke-[1.75]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">No scheduled rides</h3>
                <p className="text-xs text-[#94A3B8] max-w-xs mx-auto leading-relaxed">
                  You don't have any active or upcoming trips. Book a 1-to-1 ride or offer spare seats to fellow students below.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM: ROLE-SEGREGATED ACTION HUB (TICKET 3) */}
      <div className="pt-4 space-y-3">
        <p className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] px-1">
          {user.role === 'rider' ? 'Rider Portal Action' : 'Passenger Portal Action'}
        </p>

        {user.role === 'rider' ? (
          /* Rider Only Action Hub: Offer a Ride */
          <button
            type="button"
            onClick={onOfferRide}
            className="w-full group relative p-4 rounded-2xl bg-[#161822] hover:bg-[#1C1F2E] border-2 border-[#222634] hover:border-[#6366F1] transition-all text-left flex items-start gap-3.5 cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(99,102,241,0.25)]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/30 text-[#6366F1] group-hover:bg-[#6366F1] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
              <Bike className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white group-hover:text-[#818CF8] transition-colors">
                  Offer a Ride
                </h3>
                <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#6366F1] group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-snug">
                Commuting by bike? Offer a co-ride, split petrol costs, and earn verified peer fare.
              </p>
            </div>
          </button>
        ) : (
          /* Passenger Only Action Hub: Find a Ride */
          <button
            type="button"
            onClick={onFindRide}
            className="w-full group relative p-4 rounded-2xl bg-[#161822] hover:bg-[#1C1F2E] border-2 border-[#222634] hover:border-[#6366F1] transition-all text-left flex items-start gap-3.5 cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(99,102,241,0.25)]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/30 text-[#6366F1] group-hover:bg-[#6366F1] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
              <Search className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white group-hover:text-[#818CF8] transition-colors">
                  Find a Ride
                </h3>
                <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#6366F1] group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-snug">
                Search verified student rides heading to Railway Station or Transit Junctions.
              </p>
            </div>
          </button>
        )}

        {/* Footer safety tag */}
        <div className="flex items-center justify-center gap-1.5 pt-1 text-[10px] text-[#94A3B8]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#6366F1]" />
          <span>Campus Verified Students • Strict Route Matching</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
