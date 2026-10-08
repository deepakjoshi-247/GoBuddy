import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

// Get messages for a ride (available to ride participants)
router.get('/:rideId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { rideId } = req.params;
    const messages = await db.all(
      `SELECT * FROM chat_messages WHERE ride_id = ? ORDER BY timestamp ASC`,
      [rideId]
    );
    res.json({ messages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Post a message (allows insertion if join_requests record exists with status IN ('pending', 'approved') or if rider)
router.post('/:rideId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { rideId } = req.params;
    const { sender_id, sender_name, message } = req.body;

    if (!sender_id || !message) {
      res.status(400).json({ error: 'Sender and message required' });
      return;
    }

    const ride = await db.get('SELECT rider_id FROM rides WHERE id = ?', [rideId]);
    if (!ride) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }

    const isRider = ride.rider_id === sender_id;
    const hasRequest = await db.get(
      `SELECT id FROM join_requests WHERE ride_id = ? AND passenger_id = ? AND status IN ('pending', 'approved')`,
      [rideId, sender_id]
    );
    const hasPassengerRecord = await db.get(
      `SELECT id FROM ride_passengers WHERE ride_id = ? AND passenger_id = ?`,
      [rideId, sender_id]
    );

    if (!isRider && !hasRequest && !hasPassengerRecord) {
      res.status(403).json({
        error: 'Pre-approval coordination requires an active or pending booking on this ride.',
      });
      return;
    }

    const id = 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const now = Date.now();

    await db.run(
      `INSERT INTO chat_messages (id, ride_id, sender_id, sender_name, message, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, rideId, sender_id, sender_name || 'Passenger', message, now]
    );

    const created = await db.get('SELECT * FROM chat_messages WHERE id = ?', [id]);
    res.status(201).json({ message: created });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
