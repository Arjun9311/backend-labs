# Lab 3: Debugging Guide & Viva Reference

This document provides a systematic debugging guide and reference for the four most common backend bugs encountered in Node.js, Express, and SQLite applications.

---

## 1. Quick Diagnostic Table

| Bug | Error Message You See | Cause | How to Find It | Fix |
| :--- | :--- | :--- | :--- | :--- |
| **1. Port Conflict** | `Error: listen EADDRINUSE: address already in use :::3000`<br>or `Error: listen EADDRINUSE: address already in use 0.0.0.0:3000` | Another process (e.g. a previous Node server or background terminal) is already listening on the same port, or `app.listen(PORT)` was called multiple times in code. | Check the error stack trace pointing to `app.listen()`.<br>**Windows:** Run `netstat -ano \| findstr :3000` to find the PID.<br>**Linux/macOS:** Run `lsof -i :3000` or `fuser 3000/tcp`.<br>Search the file for duplicate `app.listen()` invocations. | Kill the process holding the port:<br>**Windows:** `taskkill /PID <PID> /F`<br>**Linux/macOS:** `kill -9 <PID>`<br>Or change the port in `.env` (e.g. `PORT=3001`), or remove duplicate `app.listen()` calls in `app.js`. |
| **2. Wrong Import / Require Path** | `Error: Cannot find module './sqlite3'`<br>`code: 'MODULE_NOT_FOUND'`<br>`Require stack: - .../app.js` | A relative path (`./sqlite3`) was used instead of an installed package name (`sqlite3`), causing Node to look for a local file instead of searching `node_modules/`; or a typo in the package or file name. | Read the `Require stack` printed in the console. The first line of the stack trace points directly to the exact file and line number containing the broken `require(...)`. Cross-check `package.json` under `dependencies`. | If requiring an npm package, remove `./` (e.g. `require('sqlite3')`). If requiring a local file, ensure the relative path from the current directory is accurate (e.g. `./routes/books.js`). If missing, run `npm install <package>`. |
| **3. Table Name Typo** | `SQLITE_ERROR: no such table: books`<br>Client receives HTTP `500` with `{"message": "Internal server error"}`. | The SQL query references a table name that does not exist in the database (e.g., `books` instead of `book`), often caused by pluralization mismatches with `schema.sql`. | Look at the server terminal logs output by the centralized error handler (`console.error(err.message)`). Check the table name in `schema.sql`. Inspect database tables using `node inspect-db.js "SELECT name FROM sqlite_master WHERE type='table';"` or `sqlite3 bookstore.db ".tables"`. | Update the SQL query string in `app.js` to match the exact table name defined in `schema.sql` (e.g. replace `FROM books` with `FROM book`). |
| **4. Missing `await`** | Client receives HTTP `200` with `{}` (empty JSON object), or `null`, or the handler fails silently.<br>No error thrown in console!<br>`console.log(book)` shows `Promise { <pending> }`. | Calling an asynchronous function (`db.get()`, `db.all()`, `db.run()`) without `await`. The variable holds a pending `Promise` instead of the resolved data. Because Promise objects are truthy, `if (!book)` fails to detect missing records, and `res.json(book)` serializes an unresolved Promise to `{}`. | Log the variable (`console.log('Result:', book)`). If you see `Promise { <pending> }`, you missed `await`. Review all database operations in your route handler to ensure every promise is awaited. | Add `await` before the asynchronous database call: `const book = await db.get(getBookQuery, [bookId]);`. Ensure the enclosing route handler function is declared `async`. |

---

## 2. Deep Dive: Reproducing & Fixing Each Bug

### Bug 1: Port Conflict (`EADDRINUSE`)

#### What happens:
When Node attempts to bind a TCP socket to an IP address and port that is already in use by another running socket listener, the operating system kernel rejects the bind request with `EADDRINUSE` (*Error: Address Already in Use*).

