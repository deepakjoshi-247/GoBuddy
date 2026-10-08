import {
  User,
  Ride,
  JoinRequest,
  RidePassenger,
  WalletSummary,
  ChatMessage,
  AuditLog,
  AuditEventType,
} from '../types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const text = await res.text();
  let data: any = {};
  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `HTTP Error ${res.status}`);
  }
  return data;
}

export const api = {
  // Auth
  login: (name: string, pid: string, role: 'rider' | 'passenger', gender?: 'Male' | 'Female') =>
    request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name, pid, role, gender }),
    }),

  register: (userData: {
    name: string;
    email: string;
    pid: string;
    phone: string;
    role: 'rider' | 'passenger';
    vehicle?: 'Bike' | 'Rickshaw';
    gender?: 'Male' | 'Female';
  }) =>
    request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  getUser: (id: string) => request<{ user: User }>(`/auth/me/${id}`),

  getDemoPresets: () => request<{ users: User[] }>('/auth/presets'),

  // Rides
  createRide: (rideData: {
    rider_id: string;
    rider_name: string;
    rider_gender?: 'Male' | 'Female';
    pickup_name: string;
    pickup_lat: number;
    pickup_lng: number;
    dest_name: string;
    dest_lat: number;
    dest_lng: number;
    date?: string;
    time: string;
    vehicle: 'Bike' | 'Rickshaw';
    capacity?: number;
    is_live?: number | boolean;
    route_distance_km: number;
  }) =>
    request<{ ride: Ride }>('/rides', {
      method: 'POST',
      body: JSON.stringify(rideData),
    }),

  searchRides: async (params?: {
    pickup_lat?: number;
    pickup_lng?: number;
    dest_lat?: number;
    dest_lng?: number;
    pickup_name?: string;
    dest_name?: string;
    destination?: string;
    pickup?: string;
    time?: string;
    date?: string;
    browse_all?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (params?.pickup_lat !== undefined) {
      query.set('pickup_lat', String(params.pickup_lat));
      query.set('pickupLat', String(params.pickup_lat));
    }
    if (params?.pickup_lng !== undefined) {
      query.set('pickup_lng', String(params.pickup_lng));
      query.set('pickupLng', String(params.pickup_lng));
    }
    if (params?.dest_lat !== undefined) {
      query.set('dest_lat', String(params.dest_lat));
      query.set('destLat', String(params.dest_lat));
    }
    if (params?.dest_lng !== undefined) {
      query.set('dest_lng', String(params.dest_lng));
      query.set('destLng', String(params.dest_lng));
    }
    const pName = params?.pickup_name || params?.pickup;
    if (pName) {
      query.set('pickup_name', pName);
      query.set('pickup', pName);
    }
    const dName = params?.dest_name || params?.destination;
    if (dName) {
      query.set('dest_name', dName);
      query.set('destination', dName);
    }
    if (params?.time) query.set('time', params.time);
    if (params?.date) query.set('date', params.date);
    if (params?.browse_all) query.set('browse_all', 'true');

    const qStr = query.toString();
    return request<Ride[] | { rides: Ride[]; total?: number }>(`/rides${qStr ? `?${qStr}` : ''}`);
  },

  getRide: async (id: string) => {
    try {
      return await request<{
        ride: Ride;
        passengers: RidePassenger[];
        requests: JoinRequest[];
      }>(`/rides/${id}`);
    } catch (err) {
      console.warn('API getRide failed, returning static mock fallback:', err);
      const fallbackRide: Ride = {
        id: id || 'ride_active_aarav',
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
      return {
        ride: fallbackRide,
        passengers: [
          {
            id: 'rp_1',
            ride_id: id || 'ride_active_aarav',
            passenger_id: 'user_rohan',
            name: 'Rohan Verma',
            fare: 31,
            joined_at: 1791294688682,
            trip_otp: '4812',
          },
        ],
        requests: [],
      };
    }
  },

  getUserActiveRide: async (userId: string) => {
    try {
      return await request<{
        role: 'rider' | 'passenger' | 'passenger_request' | null;
        ride: Ride | null;
        passengers?: RidePassenger[];
        requests?: JoinRequest[];
        request?: JoinRequest;
      }>(`/rides/user/${userId}/active`);
    } catch (err) {
      console.warn('API getUserActiveRide failed, returning static mock fallback:', err);
      const isRohan = userId.includes('rohan') || userId.includes('passenger');
      const isAarav = userId.includes('aarav') || userId.includes('rider');

      const mockRide: Ride = {
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

      if (isRohan) {
        return {
          role: 'passenger_request' as const,
          ride: mockRide,
          request: {
            id: 'req_rohan_aarav',
            ride_id: 'ride_active_aarav',
            passenger_id: userId,
            passenger_name: 'Rohan Verma',
            pickup_name: 'College Main Gate (Gate 1)',
            pickup_lat: 18.5308,
            pickup_lng: 73.8553,
            dest_name: 'Railway Station Junction',
            dest_lat: 18.5284,
            dest_lng: 73.8744,
            distance_km: 4.2,
            fare: 31,
            status: 'approved' as const,
            trip_otp: '4812',
            expires_at: Date.now() + 7200000,
            created_at: Date.now(),
          },
        };
      }

      if (isAarav) {
        return {
          role: 'rider' as const,
          ride: mockRide,
          passengers: [
            {
              id: 'rp_1',
              ride_id: 'ride_active_aarav',
              passenger_id: 'user_rohan',
              name: 'Rohan Verma',
              fare: 31,
              joined_at: 1791294688682,
              trip_otp: '4812',
            },
          ],
          requests: [],
        };
      }

      return { role: null, ride: null };
    }
  },

  completeRide: (id: string) =>
    request<{
      success: boolean;
      ride: Ride;
      earnings: number;
      platform_fee: number;
      net_earning: number;
    }>(`/rides/${id}/complete`, { method: 'POST' }),

  dropOffPassenger: (rideId: string, passengerId: string) =>
    request<{
      success: boolean;
      message: string;
      dropped_passenger: string;
      fare_earned: number;
      seats_available: number;
      ride: Ride;
      passengers: RidePassenger[];
    }>(`/rides/${rideId}/dropoff/${passengerId}`, {
      method: 'POST',
    }),

  startRide: (id: string, otp?: string) =>
    request<{ success: boolean; ride: Ride }>(`/rides/${id}/start`, {
      method: 'PATCH',
      body: otp ? JSON.stringify({ otp }) : undefined,
    }),

  cancelRide: (id: string) =>
    request<{ success: boolean; message: string }>(`/rides/${id}/cancel`, {
      method: 'POST',
    }),

  getRidesHistory: (userId: string) =>
    request<{ history: any[] }>(`/rides/history/${userId}`),

  getPassengerHistory: (passengerId: string) =>
    request<{ history: any[] }>(`/rides/history/passenger/${passengerId}`),

  // Join Requests
  joinRide: (
    rideId: string,
    reqData: {
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
    }
  ) =>
    request<{ request: JoinRequest }>(`/requests/ride/${rideId}/join`, {
      method: 'POST',
      body: JSON.stringify(reqData),
    }),

  getRequestStatus: (requestId: string) =>
    request<{ request: JoinRequest }>(`/requests/${requestId}`),

  getPassengerRideRequest: (rideId: string, passengerId: string) =>
    request<{ request: JoinRequest }>(`/requests/ride/${rideId}/passenger/${passengerId}`),

  cancelRequest: (requestId: string) =>
    request<{ success: boolean; message: string }>(`/requests/${requestId}/cancel`, {
      method: 'POST',
    }),

  acceptRequest: (requestId: string) =>
    request<{ success: boolean; request: JoinRequest; ride?: Ride; passengers?: RidePassenger[] }>(
      `/requests/${requestId}/accept`,
      {
        method: 'PATCH',
      }
    ),

  rejectRequest: (requestId: string) =>
    request<{ success: boolean; request: JoinRequest; ride?: Ride }>(
      `/requests/${requestId}/reject`,
      {
        method: 'PATCH',
      }
    ),

  respondToRequest: (requestId: string, action: 'approve' | 'reject') =>
    request<{ success: boolean; request: JoinRequest; ride?: Ride; passengers?: RidePassenger[] }>(
      `/requests/${requestId}/respond`,
      {
        method: 'POST',
        body: JSON.stringify({ action }),
      }
    ),

  // Wallet
  getWallet: (userId: string) => request<WalletSummary>(`/wallet/${userId}`),

  mockFine: (userId: string) =>
    request<{ success: boolean; message: string }>(`/wallet/${userId}/mock-fine`, {
      method: 'POST',
    }),

  // Chat
  getChat: (rideId: string) =>
    request<{ messages: ChatMessage[] }>(`/chat/${rideId}`),

  sendMessage: (rideId: string, senderId: string, senderName: string, message: string) =>
    request<{ message: ChatMessage }>(`/chat/${rideId}`, {
      method: 'POST',
      body: JSON.stringify({
        sender_id: senderId,
        sender_name: senderName,
        message,
      }),
    }),

  // Reset Demo State
  resetDatabase: () =>
    request<{ success: boolean; message: string; timestamp: number }>(
      '/reset',
      { method: 'POST' }
    ),

  // Audit Logs
  getAuditLogs: (event?: string, rideId?: string) => {
    const query = new URLSearchParams();
    if (event && event !== 'ALL') query.set('event', event);
    if (rideId) query.set('ride_id', rideId);
    return request<{ logs: AuditLog[]; total: number; timestamp: number }>(
      `/logs?${query.toString()}`
    );
  },
};
