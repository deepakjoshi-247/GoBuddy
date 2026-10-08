import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  ShieldCheck,
  ArrowLeft,
  MapPin,
  Map,
  Ticket,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { User, Ride, JoinRequest } from '../../types';
import { LeafletMap, MapMarker } from '../../components/Map/LeafletMap';
import { CountdownTimer } from '../../components/Common/CountdownTimer';
import { RideChatModal } from '../../components/Chat/RideChatModal';
import { RiderProfileCard } from '../../components/Rider/RiderProfileCard';
import { getRoute } from '../../services/routing';
import { api } from '../../services/api';

interface PassengerActiveViewProps {
  user: User;
  request: JoinRequest;
  ride: Ride;
  onBackToSearch: () => void;
  onRideCompleted: () => void;
  onRideCancelled?: () => void;
  onDroppedOff?: () => void;
  onRejected?: (msg?: string) => void;
  onCollapse?: () => void;
}

const FALLBACK_RIDE: Ride = {
  id: 'ride_active_aarav',
  rider_id: 'user_aarav',
  rider_name: 'Aarav Sharma',
  rider_gender: 'Male',
  pickup_name: 'College Main Gate (Gate 1)',
  pickup_lat: 18.5308,
  pickup_lng: 73.8553,
  dest_name: 'Railway Station Junction',
  dest_lat: 18.5284,
  dest_lng: 73.8744,
  date: 'Today',
  time: '08:30',
  vehicle: 'Bike',
  capacity: 1,
  seats_available: 1,
  route_distance_km: 4.2,
  status: 'active',
  is_live: 0,
  created_at: 1791294688682,
};

const FALLBACK_REQUEST: JoinRequest = {
  id: 'req_rohan_aarav',
  ride_id: 'ride_active_aarav',
  passenger_id: 'user_rohan',
  passenger_name: 'Rohan Verma',
  pickup_name: 'College Main Gate (Gate 1)',
  pickup_lat: 18.5308,
  pickup_lng: 73.8553,
  dest_name: 'Railway Station Junction',
  dest_lat: 18.5284,
  dest_lng: 73.8744,
  distance_km: 4.2,
  fare: 31,
  status: 'approved',
  trip_otp: '4812',
  expires_at: 1791294688682 + 7200000,
  created_at: 1791294688682,
};

