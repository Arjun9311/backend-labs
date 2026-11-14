// test-lab4.js - Automated verification suite for Lab 4
const http = require('http');
const path = require('path');
const fs = require('fs');
const { app, initializeDBAndServer, getDb } = require('./app');

const TEST_PORT = 3194;
const TEST_DB = path.join(__dirname, 'test-bookstore.db');

function request(method, pathName, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path: pathName,
        method: method,
        headers: headers
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch (e) {
            json = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json, rawBody: data });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  // Create a clean copy of bookstore.db for isolated test execution
  const originDb = path.join(__dirname, 'bookstore.db');
  fs.copyFileSync(originDb, TEST_DB);

  const server = await initializeDBAndServer(TEST_PORT, TEST_DB);
  console.log('\n--- Starting Lab 4 Verification Suite ---');

  const results = [];

  async function testCase(id, name, fn) {
    try {
      const res = await fn();
      results.push({ id, name, expected: res.expected, actual: res.actual, pass: res.pass, details: res.details });
    } catch (err) {
      results.push({ id, name, expected: 'Execution without error', actual: err.message, pass: false, details: err.stack });
    }
  }

  // 1. Success cases
  await testCase(1, 'Register new user (POST /register/)', async () => {
    const res = await request('POST', '/register/', { 'Content-Type': 'application/json' }, {
      username: 'arjun_dev',
      name: 'Varukuri Arjun',
      password: 'secret123'
    });
    const pass = res.status === 201 && res.body.message === 'User created successfully';
    return { expected: '201 Created', actual: `${res.status} ${JSON.stringify(res.body)}`, pass };
  });

  let savedToken = null;
  await testCase(2, 'Login with correct credentials (POST /login/)', async () => {
    const res = await request('POST', '/login/', { 'Content-Type': 'application/json' }, {
      username: 'arjun_dev',
      password: 'secret123'
    });
    const pass = res.status === 200 && typeof res.body.jwt_token === 'string' && res.body.jwt_token.length > 20;
    if (pass) savedToken = res.body.jwt_token;
    return { expected: '200 OK (with jwt_token)', actual: `${res.status} ${pass ? 'jwt_token received' : JSON.stringify(res.body)}`, pass };
  });

  // 2. Failure cases
  await testCase(3, 'Register duplicate username (POST /register/)', async () => {
    const res = await request('POST', '/register/', { 'Content-Type': 'application/json' }, {
      username: 'arjun_dev',
      name: 'Duplicate User',
      password: 'secret123'
    });
    const pass = res.status === 400 && res.body.message === 'User already exists';
    return { expected: '400 Bad Request', actual: `${res.status} ${JSON.stringify(res.body)}`, pass };
  });

  await testCase(4, 'Register with missing username (POST /register/)', async () => {
    const res = await request('POST', '/register/', { 'Content-Type': 'application/json' }, {
      name: 'Varukuri Arjun',
      password: 'secret123'
    });
    const pass = res.status === 400 && typeof res.body.message === 'string';
    return { expected: '400 Bad Request', actual: `${res.status} ${JSON.stringify(res.body)}`, pass };
  });

  await testCase(5, 'Register with missing name (POST /register/)', async () => {
    const res = await request('POST', '/register/', { 'Content-Type': 'application/json' }, {
      username: 'newuser2',
      password: 'secret123'
    });
    const pass = res.status === 400 && typeof res.body.message === 'string';
    return { expected: '400 Bad Request', actual: `${res.status} ${JSON.stringify(res.body)}`, pass };
  });

  await testCase(6, 'Register with missing password (POST /register/)', async () => {
    const res = await request('POST', '/register/', { 'Content-Type': 'application/json' }, {
      username: 'newuser3',
      name: 'Varukuri Arjun'
    });
    const pass = res.status === 400 && typeof res.body.message === 'string';
    return { expected: '400 Bad Request', actual: `${res.status} ${JSON.stringify(res.body)}`, pass };
  });

  await testCase(7, 'Register with password < 6 chars (POST /register/)', async () => {
    const res = await request('POST', '/register/', { 'Content-Type': 'application/json' }, {
      username: 'newuser4',
      name: 'Varukuri Arjun',
      password: '123'
    });
    const pass = res.status === 400 && res.body.message.includes('6 characters');
    return { expected: '400 Bad Request', actual: `${res.status} ${JSON.stringify(res.body)}`, pass };
  });

  await testCase(8, 'Register with non-string values (POST /register/)', async () => {
    const res = await request('POST', '/register/', { 'Content-Type': 'application/json' }, {
      username: 12345,
      name: 'Varukuri Arjun',
      password: 'secret123'
    });
    const pass = res.status === 400 && typeof res.body.message === 'string';
    return { expected: '400 Bad Request', actual: `${res.status} ${JSON.stringify(res.body)}`, pass };
  });

  await testCase(9, 'Login with unknown username (POST /login/)', async () => {
    const res = await request('POST', '/login/', { 'Content-Type': 'application/json' }, {
      username: 'unknown_user',
      password: 'secret123'
    });
    const pass = res.status === 400 && res.body.message === 'Invalid username or password';
    return { expected: '400 Bad Request', actual: `${res.status} ${JSON.stringify(res.body)}`, pass };
  });

  await testCase(10, 'Login with wrong password (POST /login/)', async () => {
    const res = await request('POST', '/login/', { 'Content-Type': 'application/json' }, {
      username: 'arjun_dev',
      password: 'incorrect_pass'
    });
    const pass = res.status === 400 && res.body.message === 'Invalid username or password';
    return { expected: '400 Bad Request', actual: `${res.status} ${JSON.stringify(res.body)}`, pass };
  });

  await testCase(11, 'Login with missing fields (POST /login/)', async () => {
    const res = await request('POST', '/login/', { 'Content-Type': 'application/json' }, {
      username: 'arjun_dev'
    });
    const pass = res.status === 400 && typeof res.body.message === 'string';
    return { expected: '400 Bad Request', actual: `${res.status} ${JSON.stringify(res.body)}`, pass };
  });

  await testCase(12, 'Login with malformed JSON (POST /login/)', async () => {
    const res = await request('POST', '/login/', { 'Content-Type': 'application/json' }, '{"username": "arjun", broken_json');
    const pass = res.status === 400 && res.body.message === 'Invalid JSON in request body';
    return { expected: '400 Bad Request', actual: `${res.status} ${JSON.stringify(res.body)}`, pass };
  });

  await testCase(13, 'GET on /login/ (Unsupported method)', async () => {
    const res = await request('GET', '/login/');
    const pass = res.status === 404 && res.body.message === 'Route not found';
    return { expected: '404 Not Found', actual: `${res.status} ${JSON.stringify(res.body)}`, pass };
  });

  await testCase(14, 'Unknown route (GET /unknown-route)', async () => {
    const res = await request('GET', '/unknown-route');
    const pass = res.status === 404 && res.body.message === 'Route not found';
    return { expected: '404 Not Found', actual: `${res.status} ${JSON.stringify(res.body)}`, pass };
  });

  await testCase(15, 'Existing Lab 3 books route (GET /books)', async () => {
    const res = await request('GET', '/books');
    const pass = res.status === 200 && Array.isArray(res.body) && res.body.length === 10;
    return { expected: '200 OK (10 books)', actual: `${res.status} (${Array.isArray(res.body) ? res.body.length : 0} books)`, pass };
  });

  // Print results
  console.log('\n| # | Request Scenario | Expected Status | Actual Status | Result |');
  console.log('|:---:|:---|:---|:---|:---:|');
  let passedCount = 0;
  for (const r of results) {
    const statusMark = r.pass ? 'PASS' : 'FAIL';
    if (r.pass) passedCount++;
    console.log(`| ${r.id} | ${r.name} | ${r.expected} | ${r.actual.slice(0, 35)} | **${statusMark}** |`);
  }

  console.log(`\n--- Test Results: ${passedCount} / ${results.length} passed ---\n`);

  server.close();
  const activeDb = getDb();
  if (activeDb) {
    try {
      await activeDb.close();
    } catch (e) {}
  }
  if (fs.existsSync(TEST_DB)) {
    try {
      fs.unlinkSync(TEST_DB);
    } catch (e) {}
  }

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
