import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ArrowRight, Zap } from 'lucide-react';
import { User, VehicleType, Ride } from '../../types';
import { LocationSearch } from '../../components/Common/LocationSearch';
import { LeafletMap, MapMarker } from '../../components/Map/LeafletMap';
import { getRoute } from '../../services/routing';
import { api } from '../../services/api';
import { COLLEGE_HOTSPOTS } from '../../constants/hotspots';

interface CreateRideViewProps {
  user: User;
  onRideCreated: (ride: Ride) => void;
}

export const CreateRideView: React.FC<CreateRideViewProps> = ({
  user,
  onRideCreated,
}) => {
  const [pickup, setPickup] = useState({
    name: 'College Main Gate (Gate 1)',
    lat: 18.5308,
    lng: 73.8553,
  });
  const [dest, setDest] = useState({
    name: 'Railway Station Junction',
    lat: 18.5284,
    lng: 73.8744,
  });

  const [date, setDate] = useState<'Today' | 'Tomorrow'>('Today');
  const [time, setTime] = useState('08:30');
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [distanceKm, setDistanceKm] = useState<number>(4.2);
  const [durationMins, setDurationMins] = useState<number>(14);
  const [isPickingMapFor, setIsPickingMapFor] = useState<'pickup' | 'dest' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Calculate route polyline whenever pickup or dest change
  useEffect(() => {
    let active = true;
    async function updateRoute() {
      if (pickup.lat && pickup.lng && dest.lat && dest.lng) {
        const res = await getRoute(pickup.lat, pickup.lng, dest.lat, dest.lng);
        if (active) {
          setRouteCoords(res.coordinates);
          setDistanceKm(res.distanceKm);
          setDurationMins(res.durationMinutes);
        }
      }
    }
    updateRoute();
    return () => {
      active = false;
    };
  }, [pickup.lat, pickup.lng, dest.lat, dest.lng]);

  const handleMapClick = (lat: number, lng: number) => {
    if (isPickingMapFor === 'pickup') {
      setPickup({
        name: `Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
        lat,
        lng,
      });
      setIsPickingMapFor(null);
    } else if (isPickingMapFor === 'dest') {
      setDest({
        name: `Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
        lat,
        lng,
      });
      setIsPickingMapFor(null);
    }
  };

  const handleFillDemo = () => {
    const gate1 = COLLEGE_HOTSPOTS[0]; // Gate 1
    const railway = COLLEGE_HOTSPOTS[4]; // Railway station
    setPickup({ name: gate1.name, lat: gate1.lat, lng: gate1.lng });
    setDest({ name: railway.name, lat: railway.lat, lng: railway.lng });
    setDate('Today');
    setTime('08:30');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup.name || !dest.name) {
      setError('Pickup and Destination required');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const res = await api.createRide({
        rider_id: user.id,
        rider_name: user.name,
        rider_gender: user.gender || 'Male',
        pickup_name: pickup.name,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dest_name: dest.name,
        dest_lat: dest.lat,
        dest_lng: dest.lng,
        date,
        time,
        vehicle: 'Bike',
        capacity: 1,
        route_distance_km: distanceKm,
      });
      onRideCreated(res.ride);
    } catch (err: any) {
      setError(err.message || 'Failed to create ride');
    } finally {
      setIsSubmitting(false);
    }
  };

  const markers: MapMarker[] = [
    {
      id: 'pickup',
      lat: pickup.lat,
      lng: pickup.lng,
      title: `Pickup: ${pickup.name}`,
      type: 'pickup',
    },
    {
      id: 'dest',
      lat: dest.lat,
      lng: dest.lng,
      title: `Drop: ${dest.name}`,
      type: 'dest',
    },
  ];

  const estEarningPerSeat = Math.round(10 + distanceKm * 5);

  return (
    <div className="flex-1 flex flex-col p-4 bg-[#0F1117] text-white overflow-y-auto font-sans">
      {/* Title & 1-Click Fill Demo */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-white">Offer Campus Ride</h2>
          <p className="text-[11px] text-zinc-400">Share your commute & split travel costs</p>
        </div>
        <button
          type="button"
          onClick={handleFillDemo}
          className="text-xs font-semibold bg-[#161822] text-[#6366F1] border border-[#222634] hover:bg-zinc-900 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors shadow-sm"
        >
          <Zap className="w-3.5 h-3.5 text-[#6366F1]" />
          <span>Demo Route</span>
        </button>
      </div>

      {/* Map Preview */}
      <div className="relative mb-3 rounded-xl overflow-hidden border border-[#222634] shadow-sm">
        <LeafletMap
          markers={markers}
          routeCoordinates={routeCoords}
          onMapClick={handleMapClick}
          className="h-44 w-full"
        />
        {isPickingMapFor && (
          <div className="absolute top-2 left-2 right-2 bg-[#0F1117] border border-[#222634] text-white text-xs font-semibold py-1 px-2.5 rounded-lg shadow-lg flex items-center justify-between z-10">
            <span>Tap on map to set {isPickingMapFor.toUpperCase()} location</span>
            <button
              type="button"
              onClick={() => setIsPickingMapFor(null)}
              className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded"
            >
              Cancel
            </button>
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-[#0F1117]/90 backdrop-blur border border-[#222634] px-2.5 py-1 rounded-md text-[11px] font-mono text-zinc-300 z-10 flex gap-2 shadow-sm">
          <span>{distanceKm} km</span>
          <span>~{durationMins}m</span>
        </div>
      </div>

      {error && (
        <div className="p-2.5 mb-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5 flex-1 flex flex-col justify-between">
        <div className="space-y-3 bg-[#161822] p-3.5 rounded-xl border border-[#222634] shadow-md">
          {/* Pickup Selection */}
          <LocationSearch
            label="Pickup Location"
            placeholder="Search campus gate or hostel..."
            value={pickup.name}
            onSelect={(loc) => setPickup(loc)}
            dotColor="emerald"
            onPickOnMap={() => setIsPickingMapFor('pickup')}
            isPickingOnMap={isPickingMapFor === 'pickup'}
          />

          {/* Destination Selection */}
          <LocationSearch
            label="Your Destination"
            placeholder="Search destination or station..."
            value={dest.name}
            onSelect={(loc) => setDest(loc)}
            dotColor="amber"
            onPickOnMap={() => setIsPickingMapFor('dest')}
            isPickingOnMap={isPickingMapFor === 'dest'}
          />

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {/* Selectable Date */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                Date
              </label>
              <div className="grid grid-cols-2 p-0.5 bg-[#0F1117] border border-[#222634] rounded-lg">
                <button
                  type="button"
                  onClick={() => setDate('Today')}
                  className={`py-1 px-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1 ${
                    date === 'Today'
                      ? 'bg-[#6366F1] text-white font-bold shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Today</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDate('Tomorrow')}
                  className={`py-1 px-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1 ${
                    date === 'Tomorrow'
                      ? 'bg-[#6366F1] text-white font-bold shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Tomorrow</span>
                </button>
              </div>
            </div>

            {/* Time Selector */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                Departure Time
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-[#0F1117] border border-[#222634] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-[#6366F1] font-medium"
                />
              </div>
            </div>
          </div>

          {/* Earnings Projection */}
          <div className="p-2.5 rounded-lg bg-[#0F1117] border border-[#222634] flex items-center justify-between text-xs">
            <span className="text-zinc-400">Est. Passenger Fare:</span>
            <span className="font-mono font-bold text-[#6366F1]">
              ₹{estEarningPerSeat} (1-to-1 Peer Ride)
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-[#6366F1] hover:bg-[#4F46E5] text-white transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.25)] cursor-pointer"
        >
          <span>{isSubmitting ? 'Publishing...' : 'Publish Campus Ride'}</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </form>
    </div>
  );
};

export default CreateRideView;
