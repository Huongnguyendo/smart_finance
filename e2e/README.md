# E2E Tests (Playwright)

## Prerequisites

- Backend running at `http://localhost:8080` (e.g. `mvn -pl api-gateway -am spring-boot:run`)
- Frontend at `http://localhost:8081` (e.g. `cd app && npm run web`)
- Playwright browsers: **run `npx playwright install`** (or `npx playwright install chromium`) before first run

## Run locally

```bash
# Terminal 1: start backend
mvn -pl api-gateway -am spring-boot:run

# Terminal 2: start frontend
cd app && npm run web

# Terminal 3: run E2E (install browsers first time only)
cd e2e && npm install && npx playwright install && npm test
```

### Screen smoke (`tests/screens.spec.ts`)

Covers **splash**, **onboarding**, **auth**, then after **sign-up**: **home**, **transactions**, **add**, **insights**, **budgets**, **profile**, **receipt-upload**, **chat**, **goals**, and **transaction detail**.

```bash
cd e2e && npx playwright test tests/screens.spec.ts
```

## Run in CI

Set `CI=true` and ensure backend is available. The E2E runner will build and serve the frontend automatically. If port 8081 is already in use, Playwright will reuse the existing server.

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| `Executable doesn't exist` / browser not found | Run `npx playwright install` in the `e2e` directory |
| `http://localhost:8081 is already used` | Config uses `reuseExistingServer: true`—if you see this, ensure you're on the latest config, or stop whatever is on 8081 |
| All tests fail quickly (connection/timeout) | Ensure backend (8080) and frontend (8081) are running before `npm test` |
| Auth/API errors | Backend must be up; check `curl http://localhost:8080/health` returns 200 |

## Environment

- `E2E_BASE_URL` - Frontend URL (default: http://localhost:8081)
- `E2E_API_URL` - Backend API URL (default: http://localhost:8080). Set `EXPO_PUBLIC_API_URL` in the app when building so the frontend knows where to call.
