---
name: run-tests
description: How to detect the project's test framework and run its test suite. Use whenever you need to run tests, check coverage, or verify a change works.
allowed-tools: Read, Bash(npm test*), Bash(npm run *), Bash(npx *), Bash(pytest *), Bash(python -m pytest*)
---

# Run tests in this repo

Detect the framework the same way the ADLC testing pipeline does, then use it:

1. **JavaScript/TypeScript** — `package.json` has a `scripts.test` entry:
   ```bash
   npm test                          # full suite (vitest or jest under the hood)
   npx vitest run path/to/x.test.js  # one file (vitest projects)
   npx jest path/to/x.test.js        # one file (jest projects)
   ```
2. **Python** — `pytest.ini`, `pyproject.toml [tool.pytest]`, or pytest in
   requirements:
   ```bash
   python -m pytest                  # full suite
   python -m pytest tests/test_x.py  # one file
   ```

Rules:
- Always finish with a **full** suite run — a targeted run passing is not enough.
- Never start watch mode (`vitest` / `npm run test:watch` without `run`) in
  automation; it does not exit.
- If the suite was failing **before** your change, note which failures are
  pre-existing rather than trying to fix unrelated tests.
- Coverage expectation for new code: ≥80% (checked in the ADLC testing phase).
