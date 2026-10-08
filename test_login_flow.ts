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
        res.on('end', () => resolve(JSON.parse(d)));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function test() {
  console.log('Testing auth login flow...');
  const r1 = await post('/api/auth/login', { name: 'Aarav Sharma', pid: 'COEP-2024-R42' });
  console.log('✓ Rider login result:', r1.user.name, '-> Role:', r1.user.role);
  if (r1.user.role !== 'rider') throw new Error('Expected rider');

  const r2 = await post('/api/auth/login', { name: 'Rohan Verma', pid: 'COEP-2024-P19' });
  console.log('✓ Passenger login result:', r2.user.name, '-> Role:', r2.user.role);
  if (r2.user.role !== 'passenger') throw new Error('Expected passenger');

  console.log('✓ All login tests passed successfully!');
}

test().catch((e) => {
  console.error(e);
  process.exit(1);
});
