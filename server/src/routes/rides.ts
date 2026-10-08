import { Router, Request, Response } from 'express';
import { db, logAuditEvent } from '../db';
import {
  haversineDistance,
  calculateHaversineMeters,
  timeToMinutes,
} from '../utils/geo';

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

// Create new Ride (Rider Flow)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      rider_id,
      rider_name,
      pickup_name,
      pickup_lat,
      pickup_lng,
      dest_name,
      dest_lat,
      dest_lng,
      date,
      time,
      vehicle,
      route_distance_km,
    } = req.body;

    if (
      !rider_id ||
      !rider_name ||
      !pickup_name ||
      pickup_lat === undefined ||
      pickup_lng === undefined ||
      !dest_name ||
      dest_lat === undefined ||
      dest_lng === undefined ||
      !time ||
      !vehicle
    ) {
      res.status(400).json({ error: 'Missing required ride fields' });
      return;
    }

    const finalVehicle = 'Bike';
    const capacity = 1;
    const seats_available = 1;
    const distanceKm =
      route_distance_km ||
      haversineDistance(
        { lat: Number(pickup_lat), lng: Number(pickup_lng) },
        { lat: Number(dest_lat), lng: Number(dest_lng) }
      );

    const id = 'ride_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const createdAt = Date.now();
    const rideDate = date && String(date).trim() ? String(date).trim() : 'Today';

    let riderGender = req.body.rider_gender;
    if (!riderGender) {
      const u = await db.get('SELECT gender FROM users WHERE id = ?', [rider_id]);
      if (u?.gender) riderGender = u.gender;
    }

    await db.run(
      `INSERT INTO rides (
        id, rider_id, rider_name, rider_gender, pickup_name, pickup_lat, pickup_lng,
        dest_name, dest_lat, dest_lng, date, time, vehicle,
        capacity, seats_available, route_distance_km, status, is_live, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?)`,
      [
        id,
        rider_id,
        rider_name,
        riderGender || 'Male',
        pickup_name,
        Number(pickup_lat),
        Number(pickup_lng),
        dest_name,
        Number(dest_lat),
        Number(dest_lng),
        rideDate,
        time,
        finalVehicle,
        capacity,
        seats_available,
        distanceKm,
        createdAt,
      ]
    );

    const createdRide = await db.get(
      `SELECT r.*, COALESCE(r.rider_gender, u.gender, 'Male') as rider_gender 
       FROM rides r 
       LEFT JOIN users u ON r.rider_id = u.id 
       WHERE r.id = ?`,
      [id]
    );
    await logAuditEvent(
      'RIDE_CREATED',
      id,
      rider_name,
      `Created ${vehicle} ride from ${pickup_name} to ${dest_name} on ${rideDate} at ${time} (Cap: ${capacity})`
    );
    res.status(201).json({ ride: createdRide });
  } catch (error: any) {
    console.error('Error creating ride:', error);
    res.status(500).json({ error: error.message || 'Failed to create ride' });
  }
});

