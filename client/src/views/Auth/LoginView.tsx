import React, { useState } from 'react';
import {
  User as UserIcon,
  IdCard,
  Mail,
  Phone,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Bike,
  Compass,
  ExternalLink,
} from 'lucide-react';
import { User, UserRole, VehicleType } from '../../types';
import { api } from '../../services/api';
import { ChaloNaLogo } from '../../components/Common/ChaloNaLogo';

interface LoginViewProps {
  initialRole?: UserRole;
  onLoginSuccess: (user: User) => void;
  onSwitchPortal?: (newRole: UserRole) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  initialRole = 'passenger',
  onLoginSuccess,
  onSwitchPortal,
}) => {
  const [currentRole, setCurrentRole] = useState<UserRole>(initialRole);
  const [tab, setTab] = useState<'signin' | 'register'>('signin');

  // Form State
  const [name, setName] = useState('');
  const [pid, setPid] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState<VehicleType>('Bike');
  const [gender, setGender] = useState<'Male' | 'Female'>('Female');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isRider = currentRole === 'rider';

  // Quick Demo Auto-fill Helper
  const handleFillDemo = () => {
    if (isRider) {
      setName('Aarav Sharma');
      setPid('COEP-2024-R42');
      setEmail('aarav.sharma@coep.ac.in');
      setPhone('+91 98201 12345');
      setVehicle('Bike');
      setGender('Male');
    } else {
      setName('Rohan Verma');
      setPid('COEP-2024-P19');
      setEmail('rohan.verma@coep.ac.in');
      setPhone('+91 98302 23456');
      setGender('Male');
    }
    setError('');
  };

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    setError('');
    if (onSwitchPortal) {
      onSwitchPortal(role);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (tab === 'signin') {
      if (!name.trim() || !pid.trim()) {
        setError('Please enter your Full Name and College PID');
        return;
      }

      setIsLoading(true);

      const loginCall = api.login(name.trim(), pid.trim(), currentRole, gender);
      const twoSecondTimer = new Promise((resolve) => setTimeout(resolve, 2000));

      Promise.all([loginCall, twoSecondTimer])
        .then(([res]) => {
          const userWithGender = { ...res.user, gender: res.user.gender || gender };
          try {
            localStorage.setItem('chalona_user', JSON.stringify(userWithGender));
            localStorage.setItem('gobuddy_user', JSON.stringify(userWithGender));
            if (currentRole === 'passenger') {
              localStorage.setItem('chalona_user_passenger', JSON.stringify(userWithGender));
              localStorage.setItem('gobuddy_user_passenger', JSON.stringify(userWithGender));
            } else {
              localStorage.setItem('chalona_user_rider', JSON.stringify(userWithGender));
              localStorage.setItem('gobuddy_user_rider', JSON.stringify(userWithGender));
            }
          } catch (e) {}
          onLoginSuccess(userWithGender);
        })
        .catch((err: any) => {
          setError(err.message || 'Sign in failed. Please verify your credentials.');
          setIsLoading(false);
        });
    } else {
      // New Registration / Create Account
      if (!name.trim() || !pid.trim() || !email.trim() || !phone.trim()) {
        setError('Please fill in all registration fields');
        return;
      }

      setIsLoading(true);

      const registerCall = api.register({
        name: name.trim(),
        email: email.trim(),
        pid: pid.trim(),
        phone: phone.trim(),
        role: currentRole,
        vehicle: isRider ? vehicle : undefined,
        gender,
      });
      const twoSecondTimer = new Promise((resolve) => setTimeout(resolve, 2000));

      Promise.all([registerCall, twoSecondTimer])
        .then(([res]) => {
          const userWithGender = { ...res.user, gender: res.user.gender || gender };
          try {
            localStorage.setItem('chalona_user', JSON.stringify(userWithGender));
            localStorage.setItem('gobuddy_user', JSON.stringify(userWithGender));
            if (currentRole === 'passenger') {
              localStorage.setItem('chalona_user_passenger', JSON.stringify(userWithGender));
              localStorage.setItem('gobuddy_user_passenger', JSON.stringify(userWithGender));
            } else {
              localStorage.setItem('chalona_user_rider', JSON.stringify(userWithGender));
              localStorage.setItem('gobuddy_user_rider', JSON.stringify(userWithGender));
            }
          } catch (e) {}
          onLoginSuccess(userWithGender);
        })
        .catch((err: any) => {
          setError(err.message || 'Registration failed. Please check your information.');
          setIsLoading(false);
        });
    }
  };

  // Centered 2-Second Transition Screen with Required Universal Quote
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0F1117] text-white text-center animate-in fade-in duration-300">
        <div className="max-w-xs w-full flex flex-col items-center space-y-6">
          {/* Logo & Ambient Electric Indigo Spinner */}
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-[#161822] border border-[#222634] flex items-center justify-center shadow-lg">
              <ChaloNaLogo size={24} className="w-6 h-6 text-[#6366F1]" />
            </div>
            <div className="absolute -inset-2.5 rounded-3xl border-2 border-[#222634] border-t-[#6366F1] animate-spin" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold tracking-tight text-white">
              {tab === 'signin' ? 'Authenticating...' : 'Creating Campus Profile...'}
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Routing into {isRider ? 'Rider' : 'Passenger'} Network
            </p>
          </div>

          {/* EXACT Required Universal Student Quote */}
          <div className="w-full bg-[#161822] border border-[#222634] rounded-xl p-4 shadow-md space-y-2 text-center">
            <blockquote className="text-xs sm:text-sm font-medium text-zinc-200 italic leading-relaxed">
              "Small steps every day lead to big destinations."
            </blockquote>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6366F1]" />
            <span>Entering your dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 bg-[#0F1117] text-white font-sans">
      <div className="w-full max-w-sm mx-auto">
        {/* Brand Header */}
        <div className="text-center pt-3 pb-4">
          <div className="inline-flex items-center justify-center mb-2">
            <div className="w-12 h-12 rounded-xl bg-[#161822] border border-[#222634] flex items-center justify-center shadow-md">
              <ChaloNaLogo size={22} className="w-5.5 h-5.5 text-white" />
            </div>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-1 font-mono">
            <span>g</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1] shadow-[0_0_8px_#6366F1] inline-block" />
            <span>BUDDY.</span>
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            College Peer Mobility & Ride-Sharing
          </p>
        </div>

        {/* 1. TOP EXPLICIT ROLE SELECTOR: [ Passenger ] | [ Rider ] */}
        <div className="flex bg-[#161822] p-1 rounded-xl border border-[#222634] mb-3 shadow-sm">
          <button
            type="button"
            onClick={() => handleRoleChange('passenger')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              !isRider
                ? 'bg-[#6366F1] text-white shadow-sm font-extrabold'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Passenger</span>
          </button>
          <button
            type="button"
            onClick={() => handleRoleChange('rider')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isRider
                ? 'bg-[#6366F1] text-white shadow-sm font-extrabold'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Rider</span>
          </button>
        </div>

        {/* Auth Card: Elevated Slate (#161822) with subtle border (#222634) */}
        <div className="bg-[#161822] border border-[#222634] rounded-2xl p-4 sm:p-5 shadow-lg">
          {/* 2. FORM TOGGLE: [ Sign In ] | [ Create Account ] */}
          <div className="flex bg-[#0F1117] p-1 rounded-lg border border-[#222634] mb-4">
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                setError('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                tab === 'signin'
                  ? 'bg-[#222634] text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                tab === 'register'
                  ? 'bg-[#222634] text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="p-2.5 mb-3.5 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Field: Full Name */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isRider ? 'e.g. Aarav Sharma' : 'e.g. Rohan Verma'}
                  required
                  className="w-full bg-[#0F1117] border border-[#222634] rounded-lg py-2 pl-9 pr-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
                />
              </div>
            </div>

            {/* Create Account Field: College Email */}
            {tab === 'register' && (
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  College Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. student@coep.ac.in"
                    required
                    className="w-full bg-[#0F1117] border border-[#222634] rounded-lg py-2 pl-9 pr-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
                  />
                </div>
              </div>
            )}

            {/* Field: PID / College ID */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                PID / College ID
              </label>
              <div className="relative">
                <IdCard className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={pid}
                  onChange={(e) => setPid(e.target.value)}
                  placeholder={isRider ? 'e.g. COEP-2024-R42' : 'e.g. COEP-2024-P19'}
                  required
                  className="w-full bg-[#0F1117] border border-[#222634] rounded-lg py-2 pl-9 pr-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] font-mono"
                />
              </div>
            </div>

            {/* Required Gender Radio Group with [ID Verified] Badge */}
            <fieldset>
              <div className="flex items-center justify-between mb-1.5">
                <legend className="text-xs font-semibold text-zinc-300">
                  Gender Identification <span className="text-[#6366F1]">*</span>
                </legend>
                <span className="text-[10px] bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/30 px-1.5 py-0.5 rounded font-bold font-mono">
                  [ID Verified]
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-required="true">
                <label
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    gender === 'Male'
                      ? 'border-[#6366F1] bg-[#6366F1]/10 text-[#6366F1] shadow-xs'
                      : 'border-[#222634] bg-[#0F1117] text-zinc-400 hover:bg-[#161822]'
                  }`}
                >
                  <input
                    type="radio"
                    name="user_gender"
                    value="Male"
                    checked={gender === 'Male'}
                    onChange={() => setGender('Male')}
                    required
                    className="accent-[#6366F1] w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>👨 Male</span>
                </label>
                <label
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    gender === 'Female'
                      ? 'border-[#6366F1] bg-[#6366F1]/10 text-[#6366F1] shadow-xs'
                      : 'border-[#222634] bg-[#0F1117] text-zinc-400 hover:bg-[#161822]'
                  }`}
                >
                  <input
                    type="radio"
                    name="user_gender"
                    value="Female"
                    checked={gender === 'Female'}
                    onChange={() => setGender('Female')}
                    required
                    className="accent-[#6366F1] w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>👩 Female</span>
                </label>
              </div>
            </fieldset>

            {/* Create Account Field: Phone Number */}
            {tab === 'register' && (
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    required
                    className="w-full bg-[#0F1117] border border-[#222634] rounded-lg py-2 pl-9 pr-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
                  />
                </div>
              </div>
            )}

            {/* Create Account Field: Vehicle Type (ONLY IF RIDER) */}
            {tab === 'register' && isRider && (
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Registered Vehicle Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVehicle('Bike')}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      vehicle === 'Bike'
                        ? 'border-[#6366F1] bg-[#6366F1]/10 font-semibold text-white'
                        : 'border-[#222634] bg-[#0F1117] text-zinc-400 hover:bg-[#161822]'
                    }`}
                  >
                    <div className="text-base mb-0.5">🏍️</div>
                    <div className="text-xs font-bold text-zinc-200">Campus Bike</div>
                    <div className="text-[10px] text-zinc-400">1 Seat • ₹8/km</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVehicle('Rickshaw')}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      vehicle === 'Rickshaw'
                        ? 'border-[#6366F1] bg-[#6366F1]/10 font-semibold text-white'
                        : 'border-[#222634] bg-[#0F1117] text-zinc-400 hover:bg-[#161822]'
                    }`}
                  >
                    <div className="text-base mb-0.5">🛺</div>
                    <div className="text-xs font-bold text-zinc-200">Rickshaw</div>
                    <div className="text-[10px] text-zinc-400">3 Seats • ₹10/km</div>
                  </button>
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider text-white bg-[#6366F1] hover:bg-[#4F46E5] transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.3)] mt-2 cursor-pointer"
            >
              <span>
                {tab === 'signin'
                  ? isRider
                    ? 'Sign In as Rider'
                    : 'Sign In as Passenger'
                  : isRider
                  ? 'Register Vehicle & Profile'
                  : 'Create Passenger Account'}
              </span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        </div>

        {/* Trust Footer & Discreet System Logs */}
        <div className="pt-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#6366F1]" />
            <span>Campus Member Verification & Strict Route Corridors</span>
          </div>
          <div>
            <a
              href="/logs"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1 transition-colors"
            >
              <span>System Logs</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
