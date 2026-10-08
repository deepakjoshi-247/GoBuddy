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
  console.log('=== VERIFYING STRICT BACKEND FILTERING (100M DEST, 200M PICKUP, DUPES) ===\n');

  // Reset database
  await makeRequest('/api/reset', 'POST');

  // Rider Aarav creates a ride: Gate 1 (18.5308, 73.8553) -> Railway Station (18.5284, 73.8744)
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
  console.log(`✓ Ride Published: ${ride.pickup_name} -> ${ride.dest_name} on [${ride.date}] at [${ride.time}]`);

  // 1. DATE TEST:
  console.log('\n[1/5] Testing Strict Date Matching:');
  const tomorrowSearch = await makeRequest(
    `/api/rides?pickup_lat=18.5308&pickup_lng=73.8553&dest_lat=18.5284&dest_lng=73.8744&date=Tomorrow&time=09:00`
  );
  const tomorrowRides = Array.isArray(tomorrowSearch.body) ? tomorrowSearch.body : (tomorrowSearch.body.rides || []);
  if (tomorrowRides.length > 0) {
    throw new Error('FAIL: Passenger searched for Tomorrow, but Today ride was returned!');
  }
  console.log('✓ PASS: Passenger searching "Tomorrow" does NOT match ride for "Today" (0 rides returned).');

  const todaySearch = await makeRequest(
    `/api/rides?pickup_lat=18.5308&pickup_lng=73.8553&dest_lat=18.5284&dest_lng=73.8744&date=Today&time=09:00`
  );
  const todayRides = Array.isArray(todaySearch.body) ? todaySearch.body : (todaySearch.body.rides || []);
  if (todayRides.length === 0) {
    throw new Error('FAIL: Passenger searched for Today, but ride was not returned!');
  }
  console.log(`✓ PASS: Passenger searching "Today" correctly matches "Today" ride (${todayRides.length} ride returned).`);

  // 2. TIME WINDOW TEST (<= 30 minutes):
  console.log('\n[2/5] Testing Strict Time Window (<= 30 minutes from 09:00):');
  const t35Search = await makeRequest(
    `/api/rides?pickup_lat=18.5308&pickup_lng=73.8553&dest_lat=18.5284&dest_lng=73.8744&date=Today&time=09:35`
  );
  const t35Rides = Array.isArray(t35Search.body) ? t35Search.body : (t35Search.body.rides || []);
  if (t35Rides.length > 0) {
    throw new Error('FAIL: Time difference is 35 minutes (>30), but ride was returned!');
  }
  console.log('✓ PASS: Time difference 35 mins (>30) does NOT match (0 rides returned).');

  const t20Search = await makeRequest(
    `/api/rides?pickup_lat=18.5308&pickup_lng=73.8553&dest_lat=18.5284&dest_lng=73.8744&date=Today&time=08:45`
  );
  const t20Rides = Array.isArray(t20Search.body) ? t20Search.body : (t20Search.body.rides || []);
  if (t20Rides.length === 0) {
    throw new Error('FAIL: Time difference is 15 minutes (<=30), expected match!');
  }
  console.log(`✓ PASS: Time difference 15 mins (<=30) matches (${t20Rides.length} ride returned).`);

  // 3. REBUILT DESTINATION MATCHING (Text Match OR <= 150 meters):
  console.log('\n[3/6] Testing Rebuilt Destination Matching:');
  // Matching destination by exact text match
  const textDestSearch = await makeRequest(
    `/api/rides?pickup_name=College%20Main%20Gate%20(Gate%201)&dest_name=Railway%20Station%20Junction&date=Today&time=09:00`
  );
  const textDestRides = Array.isArray(textDestSearch.body) ? textDestSearch.body : (textDestSearch.body.rides || []);
  if (textDestRides.length === 0) {
    throw new Error('FAIL: Clean text destination match expected to match!');
  }
  console.log('✓ PASS: Clean text match guaranteed destination match (0m deviation).');

  // Destination <= 150m away via coordinates (e.g. ~120m away at 18.5295, 73.8744) -> MATCH
  const nearDestSearch = await makeRequest(
    `/api/rides?pickup_lat=18.5308&pickup_lng=73.8553&dest_lat=18.5295&dest_lng=73.8744&date=Today&time=09:00`
  );
  const nearDestRides = Array.isArray(nearDestSearch.body) ? nearDestSearch.body : (nearDestSearch.body.rides || []);
  if (nearDestRides.length === 0) {
    throw new Error('FAIL: Destination <= 150m expected to match!');
  }
  console.log('✓ PASS: Destination <= 150m matches (~120m deviation).');

  // Destination > 150m away (e.g. 2.5km away at 18.5362, 73.8940) -> REJECT
  const farDestSearch = await makeRequest(
    `/api/rides?pickup_lat=18.5308&pickup_lng=73.8553&dest_lat=18.5362&dest_lng=73.8940&date=Today&time=09:00`
  );
  const farDestRides = Array.isArray(farDestSearch.body) ? farDestSearch.body : (farDestSearch.body.rides || []);
  if (farDestRides.length > 0) {
    throw new Error('FAIL: Destination > 150m was returned in search results!');
  }
  console.log('✓ PASS: Destination > 150m rejected (0 rides returned).');

  // 4. REBUILT PICKUP MATCHING (Text Match OR <= 300 meters):
  console.log('\n[4/6] Testing Rebuilt Pickup Matching:');
  // Pickup <= 300m away via coordinates (~130m away at 18.5320, 73.8553) -> MATCH
  const nearPickupSearch = await makeRequest(
    `/api/rides?pickup_lat=18.5320&pickup_lng=73.8553&dest_lat=18.5284&dest_lng=73.8744&date=Today&time=09:00`
  );
  const nearPickupRides = Array.isArray(nearPickupSearch.body) ? nearPickupSearch.body : (nearPickupSearch.body.rides || []);
  if (nearPickupRides.length === 0) {
    throw new Error('FAIL: Pickup <= 300m expected to match!');
  }
  console.log('✓ PASS: Pickup <= 300m matches (~130m deviation).');

  // Pickup > 300m away (~400m away at 18.5342, 73.8541) -> REJECT
  const farPickupSearch = await makeRequest(
    `/api/rides?pickup_lat=18.5342&pickup_lng=73.8541&dest_lat=18.5284&dest_lng=73.8744&date=Today&time=09:00`
  );
  const farPickupRides = Array.isArray(farPickupSearch.body) ? farPickupSearch.body : (farPickupSearch.body.rides || []);
  if (farPickupRides.length > 0) {
    throw new Error('FAIL: Pickup > 300m (~400m) was returned in search results!');
  }
  console.log('✓ PASS: Pickup > 300m (~400m away) rejected (0 rides returned).');


  // 5. DUPLICATE BOOKING PREVENTION:
  console.log('\n[5/5] Testing Duplicate Booking Prevention:');
  // Request 1: Should succeed
  const req1 = await makeRequest(`/api/requests/ride/${ride.id}/join`, 'POST', {
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
  if (req1.status !== 200 && req1.status !== 201) {
    throw new Error(`FAIL: First join request failed with status ${req1.status}: ${JSON.stringify(req1.body)}`);
  }
  console.log(`✓ PASS: Initial join request created successfully (Status: ${req1.status}).`);

  // Request 2: Duplicate join request while 1 is active -> Should be rejected with 400
  const req2 = await makeRequest(`/api/requests/ride/${ride.id}/join`, 'POST', {
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
  if (req2.status !== 400) {
    throw new Error(`FAIL: Expected duplicate request to return 400, but got ${req2.status}`);
  }
  console.log(`✓ PASS: Duplicate join request correctly blocked (HTTP 400: ${req2.body.error}).`);

  console.log('\n================================================================');
  console.log('ALL STRICT FILTERING & DUPLICATE BOOKING TESTS PASSED! ✓');
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
