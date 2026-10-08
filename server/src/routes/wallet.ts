import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

// Get wallet summary & transactions for a user
router.get('/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const transactions = await db.all(
      `SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    let totalBalance = 0;
    let totalEarnings = 0;
    let totalFees = 0;
    let totalFines = 0;

    for (const tx of transactions) {
      totalBalance += tx.amount;
      if (tx.type === 'earning') {
        totalEarnings += tx.amount;
      } else if (tx.type === 'platform_fee') {
        totalFees += Math.abs(tx.amount);
      } else if (tx.type === 'fine') {
        totalFines += Math.abs(tx.amount);
      }
    }

    res.json({
      balance: Number(totalBalance.toFixed(2)),
      total_earnings: Number(totalEarnings.toFixed(2)),
      total_fees: Number(totalFees.toFixed(2)),
      total_fines: Number(totalFines.toFixed(2)),
      transactions,
    });
  } catch (error: any) {
    console.error('Wallet error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mock adding a fine or deposit for demonstration purposes
router.post('/:userId/mock-fine', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { amount = 30, description = '30% No-Show Cancellation Fine (Demo)' } = req.body;

    const txId = 'tx_' + Date.now().toString(36) + '_fine';
    await db.run(
      `INSERT INTO wallet_transactions (id, user_id, type, amount, description, ride_id, created_at)
       VALUES (?, ?, 'fine', ?, ?, NULL, ?)`,
      [txId, userId, -Math.abs(amount), description, Date.now()]
    );

    res.json({ success: true, message: 'Demo fine applied' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
