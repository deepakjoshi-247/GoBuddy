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

async function runTests() {
  console.log('=== VERIFYING RIDER CANCELLATION & PASSENGER LIVE SYNC ===\n');

  // 1. Reset database
  await makeRequest('/api/reset', 'POST');
  console.log('✓ Database reset.');

  // 2. Rider creates a ride
  const createRes = await makeRequest('/api/rides', 'POST', {
    rider_id: 'user_aarav',
    rider_name: 'Aarav Sharma',
    pickup_name: 'College Main Gate (Gate 1)',
    pickup_lat: 18.5308,
    pickup_lng: 73.8553,
    dest_name: 'Railway Station Junction',
    dest_lat: 18.5284,
    dest_lng: 73.8744,
    date: 'Today',
    time: '09:00',
    vehicle: 'Rickshaw',
    route_distance_km: 4.2,
  });

  const ride = createRes.body.ride;
  console.log(`✓ [Step 1] Rider created ride ${ride.id} (status: ${ride.status}, seats: ${ride.seats_available})`);

  // 3. Passenger searches for ride
  const searchRes = await makeRequest(
    `/api/rides?pickup_lat=18.5308&pickup_lng=73.8553&dest_lat=18.5284&dest_lng=73.8744&date=Today&time=09:00`
  );
  const searchRidesList = Array.isArray(searchRes.body) ? searchRes.body : (searchRes.body.rides || []);
  if (searchRidesList.length === 0) {
    throw new Error('FAIL: Passenger could not find created ride in search!');
  }
  console.log(`✓ [Step 2] Passenger found active ride in search (${searchRidesList.length} matching ride)`);

  // 4. Passenger requests to join
  const joinRes = await makeRequest(`/api/requests/ride/${ride.id}/join`, 'POST', {
    passenger_id: 'user_rohan',
    passenger_name: 'Rohan Verma',
    pickup_name: 'College Main Gate (Gate 1)',
    pickup_lat: 18.5308,
    pickup_lng: 73.8553,
    dest_name: 'Railway Station Junction',
    dest_lat: 18.5284,
    dest_lng: 73.8744,
    distance_km: 4.2,
    fare: 40,
  });
  const request = joinRes.body.request;
  console.log(`✓ [Step 3] Passenger created join request ${request.id} (status: ${request.status})`);

  // 5. Rider approves request
  const approveRes = await makeRequest(`/api/requests/${request.id}/respond`, 'POST', {
    action: 'approve',
  });
  console.log(`✓ [Step 4] Rider approved request (status: ${approveRes.body.request.status}, seats left: ${approveRes.body.ride.seats_available})`);

  // 6. Check passenger active ride status before cancellation
  const passengerActiveBefore = await makeRequest(`/api/rides/user/user_rohan/active`);
  console.log(`✓ [Step 5] Passenger active ride check before cancel: role = ${passengerActiveBefore.body.role}, ride id = ${passengerActiveBefore.body.ride?.id}`);
  if (!passengerActiveBefore.body.ride) {
    throw new Error('FAIL: Passenger active ride not found before cancellation!');
  }

  // 7. Rider CANCELS ride
  console.log('\n--> Rider clicks "Cancel Ride"...');
  const cancelRes = await makeRequest(`/api/rides/${ride.id}/cancel`, 'POST');
  console.log(`✓ [Step 6] Rider cancelled ride response:`, cancelRes.body);

  // 8. Verify cancellation reflected on Ride record
  const rideAfter = await makeRequest(`/api/rides/${ride.id}`);
  if (rideAfter.body.ride.status !== 'cancelled') {
    throw new Error(`FAIL: Expected ride status to be 'cancelled', got '${rideAfter.body.ride.status}'`);
  }
  console.log(`✓ [Step 7] Ride record status is now: '${rideAfter.body.ride.status}'`);

  // 9. Verify cancellation reflected on Join Request record
  const reqAfter = await makeRequest(`/api/requests/${request.id}`);
  if (reqAfter.body.request.status !== 'cancelled') {
    throw new Error(`FAIL: Expected request status to be 'cancelled', got '${reqAfter.body.request.status}'`);
  }
  console.log(`✓ [Step 8] Join Request status is now: '${reqAfter.body.request.status}'`);

  // 10. Verify Passenger Search Results (poll at 1.5s): Ride must be removed immediately
  const searchAfter = await makeRequest(
    `/api/rides?pickup_lat=18.5308&pickup_lng=73.8553&dest_lat=18.5284&dest_lng=73.8744&date=Today&time=09:00`
  );
  const searchAfterRides = Array.isArray(searchAfter.body) ? searchAfter.body : (searchAfter.body.rides || []);
  if (searchAfterRides.length > 0) {
    throw new Error('FAIL: Cancelled ride is still returned in search results!');
  }
  console.log(`✓ [Step 9] Passenger search results after cancellation: ${searchAfterRides.length} rides returned (immediately removed from list!)`);

  // 11. Verify Passenger Active Ride Check: null ride returned -> triggers dashboard transition
  const passengerActiveAfter = await makeRequest(`/api/rides/user/user_rohan/active`);
  if (passengerActiveAfter.body.ride !== null) {
    throw new Error('FAIL: Passenger active ride should be null after cancellation!');
  }
  console.log(`✓ [Step 10] Passenger active ride is now null (triggers transition back to dashboard with alert)`);

  console.log('\n=============================================================');
  console.log('ALL RIDER CANCELLATION & PASSENGER LIVE SYNC TESTS PASSED! ✓');
  console.log('=============================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
