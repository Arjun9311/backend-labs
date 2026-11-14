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
  return typeof value === 'string' && /^\d+$/.test(value) && Number(value) > 0;
}

// Reusable function to validate book payload for POST and PUT requests
// Returns an error message string if invalid, or null if valid.
function validateBook(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a valid JSON object';
  }

  const { title, author, price, pages } = body;

  if (typeof title !== 'string' || title.trim().length === 0) {
    return 'title is required and must be a non-empty string';
  }

  if (typeof author !== 'string' || author.trim().length === 0) {
    return 'author is required and must be a non-empty string';
  }

  if (typeof price !== 'number' || !Number.isInteger(price) || price < 0) {
    return 'price is required and must be an integer greater than or equal to 0';
  }

  if (typeof pages !== 'number' || !Number.isInteger(pages) || pages < 0) {
    return 'pages is required and must be an integer greater than or equal to 0';
  }

  return null;
}

// Root route: Redirect to /books for convenience and health checks
app.get('/', (req, res) => {
  res.redirect('/books');
});

// Route 1: GET /books - Retrieve books with search, sort, price filter, and pagination
app.get(['/books', '/books/'], async (req, res, next) => {
  try {
    const {
      search_q = '',
      order_by = 'id',
      order = 'ASC',
      limit: rawLimit,
      offset: rawOffset,
      min_price: rawMinPrice,
      max_price: rawMaxPrice
    } = req.query;

    // 1. Search Query: partial title match (default "")
    const searchParam = String(search_q);

    // 2. Sorting Column: order_by (default "id") - Whitelist validation
    const allowedColumns = ['id', 'title', 'author', 'price', 'pages'];
    const normalizedOrderBy = String(order_by).toLowerCase().trim();
    if (!allowedColumns.includes(normalizedOrderBy)) {
      return res.status(400).json({
        message: 'Invalid order_by column. Allowed columns are id, title, author, price, pages'
      });
    }

    // 3. Sorting Direction: order (default "ASC") - ASC or DESC (case-insensitive)
    const normalizedOrder = String(order).toUpperCase().trim();
    if (normalizedOrder !== 'ASC' && normalizedOrder !== 'DESC') {
      return res.status(400).json({
        message: 'Invalid order direction. Allowed values are ASC or DESC'
      });
    }

    // 4. Pagination: limit (default 10, integer between 1 and 100)
    let limit = 10;
    if (rawLimit !== undefined) {
      const limitStr = String(rawLimit).trim();
      if (!/^\d+$/.test(limitStr)) {
        return res.status(400).json({
          message: 'limit must be an integer between 1 and 100'
        });
      }
      limit = parseInt(limitStr, 10);
      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          message: 'limit must be an integer between 1 and 100'
        });
      }
    }

    // 5. Pagination: offset (default 0, integer >= 0)
    let offset = 0;
    if (rawOffset !== undefined) {
      const offsetStr = String(rawOffset).trim();
      if (!/^\d+$/.test(offsetStr)) {
        return res.status(400).json({
          message: 'offset must be an integer greater than or equal to 0'
        });
      }
      offset = parseInt(offsetStr, 10);
      if (offset < 0) {
        return res.status(400).json({
          message: 'offset must be an integer greater than or equal to 0'
        });
      }
    }

    // 6. Price Filtering: min_price and max_price (optional non-negative integers)
    let minPrice;
    if (rawMinPrice !== undefined) {
      const minPriceStr = String(rawMinPrice).trim();
      if (!/^\d+$/.test(minPriceStr)) {
        return res.status(400).json({
          message: 'min_price must be a non-negative integer'
        });
      }
      minPrice = parseInt(minPriceStr, 10);
    }

    let maxPrice;
    if (rawMaxPrice !== undefined) {
      const maxPriceStr = String(rawMaxPrice).trim();
      if (!/^\d+$/.test(maxPriceStr)) {
        return res.status(400).json({
          message: 'max_price must be a non-negative integer'
        });
      }
      maxPrice = parseInt(maxPriceStr, 10);
    }

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      return res.status(400).json({
        message: 'min_price must not exceed max_price'
      });
    }

    // Construct SQL WHERE clause using ? placeholders for all inputs
    const conditions = ['title LIKE ?'];
    const params = [`%${searchParam}%`];

    if (minPrice !== undefined && maxPrice !== undefined) {
      conditions.push('price BETWEEN ? AND ?');
      params.push(minPrice, maxPrice);
    } else if (minPrice !== undefined) {
      conditions.push('price >= ?');
      params.push(minPrice);
    } else if (maxPrice !== undefined) {
      conditions.push('price <= ?');
      params.push(maxPrice);
    }

    // Column names cannot be passed as ? placeholders; only whitelisted column & order are interpolated
    const getBooksQuery = `SELECT * FROM book WHERE ${conditions.join(' AND ')} ORDER BY ${normalizedOrderBy} ${normalizedOrder} LIMIT ? OFFSET ?;`;
    params.push(limit, offset);

    const books = await db.all(getBooksQuery, params);
    res.status(200).json(books);
  } catch (error) {
    next(error);
  }
});

