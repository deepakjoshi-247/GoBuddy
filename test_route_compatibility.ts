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
  console.log('=== STRICT ROUTE & DESTINATION VERIFICATION (A->B vs A->C) ===\n');

  // Reset database
  await makeRequest('/api/reset', 'POST');

  // 1. Rider creates Ride from College Main Gate (Gate 1) -> Railway Station Junction
  // Gate 1: (18.5308, 73.8553)
  // Railway Station: (18.5284, 73.8744)
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
  console.log(`✓ Active Ride Published: ${ride.pickup_name} -> ${ride.dest_name} (ID: ${ride.id})`);

  // 2. Case 1: Same Destination (Passenger Destination within 1.5 km of Rider Destination B)
  console.log('\n--- Case 1: Same Destination (within 1.5 km of B) ---');
  const case1Search = await makeRequest(
    `/api/rides?pickup_lat=18.5342&pickup_lng=73.8541&dest_lat=18.5284&dest_lng=73.8744&pickup_name=Hostel%20Block%20A&dest_name=Railway%20Station%20Junction`
  );
  if (case1Search.body.rides.length === 0 || !case1Search.body.rides[0].is_route_compatible) {
    throw new Error('Case 1 Failed: Expected destination match to be included as compatible!');
  }
  console.log(`✓ Case 1 MATCH PASS: Passenger drop-off at Railway Station matches Rider destination B (${case1Search.body.rides.length} ride returned).`);

  // 3. Case 2: Drop-off On The Way (Passenger Destination within 1.0 km of route polyline AND occurs before/at B)
  // Metro Station: (18.529, 73.862) is midway along the Gate 1 -> Station corridor
  console.log('\n--- Case 2: Drop-off On The Way (within 1.0 km of polyline, before/at B) ---');
  const case2Search = await makeRequest(
    `/api/rides?pickup_lat=18.5308&pickup_lng=73.8553&dest_lat=18.5290&dest_lng=73.8620&pickup_name=Gate%201&dest_name=Metro%20Station`
  );
  if (case2Search.body.rides.length === 0 || !case2Search.body.rides[0].is_route_compatible) {
    throw new Error('Case 2 Failed: Expected en-route drop-off to be included as compatible!');
  }
  console.log(`✓ Case 2 MATCH PASS: Passenger drop-off at Metro Station is en-route before B (${case2Search.body.rides.length} ride returned).`);

  // 4. Case 3: Off-Route Destination C (Different Direction: Gate 1 -> Tech Park & Cafeteria)
  // Tech Park: (18.5529, 73.8821) is off-route
  console.log('\n--- Case 3: Destination C is Off-Route (A to C instead of A to B) ---');
  const case3Search = await makeRequest(
    `/api/rides?pickup_lat=18.5308&pickup_lng=73.8553&dest_lat=18.5529&dest_lng=73.8821&pickup_name=Gate%201&dest_name=Tech%20Park`
  );
  console.log(`Strict search returned ${case3Search.body.rides.length} rides for off-route destination C.`);
  if (case3Search.body.rides.length > 0) {
    throw new Error('Case 3 Failed: Off-route destination must STRICT FAIL and return 0 rides!');
  }
  console.log('✓ Case 3 STRICT FAIL PASS: Off-route destination C correctly excluded from search results.');

  // Join attempt for Case 3 must be blocked with HTTP 400
  console.log('Verifying backend blocks join request for Destination C...');
  const case3Join = await makeRequest(`/api/requests/ride/${ride.id}/join`, 'POST', {
    passenger_id: 'user_rohan',
    passenger_name: 'Rohan Verma',
    pickup_name: 'College Main Gate (Gate 1)',
    pickup_lat: 18.5308,
    pickup_lng: 73.8553,
    dest_name: 'Tech Park & Cafeteria',
    dest_lat: 18.5529,
    dest_lng: 73.8821,
    distance_km: 5.5,
    fare: 50,
  });
  if (case3Join.status !== 400) {
    throw new Error(`Case 3 Failed: Expected HTTP 400 for off-route join, got ${case3Join.status}`);
  }
  console.log(`✓ Case 3 JOIN BLOCKED PASS: HTTP 400 returned: "${case3Join.body.error}"`);

  // 5. Case 4: Overshooting Destination C (Beyond Rider Destination B)
  console.log('\n--- Case 4: Destination C Beyond Rider Destination B (Overshoot) ---');
  const case4Search = await makeRequest(
    `/api/rides?pickup_lat=18.5308&pickup_lng=73.8553&dest_lat=18.5240&dest_lng=73.9200&pickup_name=Gate%201&dest_name=Far%20East`
  );
  if (case4Search.body.rides.length > 0) {
    throw new Error('Case 4 Failed: Overshoot destination must STRICT FAIL and return 0 rides!');
  }
  console.log('✓ Case 4 STRICT FAIL PASS: Overshoot destination beyond B excluded from search results.');

  const case4Join = await makeRequest(`/api/requests/ride/${ride.id}/join`, 'POST', {
    passenger_id: 'user_rohan',
    passenger_name: 'Rohan Verma',
    pickup_name: 'College Main Gate (Gate 1)',
    pickup_lat: 18.5308,
    pickup_lng: 73.8553,
    dest_name: 'Far East Suburb',
    dest_lat: 18.5240,
    dest_lng: 73.9200,
    distance_km: 8.0,
    fare: 70,
  });
  if (case4Join.status !== 400) {
    throw new Error(`Case 4 Failed: Expected HTTP 400 for overshooting join, got ${case4Join.status}`);
  }
  console.log(`✓ Case 4 JOIN BLOCKED PASS: HTTP 400 returned: "${case4Join.body.error}"`);

  console.log('\n======================================================');
  console.log('ALL STRICT ROUTE & DESTINATION VERIFICATIONS PASSED!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
