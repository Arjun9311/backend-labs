const fs = require('fs');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

async function setupDatabase() {
  const dbPath = path.join(__dirname, 'bookstore.db');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const seedPath = path.join(__dirname, 'seed.sql');

  // Clean existing database to ensure fresh 15-book seed data
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
  console.log('Applied schema.sql successfully.');

  const seedSql = fs.readFileSync(seedPath, 'utf8');
  await db.exec(seedSql);
  console.log('Applied seed.sql successfully.');

  // Display current rows in table
  const books = await db.all('SELECT * FROM book;');
  console.log(`\nCurrent book records in bookstore.db (${books.length} rows):`);
  console.table(books);

  await db.close();
  console.log('Database bookstore.db setup complete.');
}

setupDatabase().catch((err) => {
  console.error('Error setting up database:', err);
  process.exit(1);
});
