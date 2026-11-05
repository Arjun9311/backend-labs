const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

async function inspect(query) {
  const dbPath = path.join(__dirname, 'bookstore.db');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  const sql = query || 'SELECT * FROM book;';
  const rows = await db.all(sql);
  console.log(`Query: ${sql}`);
  console.table(rows);
  await db.close();
}

const queryArg = process.argv.slice(2).join(' ');
inspect(queryArg).catch((err) => {
  console.error('Database query error:', err.message);
  process.exit(1);
});

