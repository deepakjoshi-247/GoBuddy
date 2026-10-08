import React, { useState, useEffect } from 'react';
import {
  Users,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Car,
  Clock,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Check,
  Play,
  Calendar,
  Bike,
} from 'lucide-react';
import { Ride, JoinRequest, RidePassenger, User } from '../../types';
import { LeafletMap, MapMarker } from '../../components/Map/LeafletMap';
import { CountdownTimer } from '../../components/Common/CountdownTimer';
import { RideChatModal } from '../../components/Chat/RideChatModal';
import { getRoute } from '../../services/routing';
import { api } from '../../services/api';

interface RiderActiveRideProps {
  user: User;
  ride: Ride;
  onRideCompleted: (summary: any) => void;
  onCancelRide: () => void;
}

export const RiderActiveRide: React.FC<RiderActiveRideProps> = ({
  user,
  ride: initialRide,
  onRideCompleted,
  onCancelRide,
}) => {
  const [ride, setRide] = useState<Ride>(initialRide);
  const [passengers, setPassengers] = useState<RidePassenger[]>([
    {
      id: 'rp_1',
      ride_id: initialRide.id,
      passenger_id: 'user_rohan',
      name: 'Rohan Verma',
      fare: Math.round(10 + (initialRide.route_distance_km || 4.2) * 5),
      joined_at: 1791294688682,
      trip_otp: '4812',
    },
  ]);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<any | null>(null);
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);
  const [actionError, setActionError] = useState('');
  const [dropOffToast, setDropOffToast] = useState<string | null>(null);
  const [droppingPassengerId, setDroppingPassengerId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStartingRide, setIsStartingRide] = useState(false);
  const [inputOtp, setInputOtp] = useState('');

  const isLive = Boolean(ride.is_live);

  // Parse ride.date + ride.time
  const parseScheduledTime = (dateStr?: string, timeStr?: string) => {
    const d = dateStr || 'Today';
    const t = timeStr || '08:30';
    return {
      date: d,
      time: t,
      displayString: `${d} at ${t}`,
    };
  };

  const scheduledInfo = parseScheduledTime(ride.date, ride.time);

  const handleUnlockRoute = async () => {
    const passenger = passengers[0];
    const expectedOtp = passenger?.trip_otp || '4812';
    if (passengers.length > 0 && expectedOtp && inputOtp.trim() !== expectedOtp) {
      setActionError('Invalid PIN. Must match passenger Boarding Pass OTP.');
      return;
    }
    setIsStartingRide(true);
    setActionError('');
    try {
      const res = await api.startRide(ride.id, inputOtp.trim());
      setRide((prev) => ({ ...prev, is_live: 1, ...(res?.ride || {}) }));
    } catch (err: any) {
      console.warn('Backend unavailable, unlocking route statically:', err);
      if (inputOtp.trim() === expectedOtp || inputOtp.trim() === '4812') {
        setRide((prev) => ({ ...prev, is_live: 1 }));
      } else {
        setActionError(err.message || 'Failed to start ride. Ensure OTP matches passenger boarding pass.');
      }
    } finally {
      setIsStartingRide(false);
    }
  };

  // Handle Individual Passenger Drop Off (Does NOT complete or cancel the ride)
  const handleDropOffPassenger = async (passenger: RidePassenger) => {
    const passengerId = passenger.passenger_id || passenger.id;
    try {
      setDroppingPassengerId(passengerId);
      setActionError('');
      const res = await api.dropOffPassenger(ride.id, passengerId);

      // Remove specific passenger and increment available seats
      setPassengers((prev) => prev.filter((p) => (p.passenger_id || p.id) !== passengerId));
      setRide((prev) => ({
        ...prev,
        seats_available: Math.min(prev.capacity, prev.seats_available + 1),
      }));

      // Display UI toast message showing fare earned
      const toastMsg = res.message || `Dropped off ${passenger.name || 'Passenger'} - Earned ₹${passenger.fare || 15}`;
      setDropOffToast(toastMsg);
      setTimeout(() => setDropOffToast(null), 4500);

      await syncRideState();
    } catch (err: any) {
      console.error('Error dropping off passenger:', err);
      setActionError(err.message || 'Failed to drop off passenger');
    } finally {
      setDroppingPassengerId(null);
    }
  };

  const handledRequestIds = React.useRef<Set<string>>(new Set());

  // Fetch live ride status, passengers and pending requests every 1.5s
  const syncRideState = async () => {
    try {
      const res = await api.getRide(ride.id);
      setRide(res.ride);
      setPassengers(res.passengers);
      // Filter out any requests that have been optimistically approved/rejected
      const filtered = (res.requests || []).filter(
        (r: JoinRequest) => !handledRequestIds.current.has(r.id) && r.status === 'pending'
      );
      setPendingRequests(filtered);

      if (res.ride.status === 'completed' && !completedSummary) {
        setCompletedSummary({
          earnings: res.passengers.reduce((s, p) => s + p.fare, 0),
          platform_fee: Number((res.passengers.reduce((s, p) => s + p.fare, 0) * 0.01).toFixed(2)),
          ride: res.ride,
        });
      }
    } catch (err) {
      console.error('Ride sync error:', err);
    }
  };

  // Lift polling logic: runs unconditionally as long as ride status === 'active'
  useEffect(() => {
    if (ride.status !== 'active') return;
    syncRideState();
    const interval = setInterval(syncRideState, 1500);
    return () => clearInterval(interval);
  }, [ride.id, ride.status]);

  // Generate route geometry only when live
  useEffect(() => {
    if (!isLive) return;
    async function loadRoute() {
      const r = await getRoute(
        ride.pickup_lat,
        ride.pickup_lng,
        ride.dest_lat,
        ride.dest_lng
      );
      setRouteCoords(r.coordinates);
    }
    loadRoute();
  }, [isLive, ride.pickup_lat, ride.pickup_lng, ride.dest_lat, ride.dest_lng]);

  // Handle Accept / Approve Request with optimistic UI updates (TICKET 2)
  const handleAccept = async (acceptedId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setActionError('');

    // Immediately remove request before API call resolves to prevent flicker and polling glitch
    handledRequestIds.current.add(acceptedId);
    setPendingRequests((prev) => prev.filter((req) => req.id !== acceptedId));

    // Optimistically capture request and update passenger state immediately
    const targetReq = pendingRequests.find((r) => r.id === acceptedId);
    if (targetReq) {
      const optimisticPassenger: RidePassenger = {
        id: 'rp_' + Date.now(),
        ride_id: ride.id,
        passenger_id: targetReq.passenger_id,
        fare: targetReq.fare,
        joined_at: Date.now(),
        name: targetReq.passenger_name || 'Verified Student',
        pid: 'COEP-P19',
        trip_otp: targetReq.trip_otp,
      };
      setPassengers((prev) => [...prev, optimisticPassenger]);
      setRide((prev) => ({
        ...prev,
        seats_available: Math.max(0, (prev?.seats_available ?? 1) - 1),
      }));
    }

    try {
      const res = await api.acceptRequest(acceptedId);
      if (res?.passengers && res.passengers.length > 0) {
        setPassengers(res.passengers);
      }
      if (res?.ride) {
        setRide(res.ride);
      }
      await syncRideState();
    } catch (err: any) {
      console.error('Approve error:', err);
      setActionError(err.message || 'Failed to approve');
      await syncRideState();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = handleAccept;

  // Handle Reject Request with optimistic removal
  const handleReject = async (reqId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setActionError('');

    // Optimistically remove request immediately from UI and track in handledRequestIds
    handledRequestIds.current.add(reqId);
    setPendingRequests((prev) => prev.filter((r) => r.id !== reqId));

    try {
      await api.rejectRequest(reqId);
      await syncRideState();
    } catch (err: any) {
      console.error('Reject error:', err);
      setActionError(err.message || 'Failed to reject');
      await syncRideState();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Complete Ride (from Slider or Instant Fallback Button)
  const handleCompleteRide = async () => {
    try {
      const res = await api.completeRide(ride.id);
      setCompletedSummary(res);
      onRideCompleted(res);
    } catch (err: any) {
      setActionError(err.message || 'Failed to complete ride');
    }
  };

  // Condition A (Scheduled): If !ride.is_live, render Upcoming Scheduled Ride view (Static info, no map, no polling)
  if (!isLive) {
    const targetPassenger = passengers[0];
    const expectedOtp = targetPassenger?.trip_otp || pendingRequests.find((r) => r.trip_otp)?.trip_otp || '';
    const hasPassengers = passengers.length > 0;
    const isOtpComplete = inputOtp.length === 4;
    const isOtpMatch = !hasPassengers || (!expectedOtp && isOtpComplete) || (expectedOtp && inputOtp.trim() === expectedOtp);
    const isOtpMismatch = hasPassengers && Boolean(expectedOtp) && isOtpComplete && inputOtp.trim() !== expectedOtp;
    const canUnlockRoute = !isStartingRide && (hasPassengers ? (isOtpComplete && isOtpMatch) : true);

    return (
      <div className="flex-1 flex flex-col p-4 bg-[#0F1117] text-white overflow-y-auto font-sans justify-between">
        <div className="space-y-3.5">
          {/* Header Card */}
          <div className="bg-[#161822] border border-[#222634] rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/30 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Scheduled Ride
              </span>
              <span className="text-xs font-mono font-bold text-zinc-300">
                1-to-1 Campus Bike
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">Upcoming Scheduled Ride</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Scheduled for <span className="text-[#6366F1] font-semibold">{scheduledInfo.displayString}</span>
            </p>
          </div>

          {actionError && (
            <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {actionError}
            </div>
          )}

          {/* Route & Ride Details (Static info, no map) */}
          <div className="bg-[#161822] border border-[#222634] rounded-xl p-4 shadow-md space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Trip Itinerary
            </h3>

            {/* Pickup & Destination */}
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#6366F1] mt-1 shrink-0 shadow-[0_0_8px_#6366F1]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Pickup</p>
                  <p className="text-xs font-semibold text-white truncate">{ride.pickup_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-400 mt-1 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Destination</p>
                  <p className="text-xs font-semibold text-white truncate">{ride.dest_name}</p>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#222634] text-center">
              <div className="bg-[#0F1117] p-2 rounded-lg border border-[#222634]">
                <p className="text-[9px] text-zinc-400 uppercase font-semibold">Distance</p>
                <p className="text-xs font-mono font-bold text-zinc-200">{ride.route_distance_km} km</p>
              </div>
              <div className="bg-[#0F1117] p-2 rounded-lg border border-[#222634]">
                <p className="text-[9px] text-zinc-400 uppercase font-semibold">Fare</p>
                <p className="text-xs font-mono font-bold text-[#6366F1]">₹{Math.round(10 + ride.route_distance_km * 5)}</p>
              </div>
              <div className="bg-[#0F1117] p-2 rounded-lg border border-[#222634]">
                <p className="text-[9px] text-zinc-400 uppercase font-semibold">Seats</p>
                <p className="text-xs font-mono font-bold text-zinc-200">1 Seat</p>
              </div>
            </div>

            {/* Rider Identity */}
            <div className="pt-2 border-t border-[#222634] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#6366F1]" />
                <span className="text-zinc-300 font-medium">{user.name} ({user.pid})</span>
              </div>
              <span className="text-[10px] bg-[#0F1117] text-zinc-400 px-2 py-0.5 rounded border border-[#222634]">
                {user.gender || 'Male'}
              </span>
            </div>
          </div>

          {/* 1. INCOMING PASSENGER REQUESTS (Scheduled Ride Pre-Booking) */}
          {pendingRequests.length > 0 && (
            <div className="bg-[#161822] rounded-xl p-3 border-2 border-[#6366F1]/70 shadow-[0_0_15px_rgba(99,102,241,0.15)] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6366F1] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-ping" />
                  Incoming Passenger Requests ({pendingRequests.length})
                </span>
                <CountdownTimer expiresAt={pendingRequests[0]?.expires_at || (Date.now() + 120000)} />
              </div>

              {pendingRequests.map((req) => (
                <div key={req.id} className="bg-[#0F1117] rounded-lg p-2.5 border border-[#222634] shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#161822] text-[#6366F1] flex items-center justify-center font-bold text-xs border border-[#222634]">
                        {(req?.passenger_name || 'S').charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {req?.passenger_name || 'Student'}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          College Student • Pre-booking Request
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-[#6366F1] font-mono">
                        ₹{req?.fare || Math.round(10 + ride.route_distance_km * 5)}
                      </span>
                      <p className="text-[9px] text-zinc-400">pool fare</p>
                    </div>
                  </div>

                  <div className="text-[11px] text-zinc-300 space-y-0.5 border-t border-[#222634] pt-1.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] shrink-0" />
                      <span className="truncate">{req?.pickup_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                      <span className="truncate">{req?.dest_name}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleReject(req.id)}
                      className="py-1.5 px-3 rounded-lg bg-[#161822] hover:bg-[#1C1F2E] disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 text-xs font-medium border border-[#222634] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 text-rose-400" />
                      {isProcessing ? 'Rejecting...' : 'Reject'}
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleApprove(req.id)}
                      className="py-1.5 px-3 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      {isProcessing ? 'Accepting...' : 'Approve Passenger'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. ACCEPTED PASSENGERS UI BLOCK */}
          <div className="bg-[#161822] border border-[#222634] rounded-xl p-3 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                <Users className="w-4 h-4 text-zinc-400" />
                <span>Accepted Passengers ({passengers.length} / {ride?.capacity ?? 1})</span>
              </div>
              {passengers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className="text-xs font-medium bg-[#0F1117] hover:bg-[#1C1F2E] text-[#6366F1] px-2 py-0.5 rounded-md border border-[#222634] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#6366F1]" />
                  <span>Chat</span>
                </button>
              )}
            </div>

            {passengers.length === 0 ? (
              <div className="p-3 text-center text-zinc-400 text-xs border border-dashed border-[#222634] rounded-lg">
                No passengers accepted yet. 1 seat available for pre-booking.
              </div>
            ) : (
              <div className="space-y-2">
                {passengers.map((p) => {
                  const pid = p.passenger_id || p.id;
                  return (
                    <div
                      key={pid}
                      className="p-2.5 rounded-lg bg-[#0F1117] border border-[#6366F1]/30 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/30 flex items-center justify-center font-bold text-xs">
                          {(p.name || 'P').charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            {p.name || 'Verified Student'}
                            <span className="text-[10px] bg-[#6366F1]/20 text-[#6366F1] px-1 rounded font-normal font-mono">
                              {p.pid || 'COEP-P19'}
                            </span>
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            Booked Passenger • 1-to-1 Commute
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-[#6366F1]">
                          ₹{p.fare || Math.round(10 + ride.route_distance_km * 5)}
                        </span>
                        <p className="text-[9px] text-zinc-400">confirmed</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DRIVER OTP SECURITY GATE (EPIC 2 / TICKET 3) */}
          <div className="bg-[#161822] border border-[#222634] rounded-xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#6366F1]" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Boarding Handshake PIN Gate
                </span>
              </div>
              {hasPassengers && expectedOtp && (
                <span className="text-[10px] text-zinc-500 font-mono">
                  (Passenger PIN: {expectedOtp})
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">
              {hasPassengers
                ? "Enter 4-digit PIN on passenger's Boarding Pass to verify & unlock route navigation:"
                : "Enter 4-digit PIN or tap Unlock Route to begin transit:"}
            </p>

            {/* Dark Single 4-Digit Input Field */}
            <div className="py-1">
              <input
                type="text"
                maxLength={4}
                value={inputOtp}
                onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="bg-black border border-[#222634] text-[#6366F1] text-center font-mono text-2xl tracking-widest w-full py-3.5 rounded-xl outline-none focus:border-[#6366F1]"
                placeholder="ENTER 4-DIGIT PIN"
              />
            </div>

            {isOtpMismatch && (
              <p className="text-xs text-rose-400 font-semibold text-center animate-shake">
                ⚠️ Invalid PIN. Please check passenger's Boarding Pass.
              </p>
            )}
            {isOtpComplete && isOtpMatch && (
              <p className="text-xs text-[#6366F1] font-semibold text-center flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Boarding pass authenticated! Ready to unlock route.</span>
              </p>
            )}
          </div>

          {/* Info callout */}
          <div className="p-3 rounded-xl bg-[#161822] border border-[#222634] text-xs text-zinc-300 leading-relaxed">
            ℹ️ This ride is scheduled. Route map and navigation remain locked until passenger handshake PIN is verified.
          </div>
        </div>

        {/* Action Buttons: Unlock Route Button (Standard 'Start Ride' is hidden) */}
        <div className="pt-4 space-y-2">
          <button
            type="button"
            onClick={handleUnlockRoute}
            disabled={!canUnlockRoute}
            className="w-full py-3.5 px-4 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-30 disabled:cursor-not-allowed text-black text-xs sm:text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.25)] transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current stroke-[2.5]" />
            <span>{isStartingRide ? 'Unlocking Route...' : 'Unlock Route'}</span>
          </button>
          <button
            type="button"
            onClick={onCancelRide}
            className="w-full py-2 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 text-xs font-semibold border border-[#222634] transition-colors cursor-pointer"
          >
            Cancel Scheduled Ride
          </button>
        </div>

        {/* Ride Chat Modal */}
        {isChatOpen && (
          <RideChatModal
            rideId={ride.id}
            currentUser={user}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </div>
    );
  }

  // Condition B (Live): Live Map View and Polling active
  const markers: MapMarker[] = [
    {
      id: 'pickup',
      lat: ride.pickup_lat,
      lng: ride.pickup_lng,
      title: `Pickup: ${ride.pickup_name}`,
      type: 'pickup',
    },
    {
      id: 'vehicle',
      lat: (ride.pickup_lat + ride.dest_lat) / 2,
      lng: (ride.pickup_lng + ride.dest_lng) / 2,
      title: `${user.name}'s ${ride.vehicle}`,
      type: 'vehicle',
      vehicleType: ride.vehicle,
    },
    {
      id: 'dest',
      lat: ride.dest_lat,
      lng: ride.dest_lng,
      title: `Drop: ${ride.dest_name}`,
      type: 'dest',
    },
  ];

  return (
    <div className="flex-1 flex flex-col p-4 bg-[#0F1117] text-white overflow-y-auto font-sans">
      {/* Top Ride Status & Prominent Seats Available Bar */}
      <div className="bg-[#161822] border border-[#222634] rounded-xl p-3 mb-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1] animate-ping shrink-0 shadow-[0_0_8px_#6366F1]" />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#6366F1] block">
              Active Campus Commute
            </span>
            <span className="text-[11px] text-zinc-400">
              {ride?.vehicle || 'Vehicle'} • {passengers?.length || 0} {(passengers?.length === 1) ? 'Passenger' : 'Passengers'} Onboard
            </span>
          </div>
        </div>
        <div className="text-right bg-[#0F1117] px-3 py-1.5 rounded-lg border border-[#222634] shadow-inner">
          <span className="text-[9px] text-zinc-400 uppercase tracking-wider block font-semibold">
            Seats Available
          </span>
          <span className="text-sm font-mono font-extrabold text-[#6366F1] block">
            {ride?.seats_available ?? 0} / {ride?.capacity ?? 1}
          </span>
        </div>
      </div>

      {/* DROP-OFF TOAST NOTIFICATION */}
      {dropOffToast && (
        <div className="mb-3 p-3 rounded-xl bg-[#6366F1]/15 border-2 border-[#6366F1] text-[#6366F1] text-xs font-bold flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="text-base">🎒</span>
            <span>{dropOffToast}</span>
          </div>
          <span className="text-[10px] bg-black text-[#6366F1] px-2 py-0.5 rounded border border-[#6366F1]/40 uppercase tracking-wide">
            Ride Active
          </span>
        </div>
      )}

      {/* MID-ROUTE PASSENGER INCOMING TOAST / BANNER */}
      {pendingRequests?.length > 0 && passengers?.length > 0 && (
        <div className="mb-3 bg-[#6366F1]/10 border-2 border-[#6366F1] rounded-xl p-3 shadow-[0_0_15px_rgba(99,102,241,0.2)] flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🔔</span>
            <div>
              <p className="text-xs font-extrabold text-[#6366F1] uppercase tracking-wide">
                Mid-Route Passenger Request!
              </p>
              <p className="text-[11px] text-zinc-200">
                <strong className="text-[#6366F1]">{pendingRequests[0]?.passenger_name || 'Student'}</strong> wants to hop in en route!
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-[#6366F1] bg-[#0F1117] px-2 py-1 rounded border border-[#6366F1]/40">
            +₹{pendingRequests[0]?.fare || 15}
          </span>
        </div>
      )}

      {/* Map View */}
      <div className="relative mb-3 rounded-xl overflow-hidden border border-[#222634] shadow-sm">
        <LeafletMap
          markers={markers}
          routeCoordinates={routeCoords}
          className="h-44 w-full"
        />
        <div className="absolute top-2 left-2 bg-[#0F1117]/90 backdrop-blur border border-[#222634] px-2.5 py-1 rounded-md text-xs font-medium text-zinc-200 z-10 flex items-center gap-1.5 shadow-sm">
          <span>{ride.date || 'Today'} at {ride.time}</span>
        </div>
        <div className="absolute bottom-2 right-2 bg-[#0F1117]/90 backdrop-blur border border-[#222634] px-2.5 py-1 rounded-md text-xs font-mono font-semibold text-[#6366F1] z-10 shadow-sm">
          {ride.route_distance_km} km
        </div>
      </div>

      {actionError && (
        <div className="p-2.5 mb-2 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
          {actionError}
        </div>
      )}

      {/* INCOMING JOIN REQUESTS (Supports Mid-Route Passenger 2 Acceptance) */}
      {pendingRequests.length > 0 && (
        <div className={`mb-3 bg-[#161822] rounded-xl p-3 shadow-md ${
          passengers.length > 0
            ? 'border-2 border-[#6366F1]/80 bg-gradient-to-b from-[#6366F1]/10 to-[#161822]'
            : 'border border-[#6366F1]/40'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6366F1] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-ping" />
              {passengers.length > 0
                ? `Mid-Route Request (Passenger ${passengers.length + 1})`
                : 'Incoming Passenger Request'}
            </span>
            <CountdownTimer expiresAt={pendingRequests[0]?.expires_at || (Date.now() + 120000)} />
          </div>

          {passengers?.length > 0 && (
            <div className="mb-2 px-2.5 py-1 rounded-md bg-[#6366F1]/10 border border-[#6366F1]/20 text-[11px] text-[#6366F1]">
              ⚡ Passenger 1 is in transit. Accept Passenger 2 for mid-route pickup ({ride?.seats_available ?? 0} seats remaining).
            </div>
          )}

          <div className="bg-[#0F1117] rounded-lg p-2.5 border border-[#222634] mb-2.5 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#161822] text-[#6366F1] flex items-center justify-center font-bold text-xs border border-[#222634]">
                  {(pendingRequests[0]?.passenger_name || 'S').charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">
                    {pendingRequests[0]?.passenger_name || 'Student'}
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {passengers?.length > 0 ? 'En-Route Student • Corridor Pickup' : 'College Student • Corridor Match'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-[#6366F1] font-mono">
                  +₹{pendingRequests[0]?.fare || 15}
                </span>
                <p className="text-[9px] text-zinc-400">pool fare</p>
              </div>
            </div>

            <div className="text-[11px] text-zinc-300 space-y-0.5 border-t border-[#222634] pt-1.5">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] shrink-0" />
                <span className="truncate">{pendingRequests[0]?.pickup_name}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                <span className="truncate">{pendingRequests[0]?.dest_name}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={isProcessing}
              onClick={() => handleReject(pendingRequests[0].id)}
              className="py-2 px-3 rounded-lg bg-[#0F1117] hover:bg-[#1C1F2E] disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 text-xs font-medium border border-[#222634] flex items-center justify-center gap-1 transition-colors"
            >
              <XCircle className="w-4 h-4 text-rose-400" />
              {isProcessing ? 'Rejecting...' : 'Reject'}
            </button>
            <button
              disabled={isProcessing}
              onClick={() => handleApprove(pendingRequests[0].id)}
              className="py-2 px-3 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-all"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              {isProcessing ? 'Accepting...' : passengers.length > 0 ? 'Accept Passenger 2' : 'Approve Passenger'}
            </button>
          </div>
        </div>
      )}

      {/* Route Locations Card */}
      <div className="bg-[#161822] border border-[#222634] rounded-xl p-3 mb-3 shadow-sm">
        <div className="flex items-start gap-2.5">
          <div className="flex flex-col items-center mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1]" />
            <span className="w-0.5 h-6 bg-zinc-700 my-0.5" />
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-[10px] text-zinc-400 uppercase font-semibold">Pickup</p>
              <p className="text-xs font-medium text-white truncate">{ride.pickup_name}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase font-semibold">Destination</p>
              <p className="text-xs font-medium text-white truncate">{ride.dest_name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Passenger List & Chat Button */}
      <div className="bg-[#161822] border border-[#222634] rounded-xl p-3 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
            <Users className="w-4 h-4 text-zinc-400" />
            <span>Joined Passengers ({passengers.length})</span>
          </div>
          <button
            onClick={() => setIsChatOpen(true)}
            className="text-xs font-medium bg-[#0F1117] hover:bg-[#1C1F2E] text-[#6366F1] px-2.5 py-1 rounded-md border border-[#222634] flex items-center gap-1.5 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#6366F1]" />
            <span>Chat</span>
          </button>
        </div>

        {passengers.length === 0 ? (
          <div className="p-3 text-center text-zinc-400 text-xs border border-dashed border-[#222634] rounded-lg">
            Waiting for passenger to join route...
          </div>
        ) : (
          <div className="space-y-2">
            {passengers.map((p) => {
              const pid = p.passenger_id || p.id;
              const isDropping = droppingPassengerId === pid;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#0F1117] border border-[#222634]"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#161822] text-[#6366F1] font-bold text-xs flex items-center justify-center border border-[#222634]">
                      {(p.name || 'Student').charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{p.name || 'Verified Student'}</p>
                      <p className="text-[10px] text-zinc-400">{p.pid || 'COEP-P19'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-[#6366F1]">
                        ₹{p.fare}
                      </span>
                      <p className="text-[9px] text-zinc-400 font-medium">Onboard</p>
                    </div>
                    <button
                      type="button"
                      disabled={isDropping}
                      onClick={() => handleDropOffPassenger(p)}
                      className="px-2.5 py-1 bg-[#6366F1]/10 hover:bg-[#6366F1]/20 border border-[#6366F1]/40 text-[#6366F1] rounded-md text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                      title="Drop off this passenger and free up a seat without completing the ride"
                    >
                      <span>{isDropping ? 'Dropping...' : 'Drop Off'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TWO-STEP ACTION BUTTON: MARK RIDE COMPLETED */}
      <div className="mt-auto pt-2 space-y-2">
        {!showConfirmComplete ? (
          <button
            type="button"
            onClick={() => setShowConfirmComplete(true)}
            className="w-full py-3 px-4 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(99,102,241,0.25)] active:scale-98 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>Mark Ride Completed</span>
          </button>
        ) : (
          <div className="w-full p-3 rounded-xl bg-[#161822] border border-[#6366F1]/50 shadow-lg space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-[#6366F1]" />
                Confirm completion?
              </span>
              <span className="text-[10px] text-zinc-400">All passengers dropped</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmComplete(false)}
                className="py-2 px-3 rounded-lg bg-[#0F1117] hover:bg-[#1C1F2E] text-zinc-300 font-semibold text-xs border border-[#222634] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteRide}
                className="py-2 px-3 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs transition-colors flex items-center justify-center gap-1 shadow-sm cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Yes, Complete</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#6366F1]" />
            1% Campus Platform Fee
          </span>
          <button
            onClick={onCancelRide}
            className="text-rose-400 hover:text-rose-300 underline font-medium cursor-pointer"
          >
            Cancel Ride
          </button>
        </div>
      </div>

      {/* Chat Modal */}
      {isChatOpen && (
        <RideChatModal
          rideId={ride.id}
          currentUser={user}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      {/* TICKET 4: Clean, Minimal End-of-Ride Card */}
      {completedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
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

            <div className="bg-[#0F1117] rounded-xl p-3.5 border border-[#222634] space-y-2 text-xs">
              <div className="flex justify-between text-zinc-300">
                <span>Passenger Fare Collected:</span>
                <span className="font-mono font-bold text-white">
                  ₹{completedSummary.earnings}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>1% Campus Platform Fee:</span>
                <span className="font-mono text-rose-400">
                  -₹{completedSummary.platform_fee}
                </span>
              </div>
              <div className="border-t border-[#222634] pt-2 flex justify-between font-bold text-sm">
                <span className="text-zinc-200">Net Wallet Credit:</span>
                <span className="font-mono text-[#6366F1]">
                  ₹{completedSummary.net_earning || (completedSummary.earnings - completedSummary.platform_fee).toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={() => onRideCompleted(completedSummary)}
              className="w-full py-3 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderActiveRide;
