# Bug: fix-webhook-route-test-leaked-charge-mock

- observed: five tests in web/src/app/api/stripe/webhook/route.test.ts fail on main since #181 (each reads the response one test behind) · expected: all green
- cause: `post()` queues `chargesRetrieve.mockResolvedValueOnce(...)` for every charge.refunded event; the foreign-account test is dropped by the route before the charge is read, so its queued answer leaks into the next test. `vi.clearAllMocks()` clears calls, not queued once-implementations.
- fix: web/src/app/api/stripe/webhook/route.test.ts: `chargesRetrieve.mockReset()` in `beforeEach`. Test-only, no production change.
- changelog: not user-visible
- learned: none
