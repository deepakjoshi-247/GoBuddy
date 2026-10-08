import { Router, Request, Response } from 'express';
import { db, logAuditEvent } from '../db';
import { haversineDistance, calculateHaversineMeters } from '../utils/geo';

const router = Router();

function getRideDepartureTimestamp(rideDate?: string, rideTime?: string): number | null {
  if (!rideTime) return null;
  const timeParts = String(rideTime).trim().split(':');
  if (timeParts.length < 2) return null;
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;

  const departure = new Date();
  departure.setHours(hours, minutes, 0, 0);

  const dStr = (rideDate || '').trim().toLowerCase();
  if (dStr === 'tomorrow') {
    departure.setDate(departure.getDate() + 1);
  } else if (dStr === 'yesterday') {
    departure.setDate(departure.getDate() - 1);
  } else if (dStr && dStr !== 'today') {
    const parsedDate = new Date(rideDate!);
    if (!isNaN(parsedDate.getTime())) {
      parsedDate.setHours(hours, minutes, 0, 0);
      return parsedDate.getTime();
    }
  }

  return departure.getTime();
}

// Passenger creates join request with dynamic TTL expiration
router.post('/ride/:rideId/join', async (req: Request, res: Response): Promise<void> => {
  try {
    const { rideId } = req.params;
    const {
      passenger_id,
      passenger_name,
      pickup_name,
      pickup_lat,
      pickup_lng,
      dest_name,
      dest_lat,
      dest_lng,
      distance_km,
      fare,
    } = req.body;

    if (!passenger_id || !passenger_name || !pickup_name || !dest_name) {
      res.status(400).json({ error: 'Missing passenger request details' });
      return;
    }

    const ride = await db.get('SELECT * FROM rides WHERE id = ?', [rideId]);
    if (!ride) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }

    if (ride.seats_available <= 0) {
      res.status(400).json({ error: 'No seats available on this ride' });
      return;
    }

    if (
      pickup_lat === undefined ||
      pickup_lng === undefined ||
      dest_lat === undefined ||
      dest_lng === undefined
    ) {
      res.status(400).json({ error: 'Missing coordinates for route validation' });
      return;
    }

    // PREVENT DUPLICATE BOOKINGS: Check if passenger already has an active request or joined ride
    const existingActiveRequest = await db.get(
      `SELECT jr.id FROM join_requests jr
       JOIN rides r ON jr.ride_id = r.id
       WHERE jr.passenger_id = ? AND jr.status IN ('pending', 'approved') AND r.status = 'active'`,
      [passenger_id]
    );
    if (existingActiveRequest) {
      res.status(400).json({
        error: 'You already have an active ride request underway. Duplicate bookings are disabled.',
      });
      return;
    }

    const existingJoined = await db.get(
      `SELECT rp.id FROM ride_passengers rp
       JOIN rides r ON rp.ride_id = r.id
       WHERE rp.passenger_id = ? AND r.status = 'active'`,
      [passenger_id]
    );
    if (existingJoined) {
      res.status(400).json({
        error: 'You are currently participating in an active ride. Duplicate bookings are disabled.',
      });
      return;
    }

    // Strictly validate Passenger Destination (<= 150m) and Pickup (<= 300m)
    const reqDest = String(dest_name || '').trim().toLowerCase();
    const rideDest = String(ride.dest_name || '').trim().toLowerCase();
    let destOk = (reqDest.length > 0 && reqDest === rideDest);
    let dDist = Infinity;
    if (dest_lat !== undefined && dest_lng !== undefined && ride.dest_lat !== undefined && ride.dest_lng !== undefined) {
      dDist = calculateHaversineMeters(
        Number(dest_lat), Number(dest_lng),
        Number(ride.dest_lat), Number(ride.dest_lng)
      );
      if (dDist <= 150) destOk = true;
    }
    if (!destOk) {
      res.status(400).json({
        error: `Destination is ${Math.round(dDist)}m away from rider destination (maximum allowed is 150 meters). Detours off-route are not permitted.`,
      });
      return;
    }

    const reqPickup = String(pickup_name || '').trim().toLowerCase();
    const ridePickup = String(ride.pickup_name || '').trim().toLowerCase();
    let pickupOk = (reqPickup.length > 0 && reqPickup === ridePickup);
    let pDist = Infinity;
    if (pickup_lat !== undefined && pickup_lng !== undefined && ride.pickup_lat !== undefined && ride.pickup_lng !== undefined) {
      pDist = calculateHaversineMeters(
        Number(pickup_lat), Number(pickup_lng),
        Number(ride.pickup_lat), Number(ride.pickup_lng)
      );
      if (pDist <= 300) pickupOk = true;
    }
    if (!pickupOk) {
      res.status(400).json({
        error: `Pickup is ${Math.round(pDist)}m away from rider pickup (maximum allowed is 300 meters).`,
      });
      return;
    }

    const now = Date.now();
    let expiresAt = now + 120 * 1000; // Default 2-minute countdown timer

    // If ride departure is more than 30 minutes away, set expires_at to actual ride departure time.
    // If ride is live or departs in less than 30 minutes, keep the 120-second expiration.
    if (!ride.is_live && ride.time) {
      const departureTime = getRideDepartureTimestamp(ride.date, ride.time);
      if (departureTime) {
        const diffMinutes = (departureTime - now) / (60 * 1000);
        if (diffMinutes > 30) {
          expiresAt = departureTime;
        }
      }
    }

    const dist =
      distance_km ||
      haversineDistance(
        { lat: Number(pickup_lat), lng: Number(pickup_lng) },
        { lat: Number(dest_lat), lng: Number(dest_lng) }
      );

    // Force fare formula: Math.round(10 + dist * 5)
    const calculatedFare = fare || Math.round(10 + dist * 5);

    const requestId =
      'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

    const tripOtp = Math.floor(1000 + Math.random() * 9000).toString();

    await db.run(
      `INSERT INTO join_requests (
        id, ride_id, passenger_id, passenger_name,
        pickup_name, pickup_lat, pickup_lng, dest_name, dest_lat, dest_lng,
        distance_km, fare, status, trip_otp, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [
        requestId,
        rideId,
        passenger_id,
        passenger_name,
        pickup_name,
        Number(pickup_lat),
        Number(pickup_lng),
        dest_name,
        Number(dest_lat),
        Number(dest_lng),
        dist,
        calculatedFare,
        tripOtp,
        expiresAt,
        now,
      ]
    );

    const createdReq = await db.get('SELECT * FROM join_requests WHERE id = ?', [requestId]);
    await logAuditEvent(
      'JOIN_REQUESTED',
      rideId,
      passenger_name,
      `Requested seat from ${pickup_name} to ${dest_name} (Fare: ₹${calculatedFare}, Distance: ${dist}km)`
    );
    res.status(201).json({ request: createdReq });
  } catch (error: any) {
    console.error('Join request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get request status (handles auto-expiration check)
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    let request = await db.get('SELECT * FROM join_requests WHERE id = ?', [req.params.id]);
    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    // Auto-expire or check parent ride status
    const parentRide = await db.get('SELECT status FROM rides WHERE id = ?', [request.ride_id]);
    if (parentRide && parentRide.status === 'cancelled' && request.status !== 'cancelled') {
      await db.run(`UPDATE join_requests SET status = 'cancelled' WHERE id = ?`, [request.id]);
      request.status = 'cancelled';
    }

    // Auto-expire if timer ran out and still pending
    if (request.status === 'pending' && Date.now() > request.expires_at) {
      await db.run(`UPDATE join_requests SET status = 'expired' WHERE id = ?`, [request.id]);
      request = await db.get('SELECT * FROM join_requests WHERE id = ?', [req.params.id]);
    }

    res.json({ request });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to handle request acceptance with strict atomic pending check
async function handleAcceptRequest(id: string, res: Response) {
  const request = await db.get('SELECT * FROM join_requests WHERE id = ?', [id]);
  if (!request) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  // Strict database check: WHERE status = 'pending'. If cancelled or no longer pending, return 400.
  if (request.status !== 'pending') {
    res.status(400).json({
      error: `Request is no longer pending (current status: ${request.status})`,
      request,
    });
    return;
  }

  // Check if expired
  if (Date.now() > request.expires_at) {
    await db.run(`UPDATE join_requests SET status = 'expired' WHERE id = ? AND status = 'pending'`, [id]);
    res.status(400).json({ error: 'Request expired', status: 'expired' });
    return;
  }

  const ride = await db.get('SELECT * FROM rides WHERE id = ?', [request.ride_id]);
  if (!ride || ride.seats_available <= 0) {
    res.status(400).json({ error: 'No seats available' });
    return;
  }

  // Generate 4-digit trip OTP and perform atomic update locked to status = 'pending'
  const tripOtp = Math.floor(1000 + Math.random() * 9000).toString();
  const updateResult = await db.run(
    `UPDATE join_requests SET status = 'approved', trip_otp = ? WHERE id = ? AND status = 'pending'`,
    [tripOtp, id]
  );

  // If another process or cancellation changed status concurrently, block update
  if (updateResult.changes === 0) {
    res.status(400).json({ error: 'Request is no longer pending and cannot be accepted' });
    return;
  }

  // 1. Decrement available seats safely
  await db.run('UPDATE rides SET seats_available = MAX(0, seats_available - 1) WHERE id = ?', [
    request.ride_id,
  ]);

  // 2. Add to ride_passengers
  const rpId = 'rp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  await db.run(
    `INSERT INTO ride_passengers (id, ride_id, passenger_id, fare, joined_at)
     VALUES (?, ?, ?, ?, ?)`,
    [rpId, request.ride_id, request.passenger_id, request.fare, Date.now()]
  );

  await logAuditEvent(
    'APPROVED',
    request.ride_id,
    request.passenger_name,
    `Passenger approved for seat by rider (Fare: ₹${request.fare}, OTP generated)`
  );

  const updated = await db.get('SELECT * FROM join_requests WHERE id = ?', [id]);
  const updatedRide = await db.get('SELECT * FROM rides WHERE id = ?', [request.ride_id]);

  const updatedPassengers = await db.all(
    `SELECT rp.*, 
            COALESCE(u.name, jr.passenger_name, 'Verified Student') as name, 
            COALESCE(u.pid, 'COEP-P19') as pid, 
            u.avatar_seed,
            jr.trip_otp
     FROM ride_passengers rp 
     LEFT JOIN users u ON rp.passenger_id = u.id 
     LEFT JOIN (SELECT passenger_id, ride_id, passenger_name, trip_otp FROM join_requests WHERE status = 'approved' GROUP BY passenger_id, ride_id) jr ON jr.ride_id = rp.ride_id AND jr.passenger_id = rp.passenger_id
     WHERE rp.ride_id = ?`,
    [request.ride_id]
  );

  res.json({
    success: true,
    request: updated,
    ride: updatedRide,
    passengers: updatedPassengers,
  });
}

// Helper function to handle request rejection
async function handleRejectRequest(id: string, res: Response) {
  const request = await db.get('SELECT * FROM join_requests WHERE id = ?', [id]);
  if (!request) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  if (request.status !== 'pending') {
    res.status(400).json({
      error: `Request is no longer pending (current status: ${request.status})`,
      request,
    });
    return;
  }

  await db.run(`UPDATE join_requests SET status = 'rejected' WHERE id = ? AND status = 'pending'`, [id]);
  const updated = await db.get('SELECT * FROM join_requests WHERE id = ?', [id]);
  const updatedRide = await db.get('SELECT * FROM rides WHERE id = ?', [request.ride_id]);

  res.json({
    success: true,
    request: updated,
    ride: updatedRide,
  });
}

// TICKET 1: Dedicated PATCH /api/requests/:id/accept endpoint with strict status check
router.patch('/:id/accept', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await handleAcceptRequest(id, res);
  } catch (error: any) {
    console.error('Error accepting request via PATCH:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/accept', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await handleAcceptRequest(id, res);
  } catch (error: any) {
    console.error('Error accepting request via POST:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/reject', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await handleRejectRequest(id, res);
  } catch (error: any) {
    console.error('Error rejecting request via PATCH:', error);
    res.status(500).json({ error: error.message });
  }
});

// Unified respond route supporting 'approve' and 'reject'
router.post('/:id/respond', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' | 'accept' | 'reject'

    if (action === 'approve' || action === 'accept') {
      await handleAcceptRequest(id, res);
    } else {
      await handleRejectRequest(id, res);
    }
  } catch (error: any) {
    console.error('Error responding to request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all requests for a ride
router.get('/ride/:rideId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { rideId } = req.params;
    const requests = await db.all(
      `SELECT * FROM join_requests WHERE ride_id = ? ORDER BY created_at DESC`,
      [rideId]
    );
    res.json({ requests });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific passenger's request for a ride
router.get('/ride/:rideId/passenger/:passengerId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { rideId, passengerId } = req.params;
    let request = await db.get(
      `SELECT * FROM join_requests WHERE ride_id = ? AND passenger_id = ? ORDER BY created_at DESC LIMIT 1`,
      [rideId, passengerId]
    );
    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    // Auto-expire or check parent ride status
    const parentRide = await db.get('SELECT status FROM rides WHERE id = ?', [request.ride_id]);
    if (parentRide && parentRide.status === 'cancelled' && request.status !== 'cancelled') {
      await db.run(`UPDATE join_requests SET status = 'cancelled' WHERE id = ?`, [request.id]);
      request.status = 'cancelled';
    }

    if (request.status === 'pending' && Date.now() > request.expires_at) {
      await db.run(`UPDATE join_requests SET status = 'expired' WHERE id = ?`, [request.id]);
      request = await db.get('SELECT * FROM join_requests WHERE id = ?', [request.id]);
    }

    res.json({ request });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Passenger cancels a pending join request
router.post('/:id/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const request = await db.get('SELECT * FROM join_requests WHERE id = ?', [id]);
    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    await db.run(`UPDATE join_requests SET status = 'cancelled' WHERE id = ?`, [id]);
    await logAuditEvent(
      'CANCELLED',
      request.ride_id,
      request.passenger_name,
      `Join request cancelled by passenger`
    );

    res.json({ success: true, message: 'Join request successfully cancelled' });
  } catch (error: any) {
    console.error('Error cancelling request:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
