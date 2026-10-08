import { db, initDb } from './db';

export async function seedDatabase() {
  await initDb();

  // Clear existing tables
  await db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM chat_messages;
    DELETE FROM wallet_transactions;
    DELETE FROM ride_passengers;
    DELETE FROM join_requests;
    DELETE FROM rides;
    DELETE FROM users;
  `);

  console.log('Seeding demo users...');

  // Seed Users
  const users = [
    {
      id: 'user_aarav',
      name: 'Aarav Sharma',
      pid: 'COEP-2024-R42',
      role: 'rider',
      avatar_seed: 'Aarav',
      email: 'aarav.sharma@coep.ac.in',
      phone: '+91 98201 12345',
      vehicle: 'Bike',
      gender: 'Male',
    },
    {
      id: 'user_rohan',
      name: 'Rohan Verma',
      pid: 'COEP-2024-P19',
      role: 'passenger',
      avatar_seed: 'Rohan',
      email: 'rohan.verma@coep.ac.in',
      phone: '+91 98302 23456',
      vehicle: null,
      gender: 'Male',
    },
    {
      id: 'user_priya',
      name: 'Priya Patel',
      pid: 'COEP-2024-P23',
      role: 'passenger',
      avatar_seed: 'Priya',
      email: 'priya.patel@coep.ac.in',
      phone: '+91 98403 34567',
      vehicle: null,
      gender: 'Female',
    },
    {
      id: 'user_ananya',
      name: 'Ananya Deshmukh',
      pid: 'COEP-2024-R15',
      role: 'rider',
      avatar_seed: 'Ananya',
      email: 'ananya.d@coep.ac.in',
      phone: '+91 98504 45678',
      vehicle: 'Bike',
      gender: 'Female',
    },
  ];

  for (const u of users) {
    await db.run(
      `INSERT INTO users (id, name, pid, role, avatar_seed, email, phone, vehicle, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.id, u.name, u.pid, u.role, u.avatar_seed, u.email, u.phone, u.vehicle, u.gender]
    );
  }

  // Seed Active Ride for Instant Search Matching
  console.log('Seeding active ride for live matching...');
  const activeRideId = 'ride_active_aarav';
  const now = Date.now();
  await db.run(
    `INSERT INTO rides (
      id, rider_id, rider_name, rider_gender, pickup_name, pickup_lat, pickup_lng, 
      dest_name, dest_lat, dest_lng, date, time, vehicle, capacity, 
      seats_available, route_distance_km, status, is_live, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?)`,
    [
      activeRideId,
      'user_aarav',
      'Aarav Sharma',
      'Male',
      'College Main Gate (Gate 1)',
      18.5308,
      73.8553,
      'Railway Station Junction',
      18.5284,
      73.8744,
      'Today',
      '08:30',
      'Bike',
      1,
      1,
      4.2,
      now,
    ]
  );

  // Seed Past Completed Rides for History
  console.log('Seeding past rides & history...');
  const pastRideId1 = 'ride_past_001';
  const pastRideId2 = 'ride_past_002';
  const oneDayAgo = now - 86400000;
  const twoDaysAgo = now - 172800000;

  // Past ride 1: Aarav completed ride with Rohan
  await db.run(
    `INSERT INTO rides (
      id, rider_id, rider_name, pickup_name, pickup_lat, pickup_lng, 
      dest_name, dest_lat, dest_lng, date, time, vehicle, capacity, 
      seats_available, route_distance_km, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pastRideId1,
      'user_aarav',
      'Aarav Sharma',
      'College Main Gate (Gate 1)',
      18.5308,
      73.8553,
      'Railway Station Junction',
      18.5284,
      73.8744,
      'Yesterday',
      '09:00',
      'Rickshaw',
      3,
      1,
      4.2,
      'completed',
      oneDayAgo,
    ]
  );

  // Rohan was a passenger in pastRideId1
  await db.run(
    `INSERT INTO ride_passengers (id, ride_id, passenger_id, fare, joined_at)
     VALUES (?, ?, ?, ?, ?)`,
    ['rp_past_1', pastRideId1, 'user_rohan', 42, oneDayAgo]
  );

  await db.run(
    `INSERT INTO join_requests (
      id, ride_id, passenger_id, passenger_name,
      pickup_name, pickup_lat, pickup_lng, dest_name, dest_lat, dest_lng,
      distance_km, fare, status, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)`,
    [
      'req_past_1',
      pastRideId1,
      'user_rohan',
      'Rohan Verma',
      'College Main Gate (Gate 1)',
      18.5308,
      73.8553,
      'Railway Station Junction',
      18.5284,
      73.8744,
      4.2,
      42,
      oneDayAgo + 3600000,
      oneDayAgo,
    ]
  );

  // Past ride 2: Ananya completed ride
  await db.run(
    `INSERT INTO rides (
      id, rider_id, rider_name, pickup_name, pickup_lat, pickup_lng, 
      dest_name, dest_lat, dest_lng, date, time, vehicle, capacity, 
      seats_available, route_distance_km, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pastRideId2,
      'user_ananya',
      'Ananya Deshmukh',
      'Central Library Circle',
      18.5335,
      73.8561,
      'Tech Park & Cafeteria',
      18.5529,
      73.8821,
      '2 days ago',
      '17:30',
      'Bike',
      1,
      0,
      5.5,
      'completed',
      twoDaysAgo,
    ]
  );

  // Seed Wallet Transactions for Aarav
  console.log('Seeding wallet transactions...');
  const walletRows = [
    {
      id: 'tx_01',
      user_id: 'user_aarav',
      type: 'earning',
      amount: 120.0,
      description: 'Ride Earnings: College Gate 1 -> Railway Station',
      ride_id: pastRideId1,
      created_at: oneDayAgo,
    },
    {
      id: 'tx_02',
      user_id: 'user_aarav',
      type: 'platform_fee',
      amount: -1.2,
      description: 'Platform Service Fee (1% deduction)',
      ride_id: pastRideId1,
      created_at: oneDayAgo + 500,
    },
    {
      id: 'tx_03',
      user_id: 'user_aarav',
      type: 'earning',
      amount: 80.0,
      description: 'Ride Earnings: Tech Park -> Hostel Circle',
      ride_id: null,
      created_at: twoDaysAgo,
    },
    {
      id: 'tx_04',
      user_id: 'user_aarav',
      type: 'platform_fee',
      amount: -0.8,
      description: 'Platform Service Fee (1% deduction)',
      ride_id: null,
      created_at: twoDaysAgo + 500,
    },
    {
      id: 'tx_05',
      user_id: 'user_aarav',
      type: 'fine',
      amount: -35.0,
      description: 'No-Show Fine (30% penalty demo)',
      ride_id: null,
      created_at: twoDaysAgo + 3600000,
    },
  ];

  for (const tx of walletRows) {
    await db.run(
      `INSERT INTO wallet_transactions (id, user_id, type, amount, description, ride_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tx.id, tx.user_id, tx.type, tx.amount, tx.description, tx.ride_id, tx.created_at]
    );
  }

  // Seed initial chat messages for past demo context
  await db.run(
    `INSERT INTO chat_messages (id, ride_id, sender_id, sender_name, message, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      'chat_01',
      pastRideId1,
      'user_rohan',
      'Rohan Verma',
      "Hi Aarav, I'm standing near the main gate ATM.",
      oneDayAgo - 1200000,
    ]
  );
  await db.run(
    `INSERT INTO chat_messages (id, ride_id, sender_id, sender_name, message, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      'chat_02',
      pastRideId1,
      'user_aarav',
      'Aarav Sharma',
      'Reached! Wearing black helmet, rickshaw #MH12-AB-4040.',
      oneDayAgo - 900000,
    ]
  );

  // Seed Initial Audit Logs
  await db.run(
    `INSERT INTO audit_logs (id, timestamp, event, ride_id, user_name, details) VALUES (?, ?, ?, ?, ?, ?)`,
    ['log_seed_01', twoDaysAgo, 'RIDE_CREATED', pastRideId2, 'Aarav Sharma', 'Created Bike ride from Hostel Block A & Mess to City Center Mall (Cap: 1)']
  );
  await db.run(
    `INSERT INTO audit_logs (id, timestamp, event, ride_id, user_name, details) VALUES (?, ?, ?, ?, ?, ?)`,
    ['log_seed_02', twoDaysAgo + 300000, 'JOIN_REQUESTED', pastRideId2, 'Priya Patel', 'Requested seat from Hostel Block A to City Center Mall (Fare: ₹50)']
  );
  await db.run(
    `INSERT INTO audit_logs (id, timestamp, event, ride_id, user_name, details) VALUES (?, ?, ?, ?, ?, ?)`,
    ['log_seed_03', twoDaysAgo + 600000, 'APPROVED', pastRideId2, 'Priya Patel', 'Passenger approved for seat by rider (Fare: ₹50)']
  );
  await db.run(
    `INSERT INTO audit_logs (id, timestamp, event, ride_id, user_name, details) VALUES (?, ?, ?, ?, ?, ?)`,
    ['log_seed_04', twoDaysAgo + 2400000, 'COMPLETED', pastRideId2, 'Aarav Sharma', 'Ride completed. Fares earned: ₹50, 1% Platform Fee: ₹0.50']
  );
  await db.run(
    `INSERT INTO audit_logs (id, timestamp, event, ride_id, user_name, details) VALUES (?, ?, ?, ?, ?, ?)`,
    ['log_seed_05', oneDayAgo, 'RIDE_CREATED', pastRideId1, 'Aarav Sharma', 'Created Rickshaw ride from College Main Gate to Pune Railway Station (Cap: 3)']
  );
  await db.run(
    `INSERT INTO audit_logs (id, timestamp, event, ride_id, user_name, details) VALUES (?, ?, ?, ?, ?, ?)`,
    ['log_seed_06', oneDayAgo + 200000, 'JOIN_REQUESTED', pastRideId1, 'Rohan Verma', 'Requested seat from Hostel Block A to Railway Station (Fare: ₹35)']
  );
  await db.run(
    `INSERT INTO audit_logs (id, timestamp, event, ride_id, user_name, details) VALUES (?, ?, ?, ?, ?, ?)`,
    ['log_seed_07', oneDayAgo + 400000, 'APPROVED', pastRideId1, 'Rohan Verma', 'Passenger approved for seat by rider (Fare: ₹35)']
  );
  await db.run(
    `INSERT INTO audit_logs (id, timestamp, event, ride_id, user_name, details) VALUES (?, ?, ?, ?, ?, ?)`,
    ['log_seed_08', oneDayAgo + 2800000, 'COMPLETED', pastRideId1, 'Aarav Sharma', 'Ride completed. Fares earned: ₹75, 1% Platform Fee: ₹0.75']
  );

  console.log('Database seeded successfully for ChaloNa demo!');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