export const PassengerActiveView: React.FC<PassengerActiveViewProps> = ({
  user,
  request: initialRequest,
  ride: initialRide,
  onBackToSearch,
  onRideCompleted,
  onRideCancelled,
  onDroppedOff,
  onRejected,
  onCollapse,
}) => {
  const [request, setRequest] = useState<JoinRequest>(() => ({
    ...FALLBACK_REQUEST,
    ...(initialRequest || {}),
    trip_otp: initialRequest?.trip_otp || '4812',
  }));
  const [ride, setRide] = useState<Ride>(() => ({
    ...FALLBACK_RIDE,
    ...(initialRide || {}),
  }));
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showMap, setShowMap] = useState(false); // Map hidden initially as per Boarding Pass redesign
  const cancelledHandled = useRef(false);
  const dropOffHandled = useRef(false);
  const rejectionHandled = useRef(false);

  const handleCancelRequest = async () => {
    if (!request.id || isCancelling) return;
    setIsCancelling(true);
    try {
      await api.cancelRequest(request.id);
    } catch (err) {
      console.error('Cancel request error:', err);
    } finally {
      setIsCancelling(false);
      onBackToSearch();
    }
  };

  const triggerCancellation = () => {
    if (cancelledHandled.current || dropOffHandled.current || rejectionHandled.current) return;
    cancelledHandled.current = true;
    if (onRideCancelled) {
      onRideCancelled();
    } else {
      alert('Ride was cancelled by the rider');
      window.history.replaceState(null, '', '/passenger/dashboard');
      onBackToSearch();
    }
  };

  const triggerDropOff = () => {
    if (dropOffHandled.current || cancelledHandled.current || rejectionHandled.current) return;
    dropOffHandled.current = true;
    if (onDroppedOff) {
      onDroppedOff();
    } else {
      alert('Trip Finished / Dropped Off');
      window.history.replaceState(null, '', '/passenger/dashboard');
      onBackToSearch();
    }
  };

  const triggerRejection = () => {
    if (rejectionHandled.current || dropOffHandled.current || cancelledHandled.current) return;
    rejectionHandled.current = true;
    if (onRejected) {
      onRejected('Rider declined');
    } else {
      window.history.replaceState(null, '', '/passenger/dashboard');
      onBackToSearch();
    }
  };

  // Poll request and ride status every 1.5 seconds for real-time synchronization
  const syncStatus = async () => {
    try {
      let currentReqStatus: string = request.status;

      // 1. Check request status FIRST
      if (request.id && !request.id.startsWith('rp_')) {
        try {
          const reqRes = await api.getRequestStatus(request.id);
          if (reqRes?.request) {
            setRequest(reqRes.request);
            currentReqStatus = reqRes.request.status;
          }
        } catch (err: any) {
          // ignore transient errors
        }
      } else if (request.ride_id && user.id) {
        try {
          const reqRes = await api.getPassengerRideRequest(request.ride_id, user.id);
          if (reqRes?.request) {
            setRequest(reqRes.request);
            currentReqStatus = reqRes.request.status;
          }
        } catch (err: any) {}
      }

      // Check if rejected (EPIC 3: Passenger Rejection Release)
      if (currentReqStatus === 'rejected') {
        triggerRejection();
        return;
      }

      // Check if dropped off or completed
      if (currentReqStatus === 'completed' || currentReqStatus === 'dropped_off') {
        triggerDropOff();
        return;
      }

      if (currentReqStatus === 'cancelled') {
        triggerCancellation();
        return;
      }

      // 2. Check ride status
      try {
        const rideRes = await api.getRide(request.ride_id);
        if (rideRes?.ride) {
          if (rideRes.ride.status === 'cancelled') {
            triggerCancellation();
            return;
          }
          setRide(rideRes.ride);

          if (rideRes.ride.status === 'completed' && !isCompleted) {
            setIsCompleted(true);
          }
        }
      } catch (err: any) {
        // Fail-safe: backend database offline, preserve static mock ride
      }
    } catch (err) {
      console.error('Passenger sync error:', err);
    }
  };

  useEffect(() => {
    syncStatus();
    const interval = setInterval(syncStatus, 1500);
    return () => clearInterval(interval);
  }, [request.id, request.ride_id]);

  // Route coordinates
  useEffect(() => {
    async function loadRoute() {
      const r = await getRoute(
        request.pickup_lat,
        request.pickup_lng,
        request.dest_lat,
        request.dest_lng
      );
      setRouteCoords(r.coordinates);
    }
    loadRoute();
  }, [request.pickup_lat, request.pickup_lng, request.dest_lat, request.dest_lng]);

  const isPending = request.status === 'pending';
  const isApproved = request.status === 'approved';

  const markers: MapMarker[] = [
    {
      id: 'pickup',
      lat: request.pickup_lat,
      lng: request.pickup_lng,
      title: `Pickup: ${request.pickup_name}`,
      type: 'pickup',
    },
    {
      id: 'vehicle',
      lat: (request.pickup_lat + request.dest_lat) / 2,
      lng: (request.pickup_lng + request.dest_lng) / 2,
      title: `${ride.rider_name}'s ${ride.vehicle}`,
      type: 'vehicle',
      vehicleType: ride.vehicle,
    },
    {
      id: 'dest',
      lat: request.dest_lat,
      lng: request.dest_lng,
      title: `Destination: ${request.dest_name}`,
      type: 'dest',
    },
  ];

  // TICKET 4: Unmount active tracking on completed and display minimal thank you card
  if (isCompleted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0F1117] text-white font-sans text-center animate-in fade-in duration-300">
        <div className="w-full max-w-sm bg-[#161822] border border-[#222634] rounded-2xl p-6 text-center shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/30 text-[#6366F1] flex items-center justify-center mx-auto text-2xl font-bold shadow-[0_0_15px_rgba(99,102,241,0.25)]">
            ✓
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-white tracking-tight">Ride Completed</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Ride completed successfully. Thank you for choosing goBUDDY.
            </p>
          </div>

          <div className="bg-[#0F1117] rounded-xl p-3 border border-[#222634] text-xs flex justify-between items-center">
            <span className="text-zinc-400">Total Fare:</span>
            <span className="font-mono font-bold text-[#6366F1] text-sm">₹{request.fare}</span>
          </div>

          <button
            type="button"
            onClick={onRideCompleted}
            className="w-full py-3 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 bg-[#0F1117] text-white overflow-y-auto font-sans justify-between">
      <div className="space-y-3.5">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between mb-1">
          {onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              className="text-xs text-zinc-300 hover:text-white flex items-center gap-1 font-semibold bg-[#161822] hover:bg-[#1C1F2E] px-2.5 py-1 rounded-lg border border-[#222634] transition-colors cursor-pointer"
            >
              <span>↓ Collapse to Bottom Bar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onBackToSearch}
              className="text-xs text-[#94A3B8] hover:text-white flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Search</span>
            </button>
          )}
          <span
            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
              isApproved
                ? 'bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/40 shadow-[0_0_6px_rgba(99,102,241,0.2)]'
                : 'bg-[#161822] text-[#94A3B8] border-[#222634] animate-pulse'
            }`}
          >
            {request.status.toUpperCase()}
          </span>
        </div>

        {/* STATE 1: PENDING - Show waiting state with functional cancel button */}
        {isPending ? (
          <div className="bg-[#161822] border border-[#222634] rounded-2xl p-5 space-y-4 shadow-xl">
            {/* Waiting Header Card */}
            <div className="flex items-center justify-between border-b border-[#222634] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/30 text-[#6366F1] flex items-center justify-center">
                  <Clock className="w-4 h-4 animate-spin" />
                </div>
                <div>
                  <h2 className="text-xs font-black tracking-wider uppercase text-white">
                    REQUEST PENDING
                  </h2>
                  <p className="text-[10px] text-[#94A3B8]">
                    Awaiting Rider Confirmation
                  </p>
                </div>
              </div>
              <CountdownTimer expiresAt={request.expires_at} />
            </div>

            {/* Waiting Notice */}
            <div className="p-3 rounded-xl bg-[#0F1117] border border-[#222634] space-y-1">
              <p className="text-xs font-semibold text-white">
                Waiting for {ride.rider_name}
              </p>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                Your request has been sent to the rider. Once accepted, your Boarding Pass and 4-digit security PIN will unlock immediately.
              </p>
            </div>

            {/* Route Details */}
            <div className="space-y-2.5 bg-[#0F1117] p-3 rounded-xl border border-[#222634]">
              <div className="flex items-start gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#6366F1] mt-1 shrink-0 shadow-[0_0_8px_#6366F1]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] uppercase font-bold tracking-wider text-[#94A3B8]">PICKUP POINT</p>
                  <p className="text-xs font-bold text-white truncate">{request.pickup_name}</p>
                </div>
              </div>

              <div className="ml-1 pl-0.5 border-l-2 border-dashed border-[#222634] h-2" />

              <div className="flex items-start gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white mt-1 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] uppercase font-bold tracking-wider text-[#94A3B8]">DESTINATION</p>
                  <p className="text-xs font-bold text-white truncate">{request.dest_name}</p>
                </div>
              </div>
            </div>

            {/* Rider & Trip Details */}
            <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#0F1117] border border-[#222634] rounded-xl text-center">
              <div>
                <p className="text-[9px] uppercase text-[#94A3B8] font-semibold">Rider</p>
                <p className="text-xs font-bold text-white truncate">{ride.rider_name}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-[#94A3B8] font-semibold">Vehicle</p>
                <p className="text-xs font-bold text-white">{ride.vehicle || 'Bike'}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-[#94A3B8] font-semibold">Fare</p>
                <p className="text-xs font-mono font-bold text-[#6366F1]">₹{request.fare}</p>
              </div>
            </div>

            {/* Actions: Chat & Functional Cancel Request */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#222634]">
              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                className="py-2.5 px-3 rounded-xl bg-[#0F1117] hover:bg-[#1C1F2E] text-white text-xs font-bold border border-[#222634] hover:border-[#6366F1]/50 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#6366F1]" />
                <span>Chat with Rider</span>
              </button>
              <button
                type="button"
                onClick={handleCancelRequest}
                disabled={isCancelling}
                className="py-2.5 px-3 rounded-xl bg-[#0F1117] hover:bg-rose-950/60 border border-rose-900/60 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>{isCancelling ? 'Cancelling...' : 'Cancel Request'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* STATE 2: APPROVED - Immediately hide cancel button, render high-contrast Boarding Pass & prominent OTP */
          <div className="bg-[#161822] border border-[#222634] rounded-2xl p-5 space-y-4 shadow-2xl">
            {/* Ticket Header */}
            <div className="flex items-center justify-between border-b border-[#222634] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/30 flex items-center justify-center font-bold">
                  <Ticket className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs font-black tracking-wider uppercase text-white">
                      BOARDING PASS
                    </h2>
                    <span className="text-[9px] font-bold text-[#6366F1] bg-[#6366F1]/10 px-1.5 py-0.2 rounded border border-[#6366F1]/30">
                      CONFIRMED
                    </span>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] font-mono">
                    PEER COMMUTE • {request.id ? request.id.slice(0, 10) : 'RIDE'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono font-bold text-[#6366F1]">
                  ₹{request.fare}
                </span>
                <span className="block text-[8px] text-[#94A3B8] uppercase">Fixed Fare</span>
              </div>
            </div>

            {/* Route Details */}
            <div className="space-y-2.5 bg-[#0F1117] p-3 rounded-xl border border-[#222634]">
              <div className="flex items-start gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#6366F1] mt-1 shrink-0 shadow-[0_0_8px_#6366F1]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] uppercase font-bold tracking-wider text-[#94A3B8]">PICKUP POINT</p>
                  <p className="text-xs font-bold text-white truncate">{request.pickup_name}</p>
                </div>
              </div>

              <div className="ml-1 pl-0.5 border-l-2 border-dashed border-[#222634] h-2" />

              <div className="flex items-start gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white mt-1 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] uppercase font-bold tracking-wider text-[#94A3B8]">DESTINATION</p>
                  <p className="text-xs font-bold text-white truncate">{request.dest_name}</p>
                </div>
              </div>
            </div>

            {/* Rider & Trip Details Bar */}
            <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#0F1117] border border-[#222634] rounded-xl text-center">
              <div>
                <p className="text-[9px] uppercase text-[#94A3B8] font-semibold">Rider</p>
                <p className="text-xs font-bold text-white truncate">{ride.rider_name}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-[#94A3B8] font-semibold">Vehicle</p>
                <p className="text-xs font-bold text-white">{ride.vehicle || 'Bike'}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-[#94A3B8] font-semibold">Departure</p>
                <p className="text-xs font-mono font-bold text-zinc-200">{ride.time || '08:30'}</p>
              </div>
            </div>

            {/* Massive Centered Electric Indigo OTP Block (PROMINENT) */}
            <div className="bg-[#0F1117] border-2 border-[#6366F1] rounded-2xl p-4 text-center shadow-[0_0_20px_rgba(99,102,241,0.25)] space-y-2">
              <p className="text-[10px] font-bold tracking-widest uppercase text-[#6366F1] flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-ping" />
                SECURITY HANDSHAKE PIN
              </p>
              <div className="text-4xl sm:text-5xl font-mono text-[#6366F1] tracking-[0.4em] font-black my-2">
                {request.trip_otp || '----'}
              </div>
              <p className="text-[11px] text-[#94A3B8] leading-tight">
                Share this 4-digit PIN with driver <span className="text-white font-semibold">{ride.rider_name}</span> to unlock & start ride
              </p>
            </div>

            {/* Cancel Button is HIDDEN. Only Chat action is available */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-[#0F1117] hover:bg-[#1C1F2E] text-white text-xs font-bold border border-[#222634] hover:border-[#6366F1]/50 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#6366F1]" />
                <span>Chat with Rider ({ride.rider_name})</span>
              </button>
            </div>
          </div>
        )}

        {/* Rider Profile, Vehicle Inspection Card & Verified Reviews */}
        <RiderProfileCard />
      </div>

      {/* Safety info footer */}
      <div className="mt-auto pt-4 flex items-center justify-between text-[11px] text-[#94A3B8] px-1">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#6366F1]" />
          <span>Verified Student Security Handshake</span>
        </span>
        <span className="font-mono text-zinc-300">{ride.date || 'Today'} at {ride.time}</span>
      </div>

      {/* In-App Chat Modal */}
      {isChatOpen && (
        <RideChatModal
          rideId={request.ride_id}
          currentUser={user}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
};

export default PassengerActiveView;
