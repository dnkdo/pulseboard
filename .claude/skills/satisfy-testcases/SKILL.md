---
name: satisfy-testcases
description: Check the implementation against the .adlc/testcases.yaml test contract before finishing any coding task. Use for EVERY ADLC coding task in this repo — the CI testing phase gates hard on this file.
allowed-tools: Read, Bash(npm test*), Bash(npx *), Bash(pytest *), Bash(python -m pytest*)
---

# Satisfy the test-case contract

`.adlc/testcases.yaml` is a contract written **before** the code existed. The ADLC
testing pipeline (Phase 6) gates on it — a PR that ignores it will bounce back as
`needs_fix`.

1. Read `.adlc/testcases.yaml`. If the file does not exist, skip this skill silently
   and rely on the task's acceptance criteria instead.
2. Find the cases that match the current task (by skill_id, feature name, or
   acceptance criteria overlap). Ignore cases clearly owned by other tasks.
3. For each matching case, make sure a real test exists in the project's test suite
   that exercises it — same behavior, same edge cases. Extend existing test files
   rather than creating parallel ones.
4. Run the test suite (see the run-tests skill for the exact commands) and confirm
   those tests pass.

Hard rules:
- **Never edit `.adlc/testcases.yaml`** — it is the spec, not yours to change.
- Never weaken, skip, or delete an existing test to make the suite green.
- If a case genuinely cannot be satisfied by this task, state that explicitly in your
  final summary (and the PR body) instead of silently dropping it.
