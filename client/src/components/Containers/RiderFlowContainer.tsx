import React, { useState, useEffect } from 'react';
import { User, Ride } from '../../types';
import { CreateRideView } from '../../views/Rider/CreateRideView';
import { RiderActiveRide } from '../../views/Rider/RiderActiveRide';
import { WalletView } from '../../views/Shared/WalletView';
import { HistoryView } from '../../views/Shared/HistoryView';
import { ProfileView } from '../../views/Shared/ProfileView';
import { BottomNav, NavTab } from '../Layout/BottomNav';
import { api } from '../../services/api';

interface RiderFlowContainerProps {
  initialUser: User;
  onLogout?: () => void;
  onSwitchRole?: () => void;
  onGoDashboard?: () => void;
}

export const RiderFlowContainer: React.FC<RiderFlowContainerProps> = ({
  initialUser,
  onLogout = () => {},
  onSwitchRole = () => {},
  onGoDashboard,
}) => {
  const [user, setUser] = useState<User>(initialUser);
  const [activeTab, setActiveTab] = useState<NavTab>('ride');
  const [activeRide, setActiveRide] = useState<Ride | null>(null);

  // Poll for active ride
  const checkActiveRide = async () => {
    try {
      const res = await api.getUserActiveRide(user.id);
      if (res.role === 'rider' && res.ride) {
        setActiveRide(res.ride);
      } else if (!res.ride && activeRide) {
        setActiveRide(null);
      }
    } catch (err) {
      console.error('Active ride check error:', err);
    }
  };

  useEffect(() => {
    checkActiveRide();
    const interval = setInterval(checkActiveRide, 1500);
    return () => clearInterval(interval);
  }, [user.id]);

  const handleRideCreated = (ride: Ride) => {
    setActiveRide(ride);
    setActiveTab('ride');
  };

  const handleRideCompleted = (_summary: any) => {
    setActiveRide(null);
    if (onGoDashboard) {
      onGoDashboard();
    } else {
      setActiveTab('wallet');
    }
  };

  const handleCancelRide = async () => {
    if (!activeRide) return;
    try {
      await api.cancelRide(activeRide.id);
      setActiveRide(null);
      setActiveTab('ride');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0F1117] overflow-hidden">
      {/* Viewport Content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {activeTab === 'ride' && (
          activeRide ? (
            <RiderActiveRide
              user={user}
              ride={activeRide}
              onRideCompleted={handleRideCompleted}
              onCancelRide={handleCancelRide}
            />
          ) : (
            <CreateRideView
              user={user}
              onRideCreated={handleRideCreated}
            />
          )
        )}

        {activeTab === 'wallet' && <WalletView user={user} />}
        {activeTab === 'history' && <HistoryView user={user} />}
        {activeTab === 'profile' && (
          <ProfileView
            user={user}
            onLogout={onLogout}
            onSwitchRole={onSwitchRole}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        role="rider"
        currentTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'home' && onGoDashboard) {
            onGoDashboard();
          } else {
            setActiveTab(tab);
          }
        }}
        onGoHome={onGoDashboard}
        hasActiveRide={!!activeRide}
      />
    </div>
  );
};