// Search & List Rides with Strict Destination and Pickup Matching
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const now = Date.now();
    const twoHoursMs = 7200000;

    const allRides = await db.all<any>(
      `SELECT r.*, COALESCE(r.rider_gender, u.gender, 'Male') AS rider_gender 
       FROM rides r 
       LEFT JOIN users u ON r.rider_id = u.id 
       WHERE r.status = 'active' AND r.seats_available > 0 
       ORDER BY r.created_at DESC`
    );

    // Perform Ghost Ride expiration in-memory using JavaScript:
    const activeRides = allRides.filter((ride) => {
      if (ride.created_at && (now - Number(ride.created_at) > twoHoursMs)) {
        // Fire async db update & filter out
        db.run("UPDATE rides SET status = 'expired' WHERE id = ?", [ride.id]).catch(() => {});
        return false;
      }
      return true;
    });

    const reqDest = String(
      req.query.destination ||
      req.query.dest_name ||
      req.query.dest ||
      req.body?.destination ||
      req.body?.dest_name ||
      ''
    ).trim().toLowerCase();

    const reqPickup = String(
      req.query.pickup ||
      req.query.pickup_name ||
      req.body?.pickup ||
      req.body?.pickup_name ||
      ''
    ).trim().toLowerCase();

    const reqDestLat = req.query.destLat ?? req.query.dest_lat ?? req.body?.destLat ?? req.body?.dest_lat;
    const reqDestLng = req.query.destLng ?? req.query.dest_lng ?? req.body?.destLng ?? req.body?.dest_lng;
    const reqPickupLat = req.query.pickupLat ?? req.query.pickup_lat ?? req.body?.pickupLat ?? req.body?.pickup_lat;
    const reqPickupLng = req.query.pickupLng ?? req.query.pickup_lng ?? req.body?.pickupLng ?? req.body?.pickup_lng;

    const hasSearchParams = Boolean(
      reqDest || reqPickup || (reqDestLat && reqDestLng) || (reqPickupLat && reqPickupLng)
    );

    const matches = hasSearchParams
      ? activeRides.filter((ride) => {
          const rideDest = String(ride.destination || ride.dest_name || '').trim().toLowerCase();
          const ridePickup = String(ride.pickup || ride.pickup_name || '').trim().toLowerCase();
          const rideDestLat = ride.destLat ?? ride.dest_lat;
          const rideDestLng = ride.destLng ?? ride.dest_lng;
          const ridePickupLat = ride.pickupLat ?? ride.pickup_lat;
          const ridePickupLng = ride.pickupLng ?? ride.pickup_lng;

          // 1. Destination Check: exact string match OR coordinates <= 150m OR substring match
          let destOk = Boolean(reqDest.length > 0 && (reqDest === rideDest || rideDest.includes(reqDest) || reqDest.includes(rideDest)));
          if (!destOk && reqDestLat && reqDestLng && rideDestLat && rideDestLng) {
            const dDist = calculateHaversineMeters(
              Number(reqDestLat), Number(reqDestLng),
              Number(rideDestLat), Number(rideDestLng)
            );
            if (dDist <= 150) destOk = true;
          }

          // 2. Pickup Check: exact string match OR coordinates <= 300m OR substring match
          let pickupOk = Boolean(reqPickup.length > 0 && (reqPickup === ridePickup || ridePickup.includes(reqPickup) || reqPickup.includes(ridePickup)));
          if (!pickupOk && reqPickupLat && reqPickupLng && ridePickupLat && ridePickupLng) {
            const pDist = calculateHaversineMeters(
              Number(reqPickupLat), Number(reqPickupLng),
              Number(ridePickupLat), Number(ridePickupLng)
            );
            if (pDist <= 300) pickupOk = true;
          }

          // Both must match when searching
          if (!destOk || !pickupOk) return false;
          if (ride.seats_available <= 0) return false;
          if (ride.status === 'cancelled' || ride.status === 'completed' || ride.status === 'expired') return false;

          return true;
        })
      : activeRides;

    const formattedMatches = matches.map((ride) => {
      let dist = ride.route_distance_km || 4.2;
      if (reqPickupLat && reqPickupLng && reqDestLat && reqDestLng) {
        const pDist = haversineDistance(
          { lat: Number(reqPickupLat), lng: Number(reqPickupLng) },
          { lat: Number(reqDestLat), lng: Number(reqDestLng) }
        );
        if (pDist > 0) dist = pDist;
      }
      // Force fare formula: Math.round(10 + distance_km * 5)
      const passengerFare = Math.round(10 + dist * 5);
      return {
        ...ride,
        destination: ride.dest_name || ride.destination,
        pickup: ride.pickup_name || ride.pickup,
        destLat: ride.dest_lat ?? ride.destLat,
        destLng: ride.dest_lng ?? ride.destLng,
        pickupLat: ride.pickup_lat ?? ride.pickupLat,
        pickupLng: ride.pickup_lng ?? ride.pickupLng,
        passenger_distance_km: dist,
        calculated_fare: passengerFare,
      };
    });

    console.log(`[RIDE_SEARCH] hasSearchParams=${hasSearchParams} matched ${formattedMatches.length} rides`);
    return res.json(formattedMatches);
  } catch (error: any) {
    console.error('Error fetching rides:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's active ride (rider or passenger)
router.get('/user/:userId/active', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // Check if user is rider on an active ride
    const riderRide = await db.get(
      `SELECT * FROM rides WHERE rider_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (riderRide) {
      // Fetch passengers with robust join
      const passengers = await db.all(
        `SELECT rp.*, 
                COALESCE(u.name, jr.passenger_name, 'Verified Student') as name, 
                COALESCE(u.pid, 'COEP-P19') as pid, 
                u.avatar_seed,
                jr.trip_otp 
         FROM ride_passengers rp 
         LEFT JOIN users u ON rp.passenger_id = u.id 
         LEFT JOIN (SELECT passenger_id, ride_id, passenger_name, trip_otp FROM join_requests GROUP BY passenger_id, ride_id) jr ON jr.ride_id = rp.ride_id AND jr.passenger_id = rp.passenger_id
         WHERE rp.ride_id = ?`,
        [riderRide.id]
      );
      // Fetch pending requests
      const requests = await db.all(
        `SELECT * FROM join_requests WHERE ride_id = ? AND status = 'pending' ORDER BY created_at DESC`,
        [riderRide.id]
      );

      res.json({
        role: 'rider',
        ride: riderRide,
        passengers,
        requests,
      });
      return;
    }

    // Check if user is passenger on an active ride
    const passengerJoin = await db.get(
      `SELECT rp.*, r.* 
       FROM ride_passengers rp 
       JOIN rides r ON rp.ride_id = r.id 
       WHERE rp.passenger_id = ? AND r.status = 'active' 
       ORDER BY rp.joined_at DESC LIMIT 1`,
      [userId]
    );

    if (passengerJoin) {
      res.json({
        role: 'passenger',
        ride: passengerJoin,
        passengers: [passengerJoin],
        requests: [],
      });
      return;
    }

    // Check if user has an active pending/approved join_request
    const activeReq = await db.get(
      `SELECT jr.*, r.vehicle, r.time, r.date, r.rider_name, r.route_distance_km, r.status as ride_status
       FROM join_requests jr
       JOIN rides r ON jr.ride_id = r.id
       WHERE jr.passenger_id = ? AND jr.status IN ('pending', 'approved') AND r.status = 'active'
       ORDER BY jr.created_at DESC LIMIT 1`,
      [userId]
    );

    if (activeReq) {
      res.json({
        role: 'passenger_request',
        request: activeReq,
        ride: {
          id: activeReq.ride_id,
          rider_name: activeReq.rider_name,
          pickup_name: activeReq.pickup_name,
          dest_name: activeReq.dest_name,
          pickup_lat: activeReq.pickup_lat,
          pickup_lng: activeReq.pickup_lng,
          dest_lat: activeReq.dest_lat,
          dest_lng: activeReq.dest_lng,
          time: activeReq.time,
          vehicle: activeReq.vehicle,
          status: activeReq.ride_status,
        },
      });
      return;
    }

    // Check if passenger was recently completed/dropped off from an active ride
    const completedReq = await db.get(
      `SELECT jr.*, r.vehicle, r.time, r.date, r.rider_name, r.route_distance_km, r.status as ride_status
       FROM join_requests jr
       JOIN rides r ON jr.ride_id = r.id
       WHERE jr.passenger_id = ? AND jr.status IN ('completed', 'dropped_off') AND r.status = 'active'
       ORDER BY jr.created_at DESC LIMIT 1`,
      [userId]
    );

    if (completedReq) {
      res.json({
        role: 'passenger_completed',
        request: completedReq,
        ride: null,
      });
      return;
    }

    res.json({ role: null, ride: null });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific ride details
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const ride = await db.get('SELECT * FROM rides WHERE id = ?', [req.params.id]);
    if (!ride) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }

    const passengers = await db.all(
      `SELECT rp.*, 
              COALESCE(u.name, jr.passenger_name, 'Verified Student') as name, 
              COALESCE(u.pid, 'COEP-P19') as pid, 
              u.avatar_seed,
              jr.trip_otp
       FROM ride_passengers rp 
       LEFT JOIN users u ON rp.passenger_id = u.id 
       LEFT JOIN (SELECT passenger_id, ride_id, passenger_name, trip_otp FROM join_requests WHERE status = 'approved' GROUP BY passenger_id, ride_id) jr ON jr.ride_id = rp.ride_id AND jr.passenger_id = rp.passenger_id
       WHERE rp.ride_id = ?`,
      [ride.id]
    );

    const requests = await db.all(
      `SELECT * FROM join_requests WHERE ride_id = ? ORDER BY created_at DESC`,
      [ride.id]
    );

    res.json({ ride, passengers, requests });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start Live Ride (Scheduled -> Live) with Driver OTP Gate
router.patch('/:id/start', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { otp } = req.body || {};

    const ride = await db.get('SELECT * FROM rides WHERE id = ?', [id]);
    if (!ride) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }

    // Driver OTP Gate: explicitly require otp and verify against approved passenger trip_otp
    const approvedRequests = await db.all(
      `SELECT * FROM join_requests WHERE ride_id = ? AND status = 'approved'`,
      [id]
    );

    if (approvedRequests.length > 0) {
      if (!otp) {
        res.status(400).json({ error: 'Invalid PIN' });
        return;
      }
      const validOtps = approvedRequests.map((r: any) => String(r.trip_otp || '').trim()).filter(Boolean);
      const cleanOtp = String(otp).trim();
      if (!validOtps.includes(cleanOtp)) {
        res.status(400).json({ error: 'Invalid PIN' });
        return;
      }
    }

    await db.run('UPDATE rides SET is_live = 1 WHERE id = ?', [id]);
    const updatedRide = await db.get(
      `SELECT r.*, COALESCE(r.rider_gender, u.gender, 'Male') as rider_gender 
       FROM rides r 
       LEFT JOIN users u ON r.rider_id = u.id 
       WHERE r.id = ?`,
      [id]
    );

    await logAuditEvent('APPROVED', id, updatedRide?.rider_name || 'Rider', 'Rider started live ride with verified OTP');
    res.json({ success: true, ride: updatedRide });
  } catch (error: any) {
    console.error('Error starting live ride:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/start', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { otp } = req.body || {};

    const ride = await db.get('SELECT * FROM rides WHERE id = ?', [id]);
    if (!ride) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }

    const approvedRequests = await db.all(
      `SELECT * FROM join_requests WHERE ride_id = ? AND status = 'approved'`,
      [id]
    );

    if (approvedRequests.length > 0) {
      if (!otp) {
        res.status(400).json({ error: 'Invalid PIN' });
        return;
      }
      const validOtps = approvedRequests.map((r: any) => String(r.trip_otp || '').trim()).filter(Boolean);
      const cleanOtp = String(otp).trim();
      if (!validOtps.includes(cleanOtp)) {
        res.status(400).json({ error: 'Invalid PIN' });
        return;
      }
    }

    await db.run('UPDATE rides SET is_live = 1 WHERE id = ?', [id]);
    const updatedRide = await db.get(
      `SELECT r.*, COALESCE(r.rider_gender, u.gender, 'Male') as rider_gender 
       FROM rides r 
       LEFT JOIN users u ON r.rider_id = u.id 
       WHERE r.id = ?`,
      [id]
    );

    await logAuditEvent('APPROVED', id, updatedRide?.rider_name || 'Rider', 'Rider started live ride with verified OTP');
    res.json({ success: true, ride: updatedRide });
  } catch (error: any) {
    console.error('Error starting live ride:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete Ride Slider action (Rider Only)
router.post('/:id/complete', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const ride = await db.get('SELECT * FROM rides WHERE id = ?', [id]);
    if (!ride) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }

    if (ride.status === 'completed') {
      res.json({ success: true, message: 'Already completed', ride });
      return;
    }

    // Fetch joined passengers to calculate total earnings
    const passengers = await db.all('SELECT * FROM ride_passengers WHERE ride_id = ?', [id]);
    
    // Total passenger fare earnings
    let totalFare = passengers.reduce((sum: number, p: any) => sum + (p.fare || 0), 0);
    
    // If no passengers joined in prototype demo, provide default ride fare based on distance
    if (totalFare === 0) {
      const rate = ride.vehicle === 'Bike' ? 8 : 10;
      totalFare = Math.round(ride.route_distance_km * rate);
    }

    // Platform Fee = 1% of total earnings
    const platformFee = Number((totalFare * 0.01).toFixed(2));
    const now = Date.now();

    // 1. Update ride status
    await db.run(`UPDATE rides SET status = 'completed' WHERE id = ?`, [id]);
    await db.run(
      `UPDATE join_requests SET status = 'completed' WHERE ride_id = ? AND status = 'approved'`,
      [id]
    );

    // 2. Log Earning in Wallet
    const earningTxId = 'tx_' + Date.now().toString(36) + '_earn';
    await db.run(
      `INSERT INTO wallet_transactions (id, user_id, type, amount, description, ride_id, created_at)
       VALUES (?, ?, 'earning', ?, ?, ?, ?)`,
      [
        earningTxId,
        ride.rider_id,
        totalFare,
        `Ride Earnings: ${ride.pickup_name} -> ${ride.dest_name}`,
        ride.id,
        now,
      ]
    );

    // 3. Log 1% Platform Fee Deduction
    const feeTxId = 'tx_' + Date.now().toString(36) + '_fee';
    await db.run(
      `INSERT INTO wallet_transactions (id, user_id, type, amount, description, ride_id, created_at)
       VALUES (?, ?, 'platform_fee', ?, 'Platform Service Fee (1% deduction)', ?, ?)`,
      [feeTxId, ride.rider_id, -platformFee, ride.id, now + 100]
    );

    const updatedRide = await db.get('SELECT * FROM rides WHERE id = ?', [id]);
    await logAuditEvent(
      'COMPLETED',
      id,
      ride.rider_name,
      `Ride completed. Fares earned: ₹${totalFare}, 1% Platform Fee: ₹${platformFee}`
    );
    res.json({
      success: true,
      ride: updatedRide,
      earnings: totalFare,
      platform_fee: platformFee,
      net_earning: Number((totalFare - platformFee).toFixed(2)),
    });
  } catch (error: any) {
    console.error('Error completing ride:', error);
    res.status(500).json({ error: error.message });
  }
});

// Drop Off Individual Passenger (Does NOT cancel or complete the ride; ride remains active)
router.post('/:rideId/dropoff/:passengerId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { rideId, passengerId } = req.params;
    const ride = await db.get('SELECT * FROM rides WHERE id = ?', [rideId]);
    if (!ride) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }

    // Locate the passenger in ride_passengers
    const passengerRecord = await db.get(
      `SELECT rp.*, u.name as passenger_name 
       FROM ride_passengers rp
       LEFT JOIN users u ON rp.passenger_id = u.id
       WHERE rp.ride_id = ? AND (rp.passenger_id = ? OR rp.id = ?)`,
      [rideId, passengerId, passengerId]
    );

    if (!passengerRecord) {
      res.status(404).json({ error: 'Passenger not found on this active ride' });
      return;
    }

    const fareEarned = passengerRecord.fare || 15;
    const pName = passengerRecord.passenger_name || 'Passenger';
    const now = Date.now();

    // 1. Remove only this specific passenger from ride_passengers
    await db.run('DELETE FROM ride_passengers WHERE id = ?', [passengerRecord.id]);

    // Update the passenger's specific join_requests row to status = 'completed'
    await db.run(
      `UPDATE join_requests SET status = 'completed' 
       WHERE ride_id = ? AND passenger_id = ? AND status = 'approved'`,
      [rideId, passengerId]
    );

    // 2. Increment seats_available by 1 (strictly never exceeds the vehicle's maximum capacity)
    const maxCapacity = ride.capacity || (ride.vehicle === 'Bike' ? 1 : 3);
    const currentSeats = typeof ride.seats_available === 'number' ? ride.seats_available : 0;
    const newSeatsAvailable = Math.min(maxCapacity, Math.max(0, currentSeats) + 1);

    // Strictly enforce that the main ride status remains 'active'
    await db.run(
      "UPDATE rides SET status = 'active', seats_available = ? WHERE id = ?",
      [newSeatsAvailable, rideId]
    );

    // 3. Credit rider's wallet for this passenger's fare
    const txId = 'tx_' + Date.now().toString(36) + '_drop';
    await db.run(
      `INSERT INTO wallet_transactions (id, user_id, type, amount, description, ride_id, created_at)
       VALUES (?, ?, 'earning', ?, ?, ?, ?)`,
      [txId, ride.rider_id, fareEarned, `Dropped off ${pName} - Earned ₹${fareEarned}`, rideId, now]
    );

    // 4. Audit log (Ride remains active)
    await logAuditEvent(
      'COMPLETED',
      rideId,
      ride.rider_name,
      `Dropped off ${pName}. Fare earned: ₹${fareEarned} (Ride remains active)`
    );

    // 5. Fetch updated ride and remaining passengers
    const updatedRide = await db.get('SELECT * FROM rides WHERE id = ?', [rideId]);
    const remainingPassengers = await db.all(
      `SELECT rp.*, u.name, u.pid, u.avatar_seed 
       FROM ride_passengers rp 
       JOIN users u ON rp.passenger_id = u.id 
       WHERE rp.ride_id = ?`,
      [rideId]
    );

    res.json({
      success: true,
      message: `Dropped off ${pName} - Earned ₹${fareEarned}`,
      dropped_passenger: pName,
      fare_earned: fareEarned,
      seats_available: updatedRide.seats_available,
      ride: updatedRide,
      passengers: remainingPassengers,
    });
  } catch (error: any) {
    console.error('Error dropping off passenger:', error);
    res.status(500).json({ error: error.message });
  }
});

// History: Previous rides for Passenger specifically (join_requests joined with rides)
router.get('/history/passenger/:passengerId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { passengerId } = req.params;

    const fromRequests = await db.all(
      `SELECT 
        jr.id as id,
        jr.id as request_id,
        jr.ride_id,
        jr.passenger_id,
        jr.passenger_name,
        jr.pickup_name,
        jr.dest_name,
        jr.distance_km,
        jr.fare,
        jr.status as status,
        jr.status as request_status,
        jr.created_at,
        r.rider_name,
        r.rider_gender,
        COALESCE(r.vehicle, 'Bike') as vehicle,
        COALESCE(r.date, 'Today') as date,
        COALESCE(r.time, '08:30') as time,
        r.status as ride_status
       FROM join_requests jr
       JOIN rides r ON jr.ride_id = r.id
       WHERE jr.passenger_id = ? AND jr.status IN ('completed', 'rejected', 'dropped_off')
       ORDER BY jr.created_at DESC`,
      [passengerId]
    );

    // Also include past completed rides from ride_passengers (seeded history) if not duplicate
    const fromRidePassengers = await db.all(
      `SELECT 
        rp.id as id,
        rp.id as request_id,
        rp.ride_id,
        rp.passenger_id,
        COALESCE(u.name, 'Passenger') as passenger_name,
        r.pickup_name,
        r.dest_name,
        r.route_distance_km as distance_km,
        rp.fare,
        'completed' as status,
        'completed' as request_status,
        rp.joined_at as created_at,
        r.rider_name,
        r.rider_gender,
        COALESCE(r.vehicle, 'Bike') as vehicle,
        COALESCE(r.date, 'Yesterday') as date,
        COALESCE(r.time, '09:00') as time,
        r.status as ride_status
       FROM ride_passengers rp
       JOIN rides r ON rp.ride_id = r.id
       LEFT JOIN users u ON rp.passenger_id = u.id
       WHERE rp.passenger_id = ? AND r.status = 'completed'`,
      [passengerId]
    );

    const seenRides = new Set(fromRequests.map((r: any) => r.ride_id));
    const extra = fromRidePassengers.filter((r: any) => !seenRides.has(r.ride_id));
    const history = [...fromRequests, ...extra].sort((a: any, b: any) => b.created_at - a.created_at);

    res.json({ history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// History: Previous rides for Rider or Passenger
router.get('/history/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // Rides where user was rider
    const asRider = await db.all(
      `SELECT r.*, 'rider' as user_role, 
       (SELECT COUNT(*) FROM ride_passengers WHERE ride_id = r.id) as passenger_count,
       (SELECT COALESCE(SUM(fare), 0) FROM ride_passengers WHERE ride_id = r.id) as total_fare
       FROM rides r 
       WHERE r.rider_id = ? AND r.status = 'completed'
       ORDER BY r.created_at DESC`,
      [userId]
    );

    // Rides where user was passenger
    const asPassenger = await db.all(
      `SELECT r.*, 'passenger' as user_role, rp.fare as passenger_fare
       FROM rides r 
       JOIN ride_passengers rp ON r.id = rp.ride_id
       WHERE rp.passenger_id = ? AND r.status = 'completed'
       ORDER BY r.created_at DESC`,
      [userId]
    );

    const history = [...asRider, ...asPassenger].sort(
      (a, b) => b.created_at - a.created_at
    );

    res.json({ history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel active ride
router.post('/:id/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rideToCancel = await db.get('SELECT * FROM rides WHERE id = ?', [id]);
    await db.run(`UPDATE rides SET status = 'cancelled' WHERE id = ?`, [id]);
    await db.run(
      `UPDATE join_requests SET status = 'cancelled' WHERE ride_id = ? AND status IN ('pending', 'approved')`,
      [id]
    );
    await db.run(`DELETE FROM ride_passengers WHERE ride_id = ?`, [id]);
    await logAuditEvent(
      'CANCELLED',
      id,
      rideToCancel?.rider_name || 'Rider',
      `Ride cancelled: ${rideToCancel?.pickup_name || 'Pickup'} -> ${rideToCancel?.dest_name || 'Destination'}`
    );
    res.json({ success: true, message: 'Ride cancelled' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
