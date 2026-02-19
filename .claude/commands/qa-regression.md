---
description: Run regression tests on changed files
---

# Regression Test Runner
1. Run `git diff --name-only HEAD~1` to identify changed files
2. Find all related test files for changed code
3. Run those specific tests first (fast feedback)
4. If all pass, run the full E2E suite
5. Report results with timing information
6. If new code has no tests, generate them using /qa-generate