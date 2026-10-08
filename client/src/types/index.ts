export type UserRole = 'rider' | 'passenger';

export interface User {
  id: string;
  name: string;
  pid: string;
  role: UserRole;
  avatar_seed: string;
  email?: string;
  phone?: string;
  vehicle?: VehicleType;
  gender?: 'Male' | 'Female';
}

export type VehicleType = 'Bike' | 'Rickshaw';
export type RideStatus = 'active' | 'completed' | 'cancelled' | 'expired';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled' | 'completed' | 'dropped_off';

export interface Ride {
  id: string;
  rider_id: string;
  rider_name: string;
  rider_gender?: 'Male' | 'Female';
  pickup_name: string;
  pickup_lat: number;
  pickup_lng: number;
  dest_name: string;
  dest_lat: number;
  dest_lng: number;
  date: string;
  time: string;
  vehicle: VehicleType;
  capacity: number;
  seats_available: number;
  route_distance_km: number;
  status: RideStatus;
  is_live?: boolean | number;
  created_at: number;
  passenger_distance_km?: number;
  calculated_fare?: number;
  is_corridor_match?: boolean;
  is_route_compatible?: boolean;
  incompatibility_reason?: string;
}

export interface JoinRequest {
  id: string;
  ride_id: string;
  passenger_id: string;
  passenger_name: string;
  pickup_name: string;
  pickup_lat: number;
  pickup_lng: number;
  dest_name: string;
  dest_lat: number;
  dest_lng: number;
  distance_km: number;
  fare: number;
  status: RequestStatus;
  trip_otp?: string;
  expires_at: number;
  created_at: number;
}

export interface RidePassenger {
  id: string;
  ride_id: string;
  passenger_id: string;
  fare: number;
  joined_at: number;
  trip_otp?: string;
  name?: string;
  pid?: string;
  avatar_seed?: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: 'earning' | 'platform_fee' | 'fine';
  amount: number;
  description: string;
  ride_id?: string | null;
  created_at: number;
}

export interface WalletSummary {
  balance: number;
  total_earnings: number;
  total_fees: number;
  total_fines: number;
  transactions: WalletTransaction[];
}

export interface ChatMessage {
  id: string;
  ride_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  timestamp: number;
}

export interface HotspotLocation {
  name: string;
  short_name: string;
  category: 'gate' | 'hostel' | 'library' | 'transit' | 'cafeteria';
  lat: number;
  lng: number;
}

export type AuditEventType = 'RIDE_CREATED' | 'JOIN_REQUESTED' | 'APPROVED' | 'CANCELLED' | 'COMPLETED';

export interface AuditLog {
  id: string;
  timestamp: number;
  event: AuditEventType;
  ride_id: string;
  user_name: string;
  details: string;
}

