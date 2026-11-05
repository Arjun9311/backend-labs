// Import required core and third-party modules
const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

// Create the Express application instance
const app = express();

// Middleware to parse incoming JSON request bodies
app.use(express.json());

// Configuration: Port and Database file path from environment variables or defaults
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'bookstore.db');

// Global database connection instance
let db = null;

// Helper function to validate positive integer IDs (1, 2, 3...)
function isPositiveInteger(value) {
  return /^\d+$/.test(value) && Number(value) > 0;
}

// Helper function to validate book request payload
function validateBookPayload(body) {
  const { title, author, price, pages } = body || {};

  const isTitleValid = typeof title === 'string' && title.trim().length > 0;
  const isAuthorValid = typeof author === 'string' && author.trim().length > 0;
  const isPriceValid = typeof price === 'number' && Number.isInteger(price) && price >= 0;
  const isPagesValid = typeof pages === 'number' && Number.isInteger(pages) && pages >= 0;

  return isTitleValid && isAuthorValid && isPriceValid && isPagesValid;
}

// Root route: Redirect to /books/ for browser convenience and cloud health checks
app.get('/', (req, res) => {
  res.redirect('/books/');
});

// Route 1: GET /books/ - Retrieve all books
app.get('/books/', async (req, res, next) => {
  try {
    const getBooksQuery = 'SELECT * FROM book;';
    const books = await db.all(getBooksQuery);
    res.status(200).json(books);
  } catch (error) {
    next(error);
  }
});

// Route 2: GET /books/:bookId/ - Retrieve a single book by ID
app.get('/books/:bookId/', async (req, res, next) => {
  try {
    const { bookId } = req.params;

    // Validate that bookId is a positive integer
    if (!isPositiveInteger(bookId)) {
      return res.status(400).json({ error: 'Book ID must be a positive integer' });
    }

    // Query book using ? placeholder to prevent SQL injection
    const getBookQuery = 'SELECT * FROM book WHERE id = ?;';
    const book = await db.get(getBookQuery, [bookId]);

    // If no book matches the ID, return 404
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.status(200).json(book);
  } catch (error) {
    next(error);
  }
});

// Route 3: POST /books/ - Create a new book
app.post('/books/', async (req, res, next) => {
  try {
    const { title, author, price, pages } = req.body;

    // Validate request body
    if (!validateBookPayload(req.body)) {
      return res.status(400).json({
        error: 'Invalid input: title and author must be non-empty strings; price and pages must be non-negative integers'
      });
    }

    // Insert new book using ? placeholders
    const insertBookQuery = 'INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?);';
    const result = await db.run(insertBookQuery, [title.trim(), author.trim(), price, pages]);

    // Respond with status 201 Created and newly generated bookId
    res.status(201).json({
      message: 'Book added successfully',
      bookId: result.lastID
    });
  } catch (error) {
    next(error);
  }
});

// Route 4: PUT /books/:bookId/ - Update an existing book by ID
app.put('/books/:bookId/', async (req, res, next) => {
  try {
    const { bookId } = req.params;

    // Validate that bookId is a positive integer
    if (!isPositiveInteger(bookId)) {
      return res.status(400).json({ error: 'Book ID must be a positive integer' });
    }

    // Validate request body
    if (!validateBookPayload(req.body)) {
      return res.status(400).json({
        error: 'Invalid input: title and author must be non-empty strings; price and pages must be non-negative integers'
      });
    }

    // Check if book exists before updating
    const checkBookQuery = 'SELECT * FROM book WHERE id = ?;';
    const existingBook = await db.get(checkBookQuery, [bookId]);

    if (!existingBook) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Update book using ? placeholders
    const { title, author, price, pages } = req.body;
    const updateBookQuery = 'UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?;';
    await db.run(updateBookQuery, [title.trim(), author.trim(), price, pages, bookId]);

    res.status(200).json({ message: 'Book updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Route 5: DELETE /books/:bookId/ - Delete a book by ID
app.delete('/books/:bookId/', async (req, res, next) => {
  try {
    const { bookId } = req.params;

    // Validate that bookId is a positive integer
    if (!isPositiveInteger(bookId)) {
      return res.status(400).json({ error: 'Book ID must be a positive integer' });
    }

    // Check if book exists before deleting
    const checkBookQuery = 'SELECT * FROM book WHERE id = ?;';
    const existingBook = await db.get(checkBookQuery, [bookId]);

    if (!existingBook) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Delete book using ? placeholder
    const deleteBookQuery = 'DELETE FROM book WHERE id = ?;';
    await db.run(deleteBookQuery, [bookId]);

    res.status(200).json({ message: 'Book deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Catch-all 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error-handling middleware returning 500 without leaking internal details
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  console.error('Internal Server Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize SQLite database and start the Express server
async function initializeDBAndServer() {
  try {
    // Open connection to SQLite database
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });

    // Start server listening on all network interfaces (0.0.0.0) for cloud compatibility
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running at http://0.0.0.0:${PORT}/`);
    });
  } catch (error) {
    // Log error and exit process on connection failure
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
}

// Call initialization function at the bottom
initializeDBAndServer();

module.exports = app;
