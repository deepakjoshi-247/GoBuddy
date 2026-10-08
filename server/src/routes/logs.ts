import { Router, Request, Response } from 'express';
import { db, AuditLog } from '../db';

const router = Router();

// GET /api/logs - Production Audit Logs endpoint
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { event, ride_id, limit = '100' } = req.query;

    let query = `SELECT * FROM audit_logs`;
    const params: any[] = [];
    const conditions: string[] = [];

    if (event && String(event).trim() && event !== 'ALL') {
      conditions.push(`event = ?`);
      params.push(String(event).trim());
    }

    if (ride_id && String(ride_id).trim()) {
      conditions.push(`ride_id = ?`);
      params.push(String(ride_id).trim());
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(Math.min(200, Math.max(1, Number(limit) || 100)));

    const logs = await db.all<AuditLog>(query, params);
    const countRow = await db.get<{ count: number }>(`SELECT COUNT(*) as count FROM audit_logs`);

    res.json({
      logs: logs || [],
      count: (logs || []).length,
      total: countRow?.count || 0,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch audit logs' });
  }
});

export default router;
