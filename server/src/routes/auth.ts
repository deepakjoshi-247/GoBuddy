import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

// Login / Sign In with Name, PID, and Gender
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, pid, role, gender } = req.body;
    if (!name || !pid) {
      res.status(400).json({ error: 'Name and PID are required' });
      return;
    }

    const trimmedPid = pid.trim();
    const trimmedName = name.trim();
    const avatarSeed = trimmedName.split(' ')[0] || 'Student';

    // Check if user exists with PID
    const existing = await db.get('SELECT * FROM users WHERE pid = ?', [trimmedPid]);
    if (existing) {
      // If role or gender was explicitly provided, update it
      let updatedRole = existing.role;
      let updatedGender = gender || existing.gender || 'Male';
      if (role && (role === 'rider' || role === 'passenger')) {
        updatedRole = role;
      }
      if (gender && (gender === 'Male' || gender === 'Female')) {
        updatedGender = gender;
      }
      await db.run('UPDATE users SET role = ?, gender = ? WHERE id = ?', [
        updatedRole,
        updatedGender,
        existing.id,
      ]);
      existing.role = updatedRole;
      existing.gender = updatedGender;
      res.json({ user: existing });
      return;
    }

    // New user auto-registration via login
    let assignedRole: 'rider' | 'passenger' = 'passenger';
    if (role === 'rider' || role === 'passenger') {
      assignedRole = role;
    } else if (trimmedPid.toUpperCase().includes('-R')) {
      assignedRole = 'rider';
    }

    const assignedGender = (gender === 'Male' || gender === 'Female') ? gender : 'Male';

    // Create new user
    const id = 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    await db.run(
      'INSERT INTO users (id, name, pid, role, avatar_seed, gender) VALUES (?, ?, ?, ?, ?, ?)',
      [id, trimmedName, trimmedPid, assignedRole, avatarSeed, assignedGender]
    );

    const newUser = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    res.json({ user: newUser });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// New Registration with Name, Email, PID, Phone, Role, Vehicle, and Gender
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, pid, phone, role, vehicle, gender } = req.body;
    if (!name || !pid || !role) {
      res.status(400).json({ error: 'Full Name, PID, and Role are required' });
      return;
    }

    if (!gender || (gender !== 'Male' && gender !== 'Female')) {
      res.status(400).json({ error: 'Gender is required and must be either Male or Female' });
      return;
    }

    const trimmedPid = pid.trim();
    const trimmedName = name.trim();
    const trimmedEmail = email ? email.trim() : null;
    const trimmedPhone = phone ? phone.trim() : null;
    const assignedGender: 'Male' | 'Female' = gender;
    const avatarSeed = trimmedName.split(' ')[0] || 'Student';

    // Check if user already exists
    const existing = await db.get('SELECT * FROM users WHERE pid = ?', [trimmedPid]);
    if (existing) {
      // Update existing record
      await db.run(
        'UPDATE users SET name = ?, email = ?, phone = ?, role = ?, vehicle = ?, gender = ? WHERE id = ?',
        [trimmedName, trimmedEmail, trimmedPhone, role, vehicle || null, assignedGender, existing.id]
      );
      const updated = await db.get('SELECT * FROM users WHERE id = ?', [existing.id]);
      res.json({ user: updated });
      return;
    }

    const id = 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    await db.run(
      'INSERT INTO users (id, name, pid, role, avatar_seed, email, phone, vehicle, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, trimmedName, trimmedPid, role, avatarSeed, trimmedEmail, trimmedPhone, vehicle || null, assignedGender]
    );

    const newUser = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    res.status(201).json({ user: newUser });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// Get user profile by ID
router.get('/me/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get demo user presets
router.get('/presets', async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await db.all('SELECT * FROM users ORDER BY name ASC');
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
