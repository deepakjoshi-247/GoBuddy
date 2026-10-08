import React, { useState } from 'react';
import {
  ShieldCheck,
  Star,
  Award,
  Bike,
  CheckCircle2,
  FileCheck2,
  Camera,
  Quote,
} from 'lucide-react';

export interface ReviewItem {
  id: string;
  name: string;
  comment: string;
  rating: number;
}

export const HARDCODED_AARAV_PROFILE = {
  name: 'Aarav Sharma',
  age: 19,
  displayName: 'Aarav Sharma (19)',
  badge: 'Verified College Student',
  pid: 'COEP-2024-R42',
  avatarUrl:
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
  safetyRating: '4.9',
  college: 'COEP Technological University',
  department: 'TE Mechanical Engineering',
  vehicle: {
    model: 'TVS Apache RTR 160 (Blue)',
    licensePlate: 'MH 48 AZ 4812',
    seatConditionImg:
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
    seatConditionCaption: 'Excellent Seat & Bike Condition - Verified',
    licensePlateImg:
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80',
    licensePlateCaption: 'License Plate: MH 48 AZ 4812 (Verified)',
    cleanliness: '5.0 ★',
    ridingStyle: 'Safe & Steady (Smooth on Bumps)',
    spareHelmet: 'Yes (Sanitized Dual Visor)',
    inspectionStatus: 'Inspection Passed ✓ (Gate 1 Campus Security)',
  },
  reviews: [
    {
      id: 'rev-1',
      name: 'Rohan',
      comment: 'Always on time, bike is super clean and comfortable! - Rohan',
      rating: 5,
    },
    {
      id: 'rev-2',
      name: 'Neha',
      comment: 'Safe rider, seat and helmet were perfect. Highly recommend. - Neha',
      rating: 5,
    },
    {
      id: 'rev-3',
      name: 'Aman',
      comment: 'Fast checkout, super chill guy. Verification check is solid. - Aman',
      rating: 5,
    },
  ] as ReviewItem[],
};

interface RiderProfileCardProps {
  compact?: boolean;
  showReviewsOnly?: boolean;
}

