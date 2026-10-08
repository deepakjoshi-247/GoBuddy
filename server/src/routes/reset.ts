import { Router, Request, Response } from 'express';
import { seedDatabase } from '../seed';

const router = Router();

// Instant Demo Reset endpoint
router.post('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    await seedDatabase();
    res.json({
      success: true,
      message: 'ChaloNa database successfully reset to clean demo state.',
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Reset error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
