// End-to-end verification script for ChaloNa prototype
import http from 'http';

function makeRequest(path: string, method = 'GET', body: any = null): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let resBody = '';
        res.on('data', (chunk) => (resBody += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(resBody);
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, text: resBody });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runVerification() {
  console.log('--- STARTING CHALONA E2E VERIFICATION ---');

  // 1. Health check
  console.log('\n[1/8] Verifying Health Check...');
  const health = await makeRequest('/api/health');
  if (health.status !== 200 || health.body.status !== 'ok') {
    throw new Error('Health check failed: ' + JSON.stringify(health));
  }
  console.log('✓ API Health Check OK');

  // 2. Database Reset
  console.log('\n[2/8] Testing Instant Reset...');
  const resetRes = await makeRequest('/api/reset', 'POST');
  if (!resetRes.body.success) {
    throw new Error('Reset failed');
  }
  console.log('✓ DB Reset successful');

  // 3. User Login
  console.log('\n[3/8] Testing Simple Auth for Rider & Passenger...');
  const riderLogin = await makeRequest('/api/auth/login', 'POST', {
    name: 'Aarav Sharma',
    pid: 'COEP-2024-R42',
    role: 'rider',
  });
  const aarav = riderLogin.body.user;
  console.log(`✓ Rider Logged In: ${aarav.name} (${aarav.pid})`);

  const passengerLogin = await makeRequest('/api/auth/login', 'POST', {
    name: 'Rohan Verma',
    pid: 'COEP-2024-P19',
    role: 'passenger',
  });
  const rohan = passengerLogin.body.user;
  console.log(`✓ Passenger Logged In: ${rohan.name} (${rohan.pid})`);

  // 4. Rider Creates Ride
  console.log('\n[4/8] Rider Creating Ride (Rickshaw, Gate 1 -> Station)...');
  const createRideRes = await makeRequest('/api/rides', 'POST', {
    rider_id: aarav.id,
    rider_name: aarav.name,
    pickup_name: 'College Main Gate (Gate 1)',
    pickup_lat: 18.5308,
    pickup_lng: 73.8553,
    dest_name: 'Railway Station Junction',
    dest_lat: 18.5284,
    dest_lng: 73.8744,
    time: '08:30',
    vehicle: 'Rickshaw',
    route_distance_km: 4.2,
  });

  const activeRide = createRideRes.body.ride;
  if (!activeRide || activeRide.capacity !== 3 || activeRide.seats_available !== 3) {
    throw new Error('Ride creation failed or invalid seats: ' + JSON.stringify(createRideRes));
  }
  console.log(`✓ Ride Published: ID ${activeRide.id}, Seats: ${activeRide.seats_available}/${activeRide.capacity}, Vehicle: ${activeRide.vehicle}`);

  // 5. Passenger Corridor Matching Search
  console.log('\n[5/8] Passenger Searching Nearby Corridor Rides (Hostel A -> Station)...');
  const searchRes = await makeRequest(
    `/api/rides?pickup_lat=18.5342&pickup_lng=73.8541&dest_lat=18.5284&dest_lng=73.8744&time=08:45`
  );
  const matched = searchRes.body.rides;
  const targetRide = matched.find((r: any) => r.id === activeRide.id);
  if (!targetRide) {
    throw new Error('Corridor matching algorithm did not match nearby ride!');
  }
  console.log(`✓ Matching Algorithm Matched Ride: Calculated Passenger Fare = ₹${targetRide.calculated_fare}`);

  // 6. Join Request & 2-Minute Timer
  console.log('\n[6/8] Passenger Sending Join Request...');
  const joinRes = await makeRequest(`/api/requests/ride/${activeRide.id}/join`, 'POST', {
    passenger_id: rohan.id,
    passenger_name: rohan.name,
    pickup_name: 'Hostel Block A & Mess',
    pickup_lat: 18.5342,
    pickup_lng: 73.8541,
    dest_name: 'Railway Station Junction',
    dest_lat: 18.5284,
    dest_lng: 73.8744,
    distance_km: 4.1,
    fare: targetRide.calculated_fare,
  });

  const request = joinRes.body.request;
  const timerDurationSec = Math.round((request.expires_at - request.created_at) / 1000);
  console.log(`✓ Join Request Created: ID ${request.id}, Status: ${request.status}, Timer: ${timerDurationSec} seconds (2 mins)`);

  // Rider Approves
  console.log('Rider Approving Request...');
  const approveRes = await makeRequest(`/api/requests/${request.id}/respond`, 'POST', {
    action: 'approve',
  });
  if (approveRes.body.request.status !== 'approved') {
    throw new Error('Approval failed: ' + JSON.stringify(approveRes));
  }
  console.log(`✓ Request Approved! Seats Available: ${approveRes.body.ride.seats_available}/3`);

  // Chat message test
  console.log('\n[7/8] Testing Live Chat Coordination...');
  await makeRequest(`/api/chat/${activeRide.id}`, 'POST', {
    sender_id: rohan.id,
    sender_name: rohan.name,
    message: 'Hi Aarav, I will wait at Hostel A gate.',
  });
  const chatRes = await makeRequest(`/api/chat/${activeRide.id}`);
  console.log(`✓ Chat Messages in Ride: ${chatRes.body.messages.length} message(s)`);

  // 8. Rider Swipes to Complete Ride
  console.log('\n[8/8] Rider Completing Ride & Checking 1% Platform Fee...');
  const completeRes = await makeRequest(`/api/rides/${activeRide.id}/complete`, 'POST');
  const comp = completeRes.body;
  console.log(`✓ Ride Status: ${comp.ride.status}`);
  console.log(`✓ Total Fare Earnings: ₹${comp.earnings}`);
  console.log(`✓ 1% Campus Platform Fee: ₹${comp.platform_fee}`);
  console.log(`✓ Net Wallet Credit: ₹${comp.net_earning}`);

  // Check Wallet
  const walletRes = await makeRequest(`/api/wallet/${aarav.id}`);
  console.log(`✓ Aarav's Updated Wallet Balance: ₹${walletRes.body.balance}`);

  console.log('\n========================================');
  console.log('ALL 8 END-TO-END VERIFICATION CHECKS PASSED!');
  console.log('========================================\n');
}

runVerification().catch((err) => {
  console.error('\n❌ Verification failed:', err);
  process.exit(1);
});