#### Reproduction:
1. Open a terminal and start the server: `node app.js` (listens on port 3000).
2. Open a second terminal and run `node app.js` again.
3. The second process crashes immediately with:
   ```text
   node:events:497
         throw er; // Unhandled 'error' event
         ^

   Error: listen EADDRINUSE: address already in use :::3000
       at Server.setupListenHandle [as _listen2] (node:net:1904:16)
       at listenInCluster (node:net:1961:12)
       at Server.listen (node:net:2063:7)
       ...
   Emitted 'error' event on Server instance at: ...
   ```

#### Diagnostic & Fix Workflow:
- **Windows:**
  ```powershell
  # Find PID using port 3000
  netstat -ano | findstr :3000

  # Example output: TCP 0.0.0.0:3000 0.0.0.0:0 LISTENING 14820
  # Kill the process using the PID found
  taskkill /PID 14820 /F
  ```
- **macOS / Linux:**
  ```bash
  # Find PID using port 3000
  lsof -i :3000
  # or: fuser 3000/tcp

  # Kill the process
  kill -9 <PID>
  ```
- Alternatively, assign a different port via `.env`:
  ```bash
  PORT=3001 node app.js
  ```

---

### Bug 2: Wrong Import / Require Path (`MODULE_NOT_FOUND`)

#### What happens:
Node.js module resolution distinguishes between core/npm packages and local file paths:
- `require('sqlite3')`: Node searches inside `node_modules/`.
- `require('./sqlite3')`: Node searches for a file named `sqlite3.js`, `sqlite3.json`, or a directory `./sqlite3/index.js` relative to the current file.

When you write `require('./sqlite3')` without having a local file called `sqlite3.js`, Node throws `MODULE_NOT_FOUND`.

#### Reproduction:
In `debug-practice/app.js`:
```javascript
const sqlite3 = require('./sqlite3');
```
Running `node app.js` produces:
```text
Error: Cannot find module './sqlite3'
Require stack:
- C:\...\lab-03\debug-practice\app.js
    at Module._resolveFilename (node:internal/modules/cjs/loader:1517:15)
    ...
```

#### Fix:
Change the import path to match the npm package name:
```javascript
const sqlite3 = require('sqlite3');
```

---

### Bug 3: Table-Name Typo (`no such table`)

#### What happens:
SQLite tables are strictly named according to `schema.sql`. In this lab, the table is named `book` (singular). If an endpoint executes:
```sql
SELECT * FROM books WHERE ...;
```
SQLite raises a syntax/runtime error: `SQLITE_ERROR: no such table: books`. Because our route handlers wrap database operations in `try/catch` and pass errors to Express middleware (`next(error)`), the error is caught, logged to console, and the client receives:
```json
{
  "message": "Internal server error"
}
```
with HTTP status `500`.

#### Reproduction:
In `GET /books`:
```javascript
const getBooksQuery = `SELECT * FROM books WHERE ...;`;
```
Making a request to `GET /books` causes SQLite to throw:
```text
Internal Server Error: SQLITE_ERROR: no such table: books
```

#### Diagnostic & Fix Workflow:
1. Check the console error output to read the exact SQLite error message.
2. Verify the table names in the database using:
   ```bash
   node inspect-db.js "SELECT name FROM sqlite_master WHERE type='table';"
   ```
3. Update `app.js` to reference the correct table name:
   ```javascript
   const getBooksQuery = `SELECT * FROM book WHERE ...;`;
   ```

---

### Bug 4: Missing `await`

#### What happens:
All database methods provided by `sqlite` (`db.get()`, `db.all()`, `db.run()`, `db.exec()`) return a JavaScript `Promise`.
If you omit `await`:
```javascript
const book = db.get(getBookQuery, [bookId]);
```
- `book` is immediately assigned a `Promise { <pending> }` object.
- It does **NOT** throw an error!
- In JavaScript, any object (including a pending Promise) is truthy (`Boolean(Promise) === true`). Therefore:
  ```javascript
  if (!book) { ... } // Never executes! The 404 check is bypassed.
  ```
