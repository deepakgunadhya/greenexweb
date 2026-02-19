---
description: Run the complete QA pipeline — plan, generate, execute, heal
---

# Full QA Pipeline

Execute the complete autonomous QA cycle:

1.**Analyze**: Read the recent git diff or feature description
2.**Plan**: Create a test plan covering unit, integration, and E2E tests
3.**Generate**: Write all tests based on the plan
4.**Execute**: Run all tests
5.**Heal**: Fix any failing tests (up to 3 iterations)
6.**Report**: Summarize results with pass/fail counts and any app bugs found

## Final Output:

Produce a QA report with:
- Total tests: X passed, Y failed, Z skipped
- New tests added: [list]
- Application bugs found: [list with reproduction steps]
- Code coverage delta: before vs after
- Recommendation: READY TO MERGE / NEEDS FIXES