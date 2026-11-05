# Debugging Practice Exercise

This folder contains a copy of the Lab 3 application with four deliberate bugs introduced to prepare you for faculty lab examinations and debugging challenges.

## The 4 Deliberate Bugs
1. **Bug 1:** Port conflict (`EADDRINUSE`)
2. **Bug 2:** Wrong import/require path (`MODULE_NOT_FOUND`)
3. **Bug 3:** Table-name typo in SQL query (`no such table`)
4. **Bug 4:** Missing `await` on asynchronous database call

In `app.js`, each bug is labelled with a simple comment:
- `// BUG 1`
- `// BUG 2`
- `// BUG 3`
- `// BUG 4`

*(No hints or answers are provided inside `app.js` comments)*

---

## How to Practice

1. Run the app directly using the parent project's `node_modules`:
   ```bash
   cd lab-03/debug-practice
   node app.js
   ```

2. Observe the terminal output, identify which bug caused the error or failure, and check `DEBUGGING.md` for detailed diagnosis and resolution guides.
3. Fix the bugs one by one until the server starts and all endpoints return accurate data.