- Express calls `res.status(200).json(book)`. `JSON.stringify(new Promise(...))` serializes to `{}` (an empty JSON object).
- The client receives status `200` with body `{}` instead of the book record!

#### Reproduction:
In `GET /books/:bookId`:
```javascript
const book = db.get(getBookQuery, [bookId]); // Missing await!
res.status(200).json(book);
```
Requesting `GET /books/1` returns:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{}
```

#### Diagnostic & Fix Workflow:
1. Add a debug log statement:
   ```javascript
   console.log('Book value:', book);
   ```
   Output in terminal:
   ```text
   Book value: Promise { <pending> }
   ```
2. Seeing `Promise { <pending> }` proves that the asynchronous operation was not awaited.
3. Prepend `await`:
   ```javascript
   const book = await db.get(getBookQuery, [bookId]);
   ```

---

## 3. Systematic 4-Step Debugging Methodology

When facing an unexpected issue in a backend application, follow this 4-step framework:

1. **Reproduce**:
   - What was the exact HTTP method, URL path, query string, or request body?
   - What status code and body did the server return?
   - Can you trigger the bug reliably using curl, Postman, or a test script?

2. **Isolate**:
   - Did the bug occur during server startup (syntax error, bad import, port conflict) or during request processing?
   - If during a request, which middleware or route handler handled it?

3. **Inspect**:
   - Read the stack trace from top to bottom.
   - Look for the first line referencing **your** project files (ignore `node:internal/...` or `node_modules/...`).
   - Use `console.log()` or VS Code breakpoints to inspect variables, types, and SQL strings before execution.

4. **Verify**:
   - Apply the minimal fix.
   - Re-run the reproduction request.
   - Run the automated test suite (`npm test`) to ensure no regressions were introduced.

---

## 4. Viva Preparation: Questions & Answers

### Q1: What does the HTTP error code `EADDRINUSE` mean and why does it occur?
> `EADDRINUSE` stands for *Error: Address Already In Use*. It is a POSIX socket error returned by the operating system kernel when a process calls `app.listen()` on a port (like 3000) that is already bound by another active process or thread. In Node development, this frequently occurs when a previous instance of the server is still running in another terminal or in the background.

### Q2: How does Node.js distinguish between `require('module')` and `require('./module')`?
> When a module specifier begins with `./`, `../`, or `/`, Node treats it as a **file path** relative to the current file. When a specifier does not begin with a path indicator (e.g. `express`, `sqlite3`), Node treats it as a **core module** or an **external package** installed in `node_modules/` (searching upwards through parent directories).

### Q3: Why does missing `await` not throw an error in Node.js?
> In JavaScript, asynchronous functions return a Promise object synchronously. Assigning an unawaited function call to a variable simply assigns the Promise object itself. Because assigning a Promise is completely valid JavaScript syntax, the runtime does not throw any error. The bug only manifests later when code expects the resolved data but instead manipulates the Promise object.

### Q4: Why can't SQL column names in `ORDER BY` be parameterised with `?` placeholders?
> Database engines treat `?` placeholders strictly as **literals** (strings, numbers, or nulls), not as SQL **identifiers** (such as table or column names). If you write `ORDER BY ?` and bind the string `'price'`, SQLite executes `ORDER BY 'price'`. Because the string constant `'price'` is identical for every row, SQLite does not sort the rows at all. To safely allow dynamic column ordering, developers must use **whitelist validation** in application code and interpolate only strictly verified column names into the query string.

### Q5: What is the purpose of a centralized error-handling middleware in Express?
> Centralized error-handling middleware (defined with 4 arguments: `(err, req, res, next)`) captures all unhandled errors passed from route handlers via `next(err)`. It ensures:
> 1. Clients always receive a structured, consistent JSON response (e.g., status 500 `{ "message": "Internal server error" }`).
> 2. Sensitive database credentials, stack traces, and filesystem paths are never leaked to the client.
> 3. Errors are logged centrally to the server console or monitoring service for debugging.
