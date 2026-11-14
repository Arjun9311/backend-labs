# Lab 4: Postman Test Specification

This document details all test cases defined in [`postman_collection.json`](postman_collection.json) to verify user registration, bcrypt password hashing, login authentication, and JWT token issuance.

---

## 📋 Test Matrix

| # | Request Name / Scenario | HTTP Method & Path | Request Payload | Expected Status | Expected Response Body |
|:---:|:---|:---|:---|:---:|:---|
| **1** | Register new user | `POST /register/` | `{"username": "arjun_dev", "name": "Varukuri Arjun", "password": "secret123"}` | `201 Created` | `{"message": "User created successfully"}` |
| **2** | Login with correct credentials | `POST /login/` | `{"username": "arjun_dev", "password": "secret123"}` | `200 OK` | `{"jwt_token": "<jwt_string>"}` |
| **3** | Register duplicate username | `POST /register/` | `{"username": "arjun_dev", "name": "Duplicate User", "password": "secret123"}` | `400 Bad Request` | `{"message": "User already exists"}` |
| **4** | Register with missing username | `POST /register/` | `{"name": "Varukuri Arjun", "password": "secret123"}` | `400 Bad Request` | `{"message": "Username is required and must be a non-empty string"}` |
| **5** | Register with missing name | `POST /register/` | `{"username": "newuser2", "password": "secret123"}` | `400 Bad Request` | `{"message": "Name is required and must be a non-empty string"}` |
| **6** | Register with missing password | `POST /register/` | `{"username": "newuser3", "name": "Varukuri Arjun"}` | `400 Bad Request` | `{"message": "Password is required and must be a string"}` |
| **7** | Register with password < 6 chars | `POST /register/` | `{"username": "newuser4", "name": "Varukuri Arjun", "password": "123"}` | `400 Bad Request` | `{"message": "Password must be at least 6 characters long"}` |
| **8** | Register with non-string username | `POST /register/` | `{"username": 12345, "name": "Varukuri Arjun", "password": "secret123"}` | `400 Bad Request` | `{"message": "Username is required and must be a non-empty string"}` |
| **9** | Login with unknown username | `POST /login/` | `{"username": "unknown_user", "password": "secret123"}` | `400 Bad Request` | `{"message": "Invalid username or password"}` |
| **10** | Login with wrong password | `POST /login/` | `{"username": "arjun_dev", "password": "incorrect_pass"}` | `400 Bad Request` | `{"message": "Invalid username or password"}` |
| **11** | Login with missing password | `POST /login/` | `{"username": "arjun_dev"}` | `400 Bad Request` | `{"message": "Password is required and must be a non-empty string"}` |
| **12** | Login with malformed JSON | `POST /login/` | `{"username": "arjun_dev", broken_json` | `400 Bad Request` | `{"message": "Invalid JSON in request body"}` |
| **13** | GET on `/login/` (Unsupported method) | `GET /login/` | *(None)* | `404 Not Found` | `{"message": "Route not found"}` |
| **14** | Unknown route | `GET /unknown-route` | *(None)* | `404 Not Found` | `{"message": "Route not found"}` |
| **15** | Existing books route (Lab 3) | `GET /books` | *(None)* | `200 OK` | `[{"id": 1, ...}]` *(10 books)* |

---

## 🛠️ Instructions for Postman

1. Open Postman and click **Import**.
2. Select [`postman_collection.json`](postman_collection.json).
3. Ensure the `baseUrl` collection variable is set to `http://localhost:3000`.
4. Start your local server:
   ```bash
   npm run dev
   ```
5. Execute requests in the "Success cases" folder first, followed by "Failure cases".
