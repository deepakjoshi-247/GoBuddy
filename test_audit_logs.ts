import http from 'http';

function get(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

function post(path: string, body: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      `http://localhost:3000${path}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => (resData += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(resData));
          } catch {
            resolve(resData);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function testAuditLogs() {
  console.log('=== VERIFYING AUDIT LOGS ENDPOINT & LIFECYCLE EVENTS ===');
  
  // 1. Create a ride
  const createRes = await post('/api/rides', {
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
  const rideId = createRes.ride.id;
  console.log(`✓ Created ride ${rideId}`);

  // 2. Cancel the ride
  await post(`/api/rides/${rideId}/cancel`, {});
  console.log(`✓ Cancelled ride ${rideId}`);

  // 3. Verify CANCELLED in audit logs
  const cancelledLogs = await get('/api/logs?event=CANCELLED');
  console.log(`✓ Filtered CANCELLED: ${cancelledLogs.count} entries.`);
  const matchingCancel = cancelledLogs.logs.find((l: any) => l.ride_id === rideId);
  if (!matchingCancel) {
    throw new Error(`Expected CANCELLED log for ride ${rideId}`);
  }
  console.log(`✓ Found CANCELLED audit log for ${rideId}:`, matchingCancel.details);

  console.log('=== AUDIT LOGS VERIFICATION SUCCESSFUL ===');
}

testAuditLogs().catch((err) => {
  console.error('Audit logs test failed:', err);
  process.exit(1);
});