// Route 2: GET /books/:bookId - Retrieve a single book by ID
app.get(['/books/:bookId', '/books/:bookId/'], async (req, res, next) => {
  try {
    const { bookId } = req.params;

    if (!isPositiveInteger(bookId)) {
      return res.status(400).json({ message: 'Book ID must be a positive integer' });
    }

    const getBookQuery = 'SELECT * FROM book WHERE id = ?;';
    const book = await db.get(getBookQuery, [bookId]);

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.status(200).json(book);
  } catch (error) {
    next(error);
  }
});

// Route 3: POST /books - Create a new book
app.post(['/books', '/books/'], async (req, res, next) => {
  try {
    const validationError = validateBook(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const { title, author, price, pages } = req.body;
    const insertBookQuery = 'INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?);';
    const result = await db.run(insertBookQuery, [title.trim(), author.trim(), price, pages]);

    res.status(201).json({
      message: 'Book added successfully',
      bookId: result.lastID
    });
  } catch (error) {
    next(error);
  }
});

// Route 4: PUT /books/:bookId - Update an existing book by ID
app.put(['/books/:bookId', '/books/:bookId/'], async (req, res, next) => {
  try {
    const { bookId } = req.params;

    if (!isPositiveInteger(bookId)) {
      return res.status(400).json({ message: 'Book ID must be a positive integer' });
    }

    const validationError = validateBook(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const checkBookQuery = 'SELECT * FROM book WHERE id = ?;';
    const existingBook = await db.get(checkBookQuery, [bookId]);

    if (!existingBook) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const { title, author, price, pages } = req.body;
    const updateBookQuery = 'UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?;';
    await db.run(updateBookQuery, [title.trim(), author.trim(), price, pages, bookId]);

    res.status(200).json({ message: 'Book updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Route 5: DELETE /books/:bookId - Delete a book by ID
app.delete(['/books/:bookId', '/books/:bookId/'], async (req, res, next) => {
  try {
    const { bookId } = req.params;

    if (!isPositiveInteger(bookId)) {
      return res.status(400).json({ message: 'Book ID must be a positive integer' });
    }

    const checkBookQuery = 'SELECT * FROM book WHERE id = ?;';
    const existingBook = await db.get(checkBookQuery, [bookId]);

    if (!existingBook) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const deleteBookQuery = 'DELETE FROM book WHERE id = ?;';
    await db.run(deleteBookQuery, [bookId]);

    res.status(200).json({ message: 'Book deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Catch-all 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error-handling middleware
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON in request body' });
  }
  console.error('Internal Server Error:', err.message);
  res.status(500).json({ message: 'Internal server error' });
});

// Initialize SQLite database and start the Express server
async function initializeDBAndServer(customPort, customDbPath) {
  try {
    const listenPort = customPort || process.env.PORT || PORT;
    const databaseFile = customDbPath || process.env.DB_PATH || DB_PATH;

    db = await open({
      filename: databaseFile,
      driver: sqlite3.Database
    });

    const server = app.listen(listenPort, '0.0.0.0', () => {
      console.log(`Server running at http://0.0.0.0:${listenPort}/`);
    });
    return server;
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
}

// Start server if run directly
if (require.main === module) {
  initializeDBAndServer();
}

module.exports = { app, initializeDBAndServer, validateBook };
