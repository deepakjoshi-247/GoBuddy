import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.resolve(__dirname, '..');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.resolve(DB_DIR, 'chalona.db');

export class Database {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      }
    });
  }

  public run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (this: sqlite3.RunResult, err: Error | null) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  public get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err: Error | null, row: T) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  public all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err: Error | null, rows: T[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  public exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export const db = new Database();

export async function initDb() {
  try {
    const tableInfo = await db.get<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='join_requests'"
    );
    if (tableInfo?.sql && (!tableInfo.sql.includes('completed') || !tableInfo.sql.includes('dropped_off') || !tableInfo.sql.includes('trip_otp'))) {
      await db.exec(`DROP TABLE IF EXISTS join_requests;`);
    }

    const ridesTableInfo = await db.get<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='rides'"
    );
    if (ridesTableInfo?.sql && !ridesTableInfo.sql.includes('expired')) {
      await db.exec(`DROP TABLE IF EXISTS rides;`);
    }
  } catch (e) {
    // ignore
  }

  // Safe migrations for user registration fields
  try {
    await db.exec(`ALTER TABLE users ADD COLUMN email TEXT;`);
  } catch (e) {}
  try {
    await db.exec(`ALTER TABLE users ADD COLUMN phone TEXT;`);
  } catch (e) {}
  try {
    await db.exec(`ALTER TABLE users ADD COLUMN vehicle TEXT;`);
  } catch (e) {}
  try {
    await db.exec(`ALTER TABLE users ADD COLUMN gender TEXT;`);
  } catch (e) {}
  try {
    await db.exec(`ALTER TABLE rides ADD COLUMN rider_gender TEXT;`);
  } catch (e) {}
  try {
    await db.exec(`ALTER TABLE rides ADD COLUMN is_live INTEGER DEFAULT 0;`);
  } catch (e) {}
  try {
    await db.exec(`ALTER TABLE join_requests ADD COLUMN trip_otp TEXT;`);
  } catch (e) {}

  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pid TEXT UNIQUE NOT NULL,
      role TEXT CHECK(role IN ('rider', 'passenger')) NOT NULL,
      avatar_seed TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      vehicle TEXT,
      gender TEXT CHECK(gender IN ('Male', 'Female'))
    );

    CREATE TABLE IF NOT EXISTS rides (
      id TEXT PRIMARY KEY,
      rider_id TEXT NOT NULL,
      rider_name TEXT NOT NULL,
      rider_gender TEXT,
      pickup_name TEXT NOT NULL,
      pickup_lat REAL NOT NULL,
      pickup_lng REAL NOT NULL,
      dest_name TEXT NOT NULL,
      dest_lat REAL NOT NULL,
      dest_lng REAL NOT NULL,
      date TEXT NOT NULL DEFAULT 'Tomorrow',
      time TEXT NOT NULL,
      vehicle TEXT NOT NULL DEFAULT 'Bike',
      capacity INTEGER NOT NULL DEFAULT 1,
      seats_available INTEGER NOT NULL DEFAULT 1,
      route_distance_km REAL NOT NULL,
      status TEXT CHECK(status IN ('active', 'completed', 'cancelled', 'expired')) NOT NULL DEFAULT 'active',
      is_live INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS join_requests (
      id TEXT PRIMARY KEY,
      ride_id TEXT NOT NULL,
      passenger_id TEXT NOT NULL,
      passenger_name TEXT NOT NULL,
      pickup_name TEXT NOT NULL,
      pickup_lat REAL NOT NULL,
      pickup_lng REAL NOT NULL,
      dest_name TEXT NOT NULL,
      dest_lat REAL NOT NULL,
      dest_lng REAL NOT NULL,
      distance_km REAL NOT NULL,
      fare INTEGER NOT NULL,
      status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled', 'completed', 'dropped_off')) NOT NULL DEFAULT 'pending',
      trip_otp TEXT,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ride_passengers (
      id TEXT PRIMARY KEY,
      ride_id TEXT NOT NULL,
      passenger_id TEXT NOT NULL,
      fare INTEGER NOT NULL,
      joined_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT CHECK(type IN ('earning', 'platform_fee', 'fine')) NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      ride_id TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      ride_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      event TEXT CHECK(event IN ('RIDE_CREATED', 'JOIN_REQUESTED', 'APPROVED', 'CANCELLED', 'COMPLETED')) NOT NULL,
      ride_id TEXT,
      user_name TEXT NOT NULL,
      details TEXT
    );
  `;

  await db.exec(schema);
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

export async function logAuditEvent(
  event: AuditEventType,
  ride_id: string,
  user_name: string,
  details: string
): Promise<void> {
  try {
    const id = 'log_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    await db.run(
      `INSERT INTO audit_logs (id, timestamp, event, ride_id, user_name, details) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, Date.now(), event, ride_id, user_name, details]
    );
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}
