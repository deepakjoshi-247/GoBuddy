import http from 'http';

function post(path: string, body: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(d));
          } catch (e) {
            reject(new Error(`Failed to parse: ${d}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('Testing User Registration Flow...');

  const ts = Date.now();
  // 1. Register a new passenger
  const passengerData = {
    name: `Test Passenger ${ts}`,
    email: `passenger_${ts}@coep.ac.in`,
    pid: `PID-PASS-${ts}`,
    phone: '9876543210',
    role: 'passenger',
  };

  const regPassRes = await post('/api/auth/register', passengerData);
  console.log('✓ Register passenger response:', regPassRes);
  if (!regPassRes.user || regPassRes.user.role !== 'passenger' || regPassRes.user.email !== passengerData.email) {
    throw new Error('Passenger registration failed or returned unexpected data');
  }

  // 2. Register a new rider with vehicle
  const riderData = {
    name: `Test Rider ${ts}`,
    email: `rider_${ts}@coep.ac.in`,
    pid: `PID-RIDER-${ts}`,
    phone: '9876501234',
    role: 'rider',
    vehicle: '2-Wheeler (Bike / Activa)',
  };

  const regRiderRes = await post('/api/auth/register', riderData);
  console.log('✓ Register rider response:', regRiderRes);
  if (!regRiderRes.user || regRiderRes.user.role !== 'rider' || regRiderRes.user.vehicle !== riderData.vehicle) {
    throw new Error('Rider registration failed or returned unexpected vehicle');
  }

  // 3. Login with newly registered rider
  const loginRes = await post('/api/auth/login', {
    name: riderData.name,
    pid: riderData.pid,
  });
  console.log('✓ Login with registered rider:', loginRes.user.name, 'role:', loginRes.user.role, 'vehicle:', loginRes.user.vehicle);
  if (loginRes.user.role !== 'rider') {
    throw new Error('Login with new rider returned invalid role');
  }

  console.log('✓ All registration flow tests passed successfully!');
}

run().catch((e) => {
  console.error('Registration test failed:', e);
  process.exit(1);
});
