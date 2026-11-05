# Lab 3: REST API, Query Parameters, Validation, and Debugging

**Name:** VARUKURI ARJUN · **Registration No:** 252U1R1268 · **Section:** CSE-2E (211)  
**Live link:** [PASTE DEPLOYED URL HERE, or explain why it couldn't be deployed and rely on the Postman screenshots]

---

## 1. Overview

Lab 3 extends Lab 2 by implementing:
- Advanced RESTful `GET /books` endpoint supporting **search**, **dynamic column sorting**, **case-insensitive order direction**, **pagination** (`limit` and `offset`), and **price range filtering** (`min_price` and `max_price`).
- Strict **whitelist verification** for sorting columns to prevent SQL injection.
- Reusable request body validation (`validateBook`) for `POST` and `PUT` operations.
- Uniform error responses adhering to `{ "message": "..." }` across all status codes (400, 404, 500).
- Debugging laboratory with documented solutions for four major backend error types (`EADDRINUSE`, `MODULE_NOT_FOUND`, `no such table`, and missing `await`).

---

## 2. How to Run

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
- `PORT=3000`
- `DB_PATH=./bookstore.db`

### Step 3: Initialize / Recreate Database
Recreate `bookstore.db` from `schema.sql` and `seed.sql` with 15 varied records:
- **Using Node script (works across Windows, macOS, Linux):**
  ```bash
  node setup-db.js
  ```
- **Using sqlite3 CLI (if installed):**
  ```bash
  sqlite3 bookstore.db < schema.sql
  sqlite3 bookstore.db < seed.sql
  ```

### Step 4: Run Application
- **Development mode (with auto-reload):**
  ```bash
  npm run dev
  ```
- **Production start:**
  ```bash
  npm start
  ```
- **Run automated test suite:**
  ```bash
  npm test
  ```

---

## 3. REST API Design & Endpoints

All endpoints use resource-oriented noun paths without verbs. HTTP methods signify the intended action.

| Method | Endpoint | Query Parameters | Description | Success Status | Error Statuses |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/books` | `search_q`, `order_by`, `order`, `limit`, `offset`, `min_price`, `max_price` | Retrieves books matching search, price range, sorting, and pagination | `200 OK` | `400 Bad Request`<br>`500 Internal Server Error` |
| `GET` | `/books/:bookId` | *(None)* | Retrieves a single book by ID | `200 OK` | `400 Bad Request`<br>`404 Not Found`<br>`500 Internal Server Error` |
| `POST` | `/books` | *(None)* | Inserts a new book record | `201 Created` | `400 Bad Request`<br>`500 Internal Server Error` |
| `PUT` | `/books/:bookId` | *(None)* | Updates an existing book record by ID | `200 OK` | `400 Bad Request`<br>`404 Not Found`<br>`500 Internal Server Error` |
| `DELETE` | `/books/:bookId` | *(None)* | Deletes a book record by ID | `200 OK` | `400 Bad Request`<br>`404 Not Found`<br>`500 Internal Server Error` |

---

## 4. Query Parameters for `GET /books`

All query parameters are optional and have well-defined default behaviors:

| Parameter | Type | Default | Validation & Rules |
| :--- | :--- | :--- | :--- |
| `search_q` | String | `""` | Partial title matching using `title LIKE ?` with parameter `%${search_q}%`. |
| `order_by` | String | `"id"` | Whitelisted columns: `id`, `title`, `author`, `price`, `pages`. Any other value returns `400 Bad Request`. |
| `order` | String | `"ASC"` | Sort direction: case-insensitive `ASC` or `DESC`. Any other value returns `400 Bad Request`. |
| `limit` | Integer | `10` | Must be an integer between `1` and `100`. Passed as a `?` parameter. Invalid values return `400 Bad Request`. |
| `offset` | Integer | `0` | Must be an integer `>= 0`. Passed as a `?` parameter. Invalid values return `400 Bad Request`. |
| `min_price` | Integer | *(Optional)* | Must be an integer `>= 0`. If given alone, filters `price >= ?`. |
| `max_price` | Integer | *(Optional)* | Must be an integer `>= 0`. If given alone, filters `price <= ?`. |
| `min_price` + `max_price` | Integers | *(Optional)* | If both given, filters `price BETWEEN ? AND ?`. If `min_price > max_price`, returns `400 Bad Request`. |

### Example Query Combinations:
- **Search for "Clean":** `GET /books?search_q=Clean`
- **Sort by price ascending:** `GET /books?order_by=price&order=ASC`
- **Filter books priced between 15 and 30:** `GET /books?min_price=15&max_price=30`
- **Paginate (page 2, 5 items per page):** `GET /books?limit=5&offset=5`
- **All combined:** `GET /books?search_q=The&min_price=10&max_price=25&order_by=price&order=DESC&limit=5&offset=0`

---

## 5. Consistent Response Format

Every response strictly adheres to a uniform JSON shape:

### Success Responses:
- **`GET /books`**: `200 OK` with JSON array of book objects: `[ { "id": 1, ... } ]`
- **`GET /books/:bookId`**: `200 OK` with single book object: `{ "id": 1, "title": "...", ... }`
- **`POST /books`**: `201 Created` with `{ "message": "Book added successfully", "bookId": 16 }`
- **`PUT /books/:bookId`**: `200 OK` with `{ "message": "Book updated successfully" }`
- **`DELETE /books/:bookId`**: `200 OK` with `{ "message": "Book deleted successfully" }`

### Error Responses:
Every error returns a JSON object with a single `message` property:
```json
{
  "message": "Descriptive error message"
}
```
- **`400 Bad Request`**: Validation failure (e.g. invalid query parameter, negative limit, non-integer price, missing title).
- **`404 Not Found`**: Resource does not exist (e.g. `Book not found` or catch-all `Route not found`).
- **`500 Internal Server Error`**: Unexpected server-side failure caught by error middleware (`Internal server error`), without leaking internal database structure or stack traces.

---

## 6. Reusable Validation Function (`validateBook`)

To ensure clean code and easy viva explanations, validation for `POST` and `PUT` bodies is encapsulated in a dedicated function:

```javascript
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
```

---

## 7. Database Structure & Seed Data

### Table Schema (`schema.sql`):
```sql
CREATE TABLE IF NOT EXISTS book (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  author TEXT,
  price INTEGER,
  pages INTEGER
);
```

### Seed Data (`seed.sql`):
15 diverse books spanning low-to-high prices (8 to 40) and varied page counts (180 to 680) to enable robust testing of searching, sorting, and pagination.

---

## 8. Debugging Practice Exercise

A dedicated debug practice suite is provided in [`debug-practice/`](debug-practice/):
- Contains a standalone copy of the application with four intentional bugs:
  1. `// BUG 1`: Port conflict (`EADDRINUSE`)
  2. `// BUG 2`: Wrong import/require path (`MODULE_NOT_FOUND`)
  3. `// BUG 3`: Table-name typo in SQL query (`no such table: books`)
  4. `// BUG 4`: Missing `await` on asynchronous query
- Complete diagnostic guide, error outputs, root cause analysis, and fixes are detailed in [`DEBUGGING.md`](DEBUGGING.md).

---

## 9. Screenshots

### 1. GET /books (Default First 10 Books)
![GET default books](screenshots/get-all.png)

### 2. GET /books?search_q=Clean (Search by Title)
![GET search title](screenshots/get-all-search.png)

### 3. GET /books?order_by=price&order=ASC&limit=5 (Sort by Price ASC)
![GET sort by price](screenshots/get-sort-price.png)

### 4. GET /books?min_price=12&max_price=20 (Price Range Filter)
![GET filter price](screenshots/get-filter-price.png)

### 5. GET /books?limit=5&offset=5 (Pagination: Page 2)
![GET pagination](screenshots/get-pagination.png)

### 6. GET /books/1 (Retrieve Single Book by ID)
![GET single book](screenshots/get-one.png)

### 7. GET /books/999 (Non-existent ID - 404 Not Found)
![GET book 404](screenshots/get-one-404.png)

### 8. POST /books (Create Book - 201 Created)
![POST success](screenshots/post-success.png)

### 9. POST /books (Validation Failure: Empty Title - 400 Bad Request)
![POST validation error](screenshots/post-validation-error.png)

### 10. PUT /books/15 (Update Book - 200 OK)
![PUT success](screenshots/put-success.png)

### 11. DELETE /books/15 (Delete Book - 200 OK)
![DELETE success](screenshots/delete-success.png)

### 12. Catch-All Route Not Found (404 Not Found)
![Route not found 404](screenshots/route-not-found-404.png)

### 13. Automated Test Suite (29 Passing Tests)
![Test suite passing](screenshots/test-suite.png)

### 14. SQLite Database State After CRUD Operations
![Database state after CRUD](screenshots/db-after.png)

---

## 10. Viva Preparation Notes

### 1. Why must sorting column names be whitelisted rather than parameterised with `?`?
In SQL prepared statements, `?` placeholders can only represent **data values** (literals like strings, numbers, or dates). Database query planners compile the query structure before values are bound. If you write `ORDER BY ?` and pass `'price'`, SQLite interprets this as ordering by the static literal string `'price'` for every row, which results in no sorting. Because SQL grammar does not allow parameterised identifiers (column names or table names), they must be inserted into the SQL string. To prevent SQL Injection, developers **must** strictly whitelist permitted column names against an array in code before interpolating.

### 2. How do `?` placeholders prevent SQL Injection?
When using `?` placeholders, the SQL statement template is parsed and compiled by the database engine prior to receiving user input. The user-provided parameters are sent across the driver boundary as pure data. Even if the user input contains SQL metacharacters like `' OR 1=1; DROP TABLE book; --`, the database treats the entire input strictly as a literal string value, rendering code injection impossible.

### 3. What is the difference between `OFFSET` and `LIMIT`?
- `LIMIT` specifies the maximum number of rows the database should return for that query.
- `OFFSET` specifies how many rows to skip from the beginning of the result set before returning rows.
Together they provide cursor/page-based pagination:
$$\text{OFFSET} = (\text{page} - 1) \times \text{LIMIT}$$

### 4. What happens when you omit `await` before an asynchronous database call?
In JavaScript, an `async` function returns a `Promise`. Calling `db.get(...)` without `await` immediately returns a pending `Promise` object rather than the actual query result. Because JavaScript objects are truthy, null checks like `if (!book)` fail to trigger. Express serializes the pending Promise to `{}` and sends an empty HTTP 200 response to the client.

### 5. Why should centralized error handling middleware be placed after all routes?
Express executes middleware sequentially in the order registered. By registering a 4-argument error-handling middleware (`(err, req, res, next)`) at the very bottom of the middleware chain, any error passed to `next(err)` from any route handler or middleware above will automatically skip remaining standard routes and jump directly into the error handler. This guarantees that unhandled exceptions are caught centrally and clients receive clean, uniform error messages without crashing the server.
