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

async function testFixes() {
  console.log('Testing Rider Date Selection & Relaxed Passenger Matching...');

  // 1. Reset
  await makeRequest('/api/reset', 'POST');

  // 2. Rider creates a ride for 'Today' at 14:00 (Bike)
  const riderRideRes = await makeRequest('/api/rides', 'POST', {
    rider_id: 'user_aarav',
    rider_name: 'Aarav Sharma',
    pickup_name: 'College Main Gate (Gate 1)',
    pickup_lat: 18.5308,
    pickup_lng: 73.8553,
    dest_name: 'Tech Park & Cafeteria',
    dest_lat: 18.5529,
    dest_lng: 73.8821,
    date: 'Today',
    time: '14:00',
    vehicle: 'Bike',
    route_distance_km: 5.5,
  });

  const createdRide = riderRideRes.body.ride;
  console.log(`✓ Ride created with dynamic date: "${createdRide.date}" at ${createdRide.time}`);
  if (createdRide.date !== 'Today') {
    throw new Error('Date was not saved properly!');
  }

  // 3. Passenger searches with 2 hour time difference (16:00 vs 14:00) and nearby location
  const searchMatchRes = await makeRequest(
    '/api/rides?pickup_lat=18.5342&pickup_lng=73.8541&dest_lat=18.5500&dest_lng=73.8800&time=16:00'
  );
  console.log(`✓ Relaxed search returned: ${searchMatchRes.body.rides.length} ride(s)`);
  if (searchMatchRes.body.rides.length === 0) {
    throw new Error('Expected relaxed corridor matching to return the active ride!');
  }

  // 4. Passenger calls browse_all=true
  const browseRes = await makeRequest('/api/rides?browse_all=true');
  console.log(`✓ Browse all returned: ${browseRes.body.rides.length} ride(s)`);
  if (browseRes.body.rides.length === 0) {
    throw new Error('Expected browse_all to return all active rides!');
  }

  console.log('✓ All targeted fixes verified successfully!');
}

testFixes().catch((e) => {
  console.error('Error testing fixes:', e);
  process.exit(1);
});
