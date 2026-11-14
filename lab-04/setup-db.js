const fs = require('fs');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

async function setupDatabase() {
  const dbPath = path.join(__dirname, 'bookstore.db');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const seedPath = path.join(__dirname, 'seed.sql');

  // Recreate database cleanly from schema.sql and seed.sql
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Removed existing bookstore.db for fresh initialization.');
  }

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await db.exec(schemaSql);
  console.log('Applied schema.sql successfully (created book and user tables).');

  const seedSql = fs.readFileSync(seedPath, 'utf8');
  await db.exec(seedSql);
  console.log('Applied seed.sql successfully (seeded 15 books).');

  // Verify book rows
  const books = await db.all('SELECT * FROM book;');
  console.log(`\nCurrent book records in bookstore.db (${books.length} rows):`);
  console.table(books);

  // Verify user table exists and is empty
  const users = await db.all('SELECT * FROM user;');
  console.log(`\nCurrent user records in bookstore.db (${users.length} rows - must be empty):`);
  console.table(users);

  await db.close();
  console.log('Database bookstore.db setup complete.');
}

setupDatabase().catch((err) => {
  console.error('Error setting up database:', err);
  process.exit(1);
});
