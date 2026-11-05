const http = require('http');
const path = require('path');
const fs = require('fs');
const { app, initializeDBAndServer } = require('./app');

// Run tests on an ephemeral/test port
const TEST_PORT = 3199;
process.env.PORT = TEST_PORT;
process.env.DB_PATH = path.join(__dirname, 'test_bookstore.db');

// Helper to make HTTP requests
function request({ method, path: reqPath, body, headers = {} }) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: reqPath,
      method,
      headers: {
        ...headers
      }
    };

    if (body !== undefined) {
      if (typeof body === 'string') {
        options.headers['Content-Length'] = Buffer.byteLength(body);
      } else {
        const jsonStr = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
        options.headers['Content-Length'] = Buffer.byteLength(jsonStr);
        body = jsonStr;
      }
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed, rawBody: data });
      });
    });

    req.on('error', reject);
    if (body !== undefined) {
      req.write(body);
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('--- Starting Lab 3 Comprehensive Test Suite ---\n');

  // Copy bookstore.db to test_bookstore.db for isolated testing
  const originalDb = path.join(__dirname, 'bookstore.db');
  fs.copyFileSync(originalDb, process.env.DB_PATH);

  const server = await initializeDBAndServer(TEST_PORT, process.env.DB_PATH);

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  try {
    // 1. GET /books default pagination and query
    await test('GET /books default returns first 10 books', async () => {
      const res = await request({ method: 'GET', path: '/books' });
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(Array.isArray(res.body), 'Expected array response');
      assert(res.body.length === 10, `Expected 10 books, got ${res.body.length}`);
      assert(res.body[0].id === 1, `Expected first book id 1, got ${res.body[0].id}`);
    });

    // 2. GET /books?search_q=Clean
    await test('GET /books?search_q=Clean filters by title', async () => {
      const res = await request({ method: 'GET', path: '/books?search_q=Clean' });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.length === 1, `Expected 1 book, got ${res.body.length}`);
      assert(res.body[0].title === 'Clean Code', `Expected Clean Code, got ${res.body[0].title}`);
    });

    // 3. GET /books?search_q=xyznotexisting returns empty array
    await test('GET /books with non-matching search_q returns []', async () => {
      const res = await request({ method: 'GET', path: '/books?search_q=xyznotexisting' });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.body) && res.body.length === 0, 'Expected empty array');
    });

    // 4. GET /books?order_by=price&order=ASC
    await test('GET /books?order_by=price&order=ASC sorts ascending', async () => {
      const res = await request({ method: 'GET', path: '/books?order_by=price&order=ASC&limit=15' });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      for (let i = 0; i < res.body.length - 1; i++) {
        assert(res.body[i].price <= res.body[i + 1].price, 'Expected prices in ascending order');
      }
    });

    // 5. GET /books?order_by=price&order=DESC
    await test('GET /books?order_by=price&order=DESC sorts descending', async () => {
      const res = await request({ method: 'GET', path: '/books?order_by=price&order=DESC&limit=15' });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      for (let i = 0; i < res.body.length - 1; i++) {
        assert(res.body[i].price >= res.body[i + 1].price, 'Expected prices in descending order');
      }
    });

    // 6. Whitelist check: GET /books?order_by=secret_column returns 400
    await test('GET /books?order_by=secret returns 400 with message', async () => {
      const res = await request({ method: 'GET', path: '/books?order_by=secret' });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(res.body.message && typeof res.body.message === 'string', 'Expected error message');
    });

    // 7. Order direction check: GET /books?order=SIDEWAYS returns 400
    await test('GET /books?order=SIDEWAYS returns 400 with message', async () => {
      const res = await request({ method: 'GET', path: '/books?order=SIDEWAYS' });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(res.body.message && typeof res.body.message === 'string', 'Expected error message');
    });

    // 8. Pagination: limit and offset
    await test('GET /books?limit=5&offset=5 pagination works', async () => {
      const res = await request({ method: 'GET', path: '/books?limit=5&offset=5' });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.length === 5, `Expected 5 books, got ${res.body.length}`);
      assert(res.body[0].id === 6, `Expected book id 6, got ${res.body[0].id}`);
    });

    // 9. Invalid limit / offset returns 400
    await test('GET /books invalid limit returns 400', async () => {
      const res = await request({ method: 'GET', path: '/books?limit=0' });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(res.body.message !== undefined, 'Expected message field');
    });

    await test('GET /books negative offset returns 400', async () => {
      const res = await request({ method: 'GET', path: '/books?offset=-3' });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(res.body.message !== undefined, 'Expected message field');
    });

    // 10. Price filters: min_price and max_price
    await test('GET /books?min_price=15&max_price=20 filters correctly', async () => {
      const res = await request({ method: 'GET', path: '/books?min_price=15&max_price=20&limit=15' });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      res.body.forEach((b) => {
        assert(b.price >= 15 && b.price <= 20, `Book price ${b.price} not in range [15, 20]`);
      });
    });

    await test('GET /books?min_price=30 filters price >= 30', async () => {
      const res = await request({ method: 'GET', path: '/books?min_price=30' });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      res.body.forEach((b) => {
        assert(b.price >= 30, `Book price ${b.price} not >= 30`);
      });
    });

    await test('GET /books?max_price=11 filters price <= 11', async () => {
      const res = await request({ method: 'GET', path: '/books?max_price=11' });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      res.body.forEach((b) => {
        assert(b.price <= 11, `Book price ${b.price} not <= 11`);
      });
    });

    await test('GET /books?min_price=25&max_price=20 returns 400', async () => {
      const res = await request({ method: 'GET', path: '/books?min_price=25&max_price=20' });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(res.body.message.includes('min_price must not exceed max_price'), 'Expected min_price error');
    });

    await test('GET /books?min_price=-5 returns 400', async () => {
      const res = await request({ method: 'GET', path: '/books?min_price=-5' });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    // 11. All filters combined
    await test('GET /books with combined search_q, price, sort, pagination', async () => {
      const res = await request({
        method: 'GET',
        path: '/books?search_q=The&min_price=10&max_price=25&order_by=price&order=DESC&limit=3&offset=1'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.body), 'Expected array');
      res.body.forEach((b) => {
        assert(b.title.includes('The'), `Book title ${b.title} must include 'The'`);
        assert(b.price >= 10 && b.price <= 25, `Book price ${b.price} not in range [10, 25]`);
      });
    });

    // 12. GET /books/:bookId
    await test('GET /books/1 returns book with id 1', async () => {
      const res = await request({ method: 'GET', path: '/books/1' });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.id === 1, `Expected id 1, got ${res.body.id}`);
      assert(res.body.title === 'Pride and Prejudice', `Expected Pride and Prejudice, got ${res.body.title}`);
    });

    await test('GET /books/999 returns 404 with message', async () => {
      const res = await request({ method: 'GET', path: '/books/999' });
      assert(res.status === 404, `Expected 404, got ${res.status}`);
      assert(res.body.message === 'Book not found', `Expected 'Book not found', got ${res.body.message}`);
    });

    await test('GET /books/abc returns 400 with message', async () => {
      const res = await request({ method: 'GET', path: '/books/abc' });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(res.body.message === 'Book ID must be a positive integer', `Got: ${res.body.message}`);
    });

    // 13. POST /books
    let createdBookId;
    await test('POST /books creates book and returns 201 with bookId', async () => {
      const payload = {
        title: 'Designing Data-Intensive Applications',
        author: 'Martin Kleppmann',
        price: 45,
        pages: 616
      };
      const res = await request({ method: 'POST', path: '/books', body: payload });
      assert(res.status === 201, `Expected 201, got ${res.status}`);
      assert(res.body.message === 'Book added successfully', `Got: ${res.body.message}`);
      assert(typeof res.body.bookId === 'number', 'Expected bookId number');
      createdBookId = res.body.bookId;
    });

    await test('POST /books with empty title returns 400 naming field', async () => {
      const payload = {
        title: '   ',
        author: 'Author',
        price: 20,
        pages: 100
      };
      const res = await request({ method: 'POST', path: '/books', body: payload });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(res.body.message.toLowerCase().includes('title'), `Message should name title: ${res.body.message}`);
    });

    await test('POST /books with string price returns 400 naming price', async () => {
      const payload = {
        title: 'Valid Title',
        author: 'Author',
        price: '20',
        pages: 100
      };
      const res = await request({ method: 'POST', path: '/books', body: payload });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(res.body.message.toLowerCase().includes('price'), `Message should name price: ${res.body.message}`);
    });

    await test('POST /books with negative pages returns 400 naming pages', async () => {
      const payload = {
        title: 'Valid Title',
        author: 'Author',
        price: 20,
        pages: -50
      };
      const res = await request({ method: 'POST', path: '/books', body: payload });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(res.body.message.toLowerCase().includes('pages'), `Message should name pages: ${res.body.message}`);
    });

    // 14. PUT /books/:bookId
    await test('PUT /books/:bookId updates book and returns 200', async () => {
      const updatePayload = {
        title: 'Designing Data-Intensive Applications (2nd Ed)',
        author: 'Martin Kleppmann',
        price: 50,
        pages: 650
      };
      const res = await request({ method: 'PUT', path: `/books/${createdBookId}`, body: updatePayload });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.message === 'Book updated successfully', `Got: ${res.body.message}`);

      // Verify update in GET
      const getRes = await request({ method: 'GET', path: `/books/${createdBookId}` });
      assert(getRes.body.title === 'Designing Data-Intensive Applications (2nd Ed)', 'Title not updated');
      assert(getRes.body.price === 50, 'Price not updated');
    });

    await test('PUT /books/9999 returns 404 with message', async () => {
      const updatePayload = {
        title: 'Valid',
        author: 'Author',
        price: 10,
        pages: 100
      };
      const res = await request({ method: 'PUT', path: '/books/9999', body: updatePayload });
      assert(res.status === 404, `Expected 404, got ${res.status}`);
      assert(res.body.message === 'Book not found', `Got: ${res.body.message}`);
    });

    // 15. DELETE /books/:bookId
    await test('DELETE /books/:bookId deletes book and returns 200', async () => {
      const res = await request({ method: 'DELETE', path: `/books/${createdBookId}` });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.message === 'Book deleted successfully', `Got: ${res.body.message}`);

      // Verify book is gone
      const checkRes = await request({ method: 'GET', path: `/books/${createdBookId}` });
      assert(checkRes.status === 404, `Expected 404 after delete, got ${checkRes.status}`);
    });

    await test('DELETE /books/9999 returns 404 with message', async () => {
      const res = await request({ method: 'DELETE', path: '/books/9999' });
      assert(res.status === 404, `Expected 404, got ${res.status}`);
      assert(res.body.message === 'Book not found', `Got: ${res.body.message}`);
    });

    // 16. Catch-all 404
    await test('Catch-all 404 returns { message: "Route not found" }', async () => {
      const res = await request({ method: 'GET', path: '/not-a-real-endpoint' });
      assert(res.status === 404, `Expected 404, got ${res.status}`);
      assert(res.body.message === 'Route not found', `Got: ${res.body.message}`);
    });

    // 17. Malformed JSON handling
    await test('Malformed JSON returns 400 { message: "Invalid JSON in request body" }', async () => {
      const res = await request({
        method: 'POST',
        path: '/books',
        body: '{ "title": "Broken JSON',
        headers: { 'Content-Type': 'application/json' }
      });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(res.body.message === 'Invalid JSON in request body', `Got: ${res.body.message}`);
    });

  } finally {
    server.close();
    if (fs.existsSync(process.env.DB_PATH)) {
      try {
        fs.unlinkSync(process.env.DB_PATH);
      } catch (e) {}
    }
  }

  console.log(`\n--- Test Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
