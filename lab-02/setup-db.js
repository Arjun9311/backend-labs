const fs = require('fs');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

async function setupDatabase() {
  const dbPath = path.join(__dirname, 'bookstore.db');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const seedPath = path.join(__dirname, 'seed.sql');

  // If resetting, remove old database file if exists to ensure clean state
  if (process.argv.includes('--clean') && fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Removed existing bookstore.db for clean initialization.');
  }

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await db.exec(schemaSql);
  console.log('Applied schema.sql successfully.');

  // If table already has data and not cleaning, check if we need to seed
  const countRow = await db.get('SELECT COUNT(*) as count FROM book;');
  if (countRow.count === 0 || process.argv.includes('--force-seed')) {
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await db.exec(seedSql);
    console.log('Applied seed.sql successfully.');
  } else {
    console.log(`Database already contains ${countRow.count} rows. Skipping seed (use --force-seed to insert again).`);
  }

  // Display current rows in table
  const books = await db.all('SELECT * FROM book;');
  console.log('\nCurrent book records in bookstore.db:');
  console.table(books);

  await db.close();
}

setupDatabase().catch((err) => {
  console.error('Error setting up database:', err);
  process.exit(1);
});

