import React, { useState, useEffect } from 'react';
import { User, UserRole, Ride, JoinRequest } from './types';
import { TopHeader } from './components/Layout/TopHeader';
import { MobileFrame } from './components/Layout/MobileFrame';
import { LoginView } from './views/Auth/LoginView';
import { DashboardView } from './views/Dashboard/DashboardView';
import { RiderFlowContainer } from './components/Containers/RiderFlowContainer';
import { PassengerFlowContainer } from './components/Containers/PassengerFlowContainer';
import { DualDemoSplitView } from './views/Shared/DualDemoSplitView';
import { LogsView } from './views/LogsView';
import { api } from './services/api';

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const [postLoginView, setPostLoginView] = useState<'dashboard' | 'passenger' | 'rider'>('dashboard');

  // Independent Role-based storage keys to guarantee 100% isolated sessions in dual-view
  const isPassengerRoute = currentPath.startsWith('/passenger');
  const isRiderRoute = currentPath.startsWith('/rider');
  const isLogsRoute = currentPath.startsWith('/logs');
  const isRootDualView = !isPassengerRoute && !isRiderRoute && !isLogsRoute;

  const storageKey = isPassengerRoute
    ? 'chalona_user_passenger'
    : isRiderRoute
    ? 'chalona_user_rider'
    : 'chalona_user';

  // Force login on fresh application load/refresh: clear cached session in localStorage
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      localStorage.removeItem('chalona_user_passenger');
      localStorage.removeItem('chalona_user_rider');
      localStorage.removeItem('chalona_user');
      localStorage.removeItem('gobuddy_user_passenger');
      localStorage.removeItem('gobuddy_user_rider');
      localStorage.removeItem('gobuddy_user');
    } catch {}
    return null;
  });

  // Track browser history popstate
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentPath(path);

      if (path.startsWith('/passenger')) {
        const saved = localStorage.getItem('chalona_user_passenger');
        if (saved) {
          try {
            const u = JSON.parse(saved);
            if (u.role === 'passenger') {
              setCurrentUser(u);
              return;
            }
          } catch {}
        }
        setCurrentUser(null);
      } else if (path.startsWith('/rider')) {
        const saved = localStorage.getItem('chalona_user_rider');
        if (saved) {
          try {
            const u = JSON.parse(saved);
            if (u.role === 'rider') {
              setCurrentUser(u);
              return;
            }
          } catch {}
        }
        setCurrentUser(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setPostLoginView('dashboard');
    if (user.role === 'passenger') {
      localStorage.setItem('chalona_user_passenger', JSON.stringify(user));
      if (!window.location.pathname.startsWith('/passenger')) {
        window.history.pushState({}, '', '/passenger');
        setCurrentPath('/passenger');
      }
    } else {
      localStorage.setItem('chalona_user_rider', JSON.stringify(user));
      if (!window.location.pathname.startsWith('/rider')) {
        window.history.pushState({}, '', '/rider');
        setCurrentPath('/rider');
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPostLoginView('dashboard');
    if (isPassengerRoute) {
      localStorage.removeItem('chalona_user_passenger');
    } else if (isRiderRoute) {
      localStorage.removeItem('chalona_user_rider');
    } else {
      localStorage.removeItem('chalona_user');
    }
  };

  const handleSwitchPortal = (newRole: UserRole) => {
    const target = newRole === 'rider' ? '/rider' : '/passenger';
    if (window.location.pathname !== target) {
      window.history.pushState({}, '', target);
      setCurrentPath(target);
    }
  };

  const handleSwitchRole = async () => {
    if (!currentUser) return;
    const nextRole: UserRole = currentUser.role === 'rider' ? 'passenger' : 'rider';
    try {
      const res = await api.login(currentUser.name, currentUser.pid, nextRole);
      setCurrentUser(res.user);
      if (nextRole === 'passenger') {
        localStorage.setItem('chalona_user_passenger', JSON.stringify(res.user));
        setPostLoginView('passenger');
      } else {
        localStorage.setItem('chalona_user_rider', JSON.stringify(res.user));
        setPostLoginView('rider');
      }
    } catch (err) {
      console.error('Role switch failed:', err);
    }
  };

  const handleFindRide = async () => {
    if (!currentUser) return;
    if (currentUser.role !== 'passenger') {
      try {
        const res = await api.login(currentUser.name, currentUser.pid, 'passenger');
        setCurrentUser(res.user);
        localStorage.setItem('chalona_user_passenger', JSON.stringify(res.user));
      } catch {
        setCurrentUser({ ...currentUser, role: 'passenger' });
      }
    }
    setPostLoginView('passenger');
  };

  const handleOfferRide = async () => {
    if (!currentUser) return;
    if (currentUser.role !== 'rider') {
      try {
        const res = await api.login(currentUser.name, currentUser.pid, 'rider');
        setCurrentUser(res.user);
        localStorage.setItem('chalona_user_rider', JSON.stringify(res.user));
      } catch {
        setCurrentUser({ ...currentUser, role: 'rider' });
      }
    }
    setPostLoginView('rider');
  };

  const handleOpenActiveRide = (_ride: Ride, request?: JoinRequest) => {
    if (!currentUser) return;
    if (request || currentUser.role === 'passenger') {
      setPostLoginView('passenger');
    } else {
      setPostLoginView('rider');
    }
  };

  // Case 1: Logs View
  if (isLogsRoute) {
    return <LogsView onBack={() => window.history.back()} />;
  }

  // Case 2: DEFAULT ROOT `/`: DUAL SPLIT-SCREEN VIEW
  if (isRootDualView) {
    return <DualDemoSplitView onOpenLogs={() => (window.location.href = '/logs')} />;
  }

  // Case 3: Dedicated Sub-route (`/passenger` or `/rider`)
  const portalRole: UserRole = isPassengerRoute ? 'passenger' : 'rider';

  return (
    <div className="min-h-screen bg-[#0F1117] flex flex-col font-sans">
      <TopHeader
        user={currentUser}
        onLogout={handleLogout}
        onRoleSwitch={handleSwitchRole}
        onOpenLogs={() => (window.location.href = '/logs')}
        onGoDashboard={() => setPostLoginView('dashboard')}
      />

      <MobileFrame>
        {!currentUser ? (
          <LoginView
            initialRole={portalRole}
            onLoginSuccess={handleLoginSuccess}
            onSwitchPortal={handleSwitchPortal}
          />
        ) : postLoginView === 'dashboard' ? (
          <DashboardView
            user={currentUser}
            onFindRide={handleFindRide}
            onOfferRide={handleOfferRide}
            onOpenActiveRide={handleOpenActiveRide}
          />
        ) : currentUser.role === 'rider' ? (
          <RiderFlowContainer
            initialUser={currentUser}
            onLogout={handleLogout}
            onSwitchRole={handleSwitchRole}
            onGoDashboard={() => setPostLoginView('dashboard')}
          />
        ) : (
          <PassengerFlowContainer
            initialUser={currentUser}
            onLogout={handleLogout}
            onSwitchRole={handleSwitchRole}
            onGoDashboard={() => setPostLoginView('dashboard')}
          />
        )}
      </MobileFrame>
    </div>
  );
}

export default App;
