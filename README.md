# Backend Development Fundamentals - Labs

**Student Name:** VARUKURI ARJUN  
**Registration No:** 252U1R1268  
**Section:** CSE-2E (211)  

---

## Workspace Overview

This course-wide repository contains the backend laboratory projects:

| Directory | Lab Title | Core Topics | Status |
| :--- | :--- | :--- | :--- |
| [`lab-01/`](lab-01/README.md) | **Lab 1: Node.js and Express Server** | Express setup, HTTP methods, plain HTTP server, student details route | Complete |
| [`lab-02/`](lab-02/README.md) | **Lab 2: SQLite Database & CRUD Routes** | SQLite integration, parameterised queries, async/await, CRUD operations | Complete |
| [`lab-03/`](lab-03/README.md) | **Lab 3: REST API, Query Params & Debugging** | Search, sort whitelist, price filters, pagination, payload validation, debug exercise | Complete |

---

## How to Run Each Lab

### Lab 1: Node.js and Express server
```bash
cd lab-01
npm install
npm start
# Server listens at http://localhost:3000
```
Run tests:
```bash
npm test
```

---

### Lab 2: SQLite database and CRUD routes
```bash
cd lab-02
npm install
node setup-db.js
npm start
# Server listens at http://localhost:3000/books/
```
Run tests:
```bash
npm test
```

---

### Lab 3: REST API, query parameters, validation, and debugging
```bash
cd lab-03
npm install
node setup-db.js
npm start
# Server listens at http://localhost:3000/books
```
Run automated test suite (29 tests):
```bash
npm test
```

---

## Lab 3 Execution Screenshots

All Postman and terminal execution screenshots are located in [`lab-03/screenshots/`](lab-03/screenshots/):
- **`lab-03/screenshots/get-all.png`** (Default 10 books)
- **`lab-03/screenshots/get-all-search.png`** (Search by title: `?search_q=Clean`)
- **`lab-03/screenshots/get-sort-price.png`** (Sort by price: `?order_by=price&order=ASC`)
- **`lab-03/screenshots/get-filter-price.png`** (Price range filter: `?min_price=12&max_price=20`)
- **`lab-03/screenshots/get-pagination.png`** (Pagination: `?limit=5&offset=5`)
- **`lab-03/screenshots/get-one.png`** (Single record lookup)
- **`lab-03/screenshots/get-one-404.png`** (404 Not Found error format)
- **`lab-03/screenshots/post-success.png`** (201 Created with bookId)
- **`lab-03/screenshots/post-validation-error.png`** (400 Bad Request error format)
- **`lab-03/screenshots/put-success.png`** (200 OK update)
- **`lab-03/screenshots/delete-success.png`** (200 OK deletion)
- **`lab-03/screenshots/route-not-found-404.png`** (Catch-all 404 handler)
- **`lab-03/screenshots/test-suite.png`** (29 passing automated tests)
- **`lab-03/screenshots/db-after.png`** (SQLite database state after operations)