export const RiderProfileCard: React.FC<RiderProfileCardProps> = ({
  compact = false,
}) => {
  const profile = HARDCODED_AARAV_PROFILE;
  const [avatarError, setAvatarError] = useState(false);
  const [seatImgError, setSeatImgError] = useState(false);
  const [plateImgError, setPlateImgError] = useState(false);

  return (
    <div className="space-y-4">
      {/* 1. Rider Profile Card */}
      <div className="bg-[#161822] border border-[#222634] rounded-2xl p-4 shadow-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#6366F1]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3.5 mb-3.5">
          {/* Avatar: High-Quality Unsplash 19-year-old male student */}
          <div className="relative shrink-0">
            {!avatarError ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                onError={() => setAvatarError(true)}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#6366F1]/60 shadow-[0_0_12px_rgba(99,102,241,0.25)]"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#0F1117] border-2 border-[#6366F1] flex items-center justify-center text-xl font-bold text-[#6366F1]">
                AS
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-[#6366F1] text-white p-1 rounded-full shadow-md">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight">
                {profile.displayName}
              </h3>
            </div>

            {/* Verified College Student Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#6366F1]/15 border border-[#6366F1]/40 text-[#818cf8] text-[11px] font-bold mt-1 shadow-[0_0_8px_rgba(99,102,241,0.2)]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#6366F1]" />
              <span>{profile.badge}</span>
            </div>

            <p className="text-[11px] text-[#94A3B8] font-mono mt-1">
              PID: {profile.pid} • {profile.department}
            </p>
          </div>
        </div>

        {/* Quick Trust Highlights */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#222634]">
          <div className="bg-[#0F1117] p-2.5 rounded-xl border border-[#222634] text-center">
            <span className="text-[10px] text-[#94A3B8] block mb-0.5">Safety Rating</span>
            <span className="text-xs font-bold text-white flex items-center justify-center gap-1 font-mono">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              {profile.safetyRating} / 5.0 (100% Safe)
            </span>
          </div>
          <div className="bg-[#0F1117] p-2.5 rounded-xl border border-[#222634] text-center">
            <span className="text-[10px] text-[#94A3B8] block mb-0.5">Campus Verification</span>
            <span className="text-xs font-bold text-[#6366F1] flex items-center justify-center gap-1">
              <Award className="w-3.5 h-3.5" />
              COEP Tech Official
            </span>
          </div>
        </div>
      </div>

      {/* 2. Vehicle Inspection UI Card */}
      <div className="bg-[#161822] border border-[#222634] rounded-2xl p-4 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-[#222634]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/30 flex items-center justify-center text-[#6366F1]">
              <Bike className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Vehicle Inspection
              </h4>
              <p className="text-[10px] text-[#94A3B8]">
                {profile.vehicle.inspectionStatus}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#6366F1] bg-[#6366F1]/10 px-2 py-0.5 rounded border border-[#6366F1]/30">
            Passed ✓
          </span>
        </div>

        {/* Vehicle Model & Registration Plate */}
        <div className="bg-[#0F1117] p-3 rounded-xl border border-[#222634] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#94A3B8] block uppercase font-medium">Vehicle Model</span>
            <span className="text-xs font-bold text-white">{profile.vehicle.model}</span>
          </div>

          {/* Authentic Indian High Security License Plate Card */}
          <div className="bg-white text-black px-2.5 py-1 rounded-md border-2 border-zinc-400 flex items-center gap-1.5 shadow-sm">
            <div className="flex flex-col items-center border-r border-zinc-400 pr-1 text-[8px] font-bold leading-none text-blue-800">
              <span>IND</span>
            </div>
            <span className="font-mono font-black text-xs tracking-wider text-black">
              {profile.vehicle.licensePlate}
            </span>
          </div>
        </div>

        {/* Vehicle Inspection Images: High-angle motorcycle view & License Plate */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] flex items-center gap-1">
            <Camera className="w-3 h-3 text-[#6366F1]" />
            <span>Inspection Photo Verification</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Image 1: High-angle view of motorcycle showing seat condition */}
            <div className="bg-[#0F1117] border border-[#222634] rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="relative h-32 bg-zinc-900 w-full overflow-hidden">
                {!seatImgError ? (
                  <img
                    src={profile.vehicle.seatConditionImg}
                    alt="Motorcycle Seat Condition"
                    onError={() => setSeatImgError(true)}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-zinc-900 text-[#94A3B8]">
                    <Bike className="w-8 h-8 text-[#6366F1] mb-1" />
                    <span className="text-[10px]">TVS Apache RTR 160 (Seat Verified)</span>
                  </div>
                )}
                <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-[9px] font-mono text-[#6366F1] px-1.5 py-0.5 rounded border border-[#6366F1]/30">
                  Seat Condition
                </span>
              </div>
              <div className="p-2 bg-[#0F1117] text-[10px] font-semibold text-zinc-300 border-t border-[#222634] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#6366F1] shrink-0" />
                <span className="truncate">{profile.vehicle.seatConditionCaption}</span>
              </div>
            </div>

            {/* Image 2: Close-up of license plate matching MH 48 AZ 4812 */}
            <div className="bg-[#0F1117] border border-[#222634] rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="relative h-32 bg-zinc-900 w-full overflow-hidden">
                {!plateImgError ? (
                  <img
                    src={profile.vehicle.licensePlateImg}
                    alt="License Plate MH 48 AZ 4812"
                    onError={() => setPlateImgError(true)}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-zinc-900 text-[#94A3B8]">
                    <FileCheck2 className="w-8 h-8 text-[#6366F1] mb-1" />
                    <span className="text-[10px] font-mono font-bold text-white">MH 48 AZ 4812</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-2">
                  <div className="bg-white/95 text-black px-2.5 py-1 rounded border-2 border-zinc-800 flex items-center gap-1.5 shadow-lg">
                    <span className="text-[8px] font-bold text-blue-800 border-r border-zinc-400 pr-1">IND</span>
                    <span className="font-mono font-black text-xs tracking-wider text-black">
                      MH 48 AZ 4812
                    </span>
                  </div>
                </div>
                <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-[9px] font-mono text-[#6366F1] px-1.5 py-0.5 rounded border border-[#6366F1]/30">
                  Plate Verified
                </span>
              </div>
              <div className="p-2 bg-[#0F1117] text-[10px] font-semibold text-zinc-300 border-t border-[#222634] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#6366F1] shrink-0" />
                <span className="truncate">{profile.vehicle.licensePlateCaption}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Inspection Criteria Badges */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <div className="bg-[#0F1117] px-2 py-1.5 rounded-lg border border-[#222634] text-center">
            <span className="text-[9px] text-[#94A3B8] block uppercase">Cleanliness</span>
            <span className="font-bold text-[#6366F1] text-xs">{profile.vehicle.cleanliness}</span>
          </div>
          <div className="bg-[#0F1117] px-2 py-1.5 rounded-lg border border-[#222634] text-center">
            <span className="text-[9px] text-[#94A3B8] block uppercase">Riding Style</span>
            <span className="font-semibold text-zinc-200 text-xs">Safe & Smooth</span>
          </div>
          <div className="bg-[#0F1117] px-2 py-1.5 rounded-lg border border-[#222634] text-center">
            <span className="text-[9px] text-[#94A3B8] block uppercase">Spare Helmet</span>
            <span className="font-semibold text-[#6366F1] text-xs">Included ✓</span>
          </div>
        </div>
      </div>

      {/* 3. Injected Reviews Section */}
      <div className="bg-[#161822] border border-[#222634] rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#222634]">
          <div className="flex items-center gap-1.5">
            <Quote className="w-3.5 h-3.5 text-[#6366F1]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Student Reviews ({profile.reviews.length})
            </h4>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-amber-400 font-bold">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>5.0 Verified</span>
          </div>
        </div>

        {/* Map through hardcoded reviews */}
        <div className="space-y-2.5">
          {profile.reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-[#0F1117] border border-[#222634] rounded-xl p-3 space-y-1.5 hover:border-[#6366F1]/40 transition-colors shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-[#6366F1]/20 border border-[#6366F1]/40 text-[#6366F1] font-bold text-[10px] flex items-center justify-center">
                    {rev.name.charAt(0)}
                  </div>
                  <span className="text-xs font-bold text-white">{rev.name}</span>
                  <span className="text-[9px] text-zinc-400 font-mono">COEP Peer</span>
                </div>
                <div className="flex items-center gap-0.5 text-amber-400">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-3 h-3 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-[#94A3B8] italic leading-relaxed pl-1">
                “{rev.comment}”
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RiderProfileCard;
