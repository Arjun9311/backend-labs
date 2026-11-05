const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const assert = require('assert');

async function testLab2() {
  console.log('--- Running Lab 2 Database Verification ---');
  const db = await open({
    filename: path.join(__dirname, 'bookstore.db'),
    driver: sqlite3.Database
  });

  const books = await db.all('SELECT * FROM book');
  assert(books.length >= 10, 'Expected at least 10 seeded books');
  console.log(`[PASS] Found ${books.length} books in bookstore.db`);

  const book1 = await db.get('SELECT * FROM book WHERE id = 1');
  assert(book1 && book1.title, 'Expected book with id 1');
  console.log(`[PASS] Retrieved record: ${book1.title} by ${book1.author}`);

  await db.close();
  console.log('--- All Lab 2 Checks Passed ---');
}

testLab2().catch((err) => {
  console.error('[FAIL] Lab 2 test error:', err.message);
  process.exit(1);
});

