test: make the api suite self-contained instead of silently skipping

The project+export suite drives the real Prisma client, so it needs a
DATABASE_URL. Without one the suite failed to initialise and its 3 tests
were reported as skipped rather than passing — a green run that proved
nothing.

Point the suite at a throwaway .test-data/api-test.db, push the schema for
that file, and import Prisma dynamically after the env var is set. The
suite now runs 3 real assertions and is safe in CI.

Also:
- Add GitHub Actions CI (typecheck, unit tests, build, Playwright E2E)
- Add README badges and fix the stale ARYX/trend2repo-duo clone URL
- Ignore .test-data/