ci: fix e2e database wiring and skip the screenshot generator

Two problems made the e2e job unusable in CI:

1. The Playwright step ran without DATABASE_URL, so the dev server it boots
   could not initialise Prisma. It now passes file:./dev.db explicitly, and
   the setup step does too.

2. tests/e2e/screenshots.spec.ts is a local authoring tool - it overwrites
   the PNGs in docs/ and depends on live upstream trend sources. Excluded
   when CI is set.

Verified locally with the exact CI sequence: generate, db push, seed, then
Playwright 1/1 with CI=true.