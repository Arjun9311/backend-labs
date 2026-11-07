# Backend Development Fundamentals — Labs

> **Student:** VARUKURI ARJUN · **Reg No:** 252U1R1268 · **Section:** CSE-2E (211)  
> **Course:** Backend Development Fundamentals · Year II Term II  
> **College:** Aurora Deemed-to-be-University · **Faculty:** Mr Yugandhar Gurjalwar  
> **Repository:** [https://github.com/Arjun9311/backend-labs](https://github.com/Arjun9311/backend-labs)

---

## 📋 Student Information

| Field | Details |
|:---|:---|
| **Name** | VARUKURI ARJUN |
| **Registration Number** | 252U1R1268 |
| **Section** | CSE-2E (211) |
| **Course** | Backend Development Fundamentals · Year II Term II |
| **Faculty** | Mr Yugandhar Gurjalwar |
| **College** | Aurora Deemed-to-be-University |
| **GitHub Repository** | [https://github.com/Arjun9311/backend-labs](https://github.com/Arjun9311/backend-labs) |

---

## 📚 Labs Directory

This repository contains the complete laboratory submissions for Backend Development Fundamentals:

| Lab | Directory | Description & Key Topics | Status | Test Suite |
|:---:|:---|:---|:---:|:---:|
| **Lab 1** | [`lab-01/`](lab-01/README.md) | **Node.js & Express Server**: HTTP servers, core routes, JSON responses, error handling, package manifest anatomy | `Completed` | Verified via curl & Postman |
| **Lab 2** | [`lab-02/`](lab-02/README.md) | **SQLite Database & CRUD**: Asynchronous SQLite integration, schema design, parameterized queries, full CRUD operations | `Completed` | Verified via automated test runner & Postman |
| **Lab 3** | [`lab-03/`](lab-03/README.md) | **REST API, Query Parameters & Debugging**: Title search, price range filtering, dynamic column whitelisting, limit/offset pagination, reusable validation, 4 deliberate backend bug diagnostics | `Completed` | **29 / 29 Tests Passing** |

---

## 🛠️ Technology Stack

| Technology | Category | Purpose |
|:---|:---|:---|
| **Node.js** (v18+ / v20 LTS) | Runtime | Asynchronous JavaScript runtime environment |
| **Express.js** (v4.x) | Web Framework | Routing, middleware, request handling, and RESTful APIs |
| **SQLite3 & sqlite** | Database Engine | Self-contained, relational SQL database and promise-based driver |
| **Postman** | API Tooling | Endpoint testing, parameter verification, and payload inspection |
| **Git & GitHub** | Version Control | Distributed code versioning and collaborative repository |
| **Render** | Deployment | Cloud hosting and web service deployment platform |

---

## 🚀 Quickstart Guide

### 1. Clone Repository
```bash
git clone https://github.com/Arjun9311/backend-labs.git
cd backend-labs
```

### 2. Run Lab 1 (Node.js & Express Basics)
```bash
cd lab-01
npm install
npm start
# Express server listening at http://localhost:3000/
# Optional plain HTTP server: npm run plain
```

### 3. Run Lab 2 (SQLite Database & CRUD Operations)
```bash
cd ../lab-02
npm install
node setup-db.js
npm start
# Express & SQLite server listening at http://localhost:3000/books/
```

### 4. Run Lab 3 (Advanced REST API, Query Params & Debugging)
```bash
cd ../lab-03
npm install
node setup-db.js
npm start
# REST API listening at http://localhost:3000/books
```
Run automated test suite:
```bash
npm test
# 29 tests passing
```

---

## 📸 Verification & Screenshots Preview

Detailed execution screenshots are available inside each lab directory:

- **Lab 1 Screenshots:** [`lab-01/screenshots/`](lab-01/screenshots/)
  - `home.png` — Welcome route (`GET /`)
  - `about.png` — Student details JSON (`GET /about`)
  - `time.png` — Dynamic date/time output (`GET /time`)
  - `404.png` — Catch-all route handler (`404 Not Found`)

- **Lab 2 Screenshots:** [`lab-02/screenshots/`](lab-02/screenshots/)
  - `get-all.png` — Retrieve all books from SQLite
  - `get-one.png` — Single record by ID
  - `get-one-404.png` — Missing ID handling
  - `post.png` — Create new book record
  - `put.png` — Update book record
  - `delete.png` — Delete book record
  - `db-after.png` — Direct SQLite CLI database inspection

- **Lab 3 Screenshots:** [`lab-03/screenshots/`](lab-03/screenshots/)
  - `get-all.png` — Default paginated list (10 records)
  - `get-all-search.png` — Title search (`?search_q=Clean`)
  - `get-sort-price.png` — Dynamic column sorting (`?order_by=price&order=ASC`)
  - `get-filter-price.png` — Price range bounds (`?min_price=12&max_price=20`)
  - `get-pagination.png` — Page 2 pagination (`?limit=5&offset=5`)
  - `get-one.png` — Retrieve single book by primary key
  - `get-one-404.png` — 404 response for non-existent ID
  - `post-success.png` — Create record (`201 Created`)
  - `post-validation-error.png` — Validation error (`400 Bad Request`)
  - `put-success.png` — Update record (`200 OK`)
  - `delete-success.png` — Delete record (`200 OK`)
  - `route-not-found-404.png` — Undefined endpoint catch-all (`404 Not Found`)
  - `test-suite.png` — 29 passing automated test cases
  - `db-after.png` — Formatted SQLite table state after operations

---

## 👤 Author

**VARUKURI ARJUN**  
Registration Number: **252U1R1268**  
Section: **CSE-2E (211)**  
Department of Computer Science and Engineering  
Aurora Deemed-to-be-University  
Faculty: **Mr Yugandhar Gurjalwar**
