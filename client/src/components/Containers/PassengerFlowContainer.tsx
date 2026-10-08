import React, { useState, useEffect } from 'react';
import { User, Ride, JoinRequest } from '../../types';
import { FindRideView } from '../../views/Passenger/FindRideView';
import { HistoryView } from '../../views/Shared/HistoryView';
import { ProfileView } from '../../views/Shared/ProfileView';
import { BottomNav, NavTab } from '../Layout/BottomNav';
import { ActiveRideBottomSheet } from '../Passenger/ActiveRideBottomSheet';
import { api } from '../../services/api';

interface PassengerFlowContainerProps {
  initialUser: User;
  onLogout?: () => void;
  onSwitchRole?: () => void;
  onGoDashboard?: () => void;
}

export const PassengerFlowContainer: React.FC<PassengerFlowContainerProps> = ({
  initialUser,
  onLogout = () => {},
  onSwitchRole = () => {},
  onGoDashboard,
}) => {
  const [user, setUser] = useState<User>(initialUser);
  const [activeTab, setActiveTab] = useState<NavTab>('ride');
  const [activeRequest, setActiveRequest] = useState<JoinRequest | null>(null);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const hasAlertedCancelled = React.useRef(false);

  const handleRideCancelled = () => {
    if (hasAlertedCancelled.current) return;
    hasAlertedCancelled.current = true;
    setActiveRequest(null);
    setActiveRide(null);
    setIsBottomSheetExpanded(false);
    setActiveTab('ride');
    window.history.replaceState(null, '', '/passenger/dashboard');
    if (onGoDashboard) {
      onGoDashboard();
    } else {
      alert('Ride was cancelled by the rider');
    }
  };

  const handleDroppedOff = () => {
    setActiveRequest(null);
    setActiveRide(null);
    setIsBottomSheetExpanded(false);
    setActiveTab('ride');
    window.history.replaceState(null, '', '/passenger/dashboard');
    setToastMessage('Trip Finished / Dropped Off');
    setTimeout(() => {
      setToastMessage(null);
      if (onGoDashboard) onGoDashboard();
    }, 2000);
  };

  const handleRejected = (customMsg?: string) => {
    setActiveRequest(null);
    setActiveRide(null);
    setIsBottomSheetExpanded(false);
    setActiveTab('ride');
    window.history.replaceState(null, '', '/passenger/dashboard');
    setToastMessage(customMsg || 'Rider declined');
    setTimeout(() => {
      setToastMessage(null);
      if (onGoDashboard) onGoDashboard();
    }, 1500);
  };

  // Poll for active passenger request or joined ride every 1.5s
  const checkActiveStatus = async () => {
    try {
      const res = await api.getUserActiveRide(user.id);
      if ((res as any).role === 'passenger_completed') {
        handleDroppedOff();
        return;
      }
      if (res.role === 'passenger_request' && res.request && res.ride) {
        if (res.request.status === 'rejected') {
          handleRejected('Rider declined');
          return;
        }
        if (res.request.status === 'completed' || res.request.status === 'dropped_off') {
          handleDroppedOff();
          return;
        }
        if (res.request.status === 'cancelled' || res.ride.status === 'cancelled') {
          handleRideCancelled();
          return;
        }
        setActiveRequest(res.request);
        setActiveRide(res.ride);
      } else if (res.role === 'passenger' && res.ride) {
        if (res.ride.status === 'completed') {
          handleRideCompleted();
          return;
        }
        if (res.ride.status === 'cancelled') {
          handleRideCancelled();
          return;
        }
        setActiveRide(res.ride);
        // Create mock request object for view if joined
        if (!activeRequest) {
          setActiveRequest({
            id: 'rp_' + res.ride.id,
            ride_id: res.ride.id,
            passenger_id: user.id,
            passenger_name: user.name,
            pickup_name: res.ride.pickup_name,
            pickup_lat: res.ride.pickup_lat,
            pickup_lng: res.ride.pickup_lng,
            dest_name: res.ride.dest_name,
            dest_lat: res.ride.dest_lat,
            dest_lng: res.ride.dest_lng,
            distance_km: res.ride.route_distance_km,
            fare: (res.ride as any).fare || 40,
            status: 'approved',
            expires_at: Date.now() + 100000,
            created_at: Date.now(),
          });
        }
      } else if (!res.ride && (activeRide || activeRequest)) {
        if (activeRequest?.status === 'completed' || activeRequest?.status === 'dropped_off') {
          handleDroppedOff();
        } else {
          handleRideCancelled();
        }
      }
    } catch (err) {
      console.error('Passenger active check error:', err);
    }
  };

  useEffect(() => {
    checkActiveStatus();
    const interval = setInterval(checkActiveStatus, 1500);
    return () => clearInterval(interval);
  }, [user.id]);

  const handleRequestSent = (request: JoinRequest, ride: Ride) => {
    hasAlertedCancelled.current = false;
    setActiveRequest(request);
    setActiveRide(ride);
    setIsBottomSheetExpanded(true); // Open expanded view to show initial pending confirmation
    setActiveTab('ride');
  };

  const handleRideCompleted = () => {
    setActiveRequest(null);
    setActiveRide(null);
    setIsBottomSheetExpanded(false);
    if (onGoDashboard) {
      onGoDashboard();
    } else {
      setActiveTab('history');
    }
  };

  const handleBackToSearch = () => {
    setIsBottomSheetExpanded(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0F1117] text-white overflow-hidden relative">
      {/* Viewport Content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {activeTab === 'ride' && (
          <FindRideView
            user={user}
            onRequestSent={handleRequestSent}
            hasActiveRide={!!(activeRequest && activeRide)}
            onExpandActiveRide={() => setIsBottomSheetExpanded(true)}
          />
        )}

        {activeTab === 'history' && <HistoryView user={user} />}
        {activeTab === 'profile' && (
          <ProfileView
            user={user}
            onLogout={onLogout}
            onSwitchRole={onSwitchRole}
          />
        )}
      </div>

      {/* FLOATING BOTTOM SHEET FOR ACTIVE RIDE (SWIGGY / UBER STYLE) */}
      {activeRequest && activeRide && (
        <ActiveRideBottomSheet
          user={user}
          request={activeRequest}
          ride={activeRide}
          isExpanded={isBottomSheetExpanded}
          onToggleExpand={() => setIsBottomSheetExpanded((prev) => !prev)}
          onBackToSearch={handleBackToSearch}
          onRideCompleted={handleRideCompleted}
          onRideCancelled={handleRideCancelled}
          onDroppedOff={handleDroppedOff}
          onRejected={handleRejected}
        />
      )}

      {/* Trip Finished / Dropped Off / Rejection Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between p-3.5 bg-[#161822] text-white rounded-xl shadow-2xl font-semibold text-xs border border-[#6366F1] shadow-[0_0_15px_rgba(99,102,241,0.3)] animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#6366F1]/20 text-[#6366F1] border border-[#6366F1]/40 flex items-center justify-center text-xs font-bold">✓</span>
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-zinc-400 hover:text-white px-2 py-0.5 rounded text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Persistent Bottom Navigation - ALWAYS UNLOCKED */}
      <BottomNav
        role="passenger"
        currentTab={activeTab}
        onTabChange={(tab) => {
          setIsBottomSheetExpanded(false); // Collapses active ride overlay to bottom card when switching tabs
          if (tab === 'home' && onGoDashboard) {
            onGoDashboard();
          } else {
            setActiveTab(tab);
          }
        }}
        onGoHome={onGoDashboard}
        hasActiveRide={!!activeRequest || !!activeRide}
      />
    </div>
  );
};
