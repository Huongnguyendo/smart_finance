# Production deployment checklist (SmartWallet)

Use this before pointing real users or sensitive data at the stack.

## 1. Secrets & configuration

| Variable | Notes |
|----------|--------|
| `JWT_SECRET` | **Required in production.** At least 32 random bytes/characters. Never commit or reuse dev values. |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Use your managed Postgres (e.g. Supabase) with TLS (`sslmode=require`). |
| `GROQ_API_KEY` / `HF_TOKEN` | AI features; optional if you disable insights. |
| `AZURE_STORAGE_*` | If `STORAGE_PROVIDER=azure`, set the connection string and container. |
| `RABBITMQ_*` or `RABBITMQ_URI` | Message broker for async work. |

- Keep secrets in the host’s secret store (Render env, AWS Secrets Manager, etc.), not in the repo.
- **Rotate** any secret that ever appeared in chat, logs, or a committed file.

## 2. Spring profile & startup guard

Set **`SPRING_PROFILES_ACTIVE=prod`** (or `spring.profiles.active=prod`) on the API service.

With the `prod` profile, the app **fails fast** if:

- `JWT_SECRET` is missing, shorter than 32 characters, or still contains the default `change-me` placeholder.

Render’s blueprint can use `generateValue: true` for `JWT_SECRET` (usually long enough). If startup still fails, set `JWT_SECRET` manually to a random string of at least 32 characters.

Local/dev can omit `prod` so the default dev secret still works.

## 3. CORS

Set **`CORS_ALLOWED_ORIGINS`** to a comma-separated list of **exact** frontend origins you use in production, e.g.:

```text
https://your-app.onrender.com,https://your-app.vercel.app
```

Wildcards are supported via Spring’s origin patterns (see `application.yml`). Do not use `*` with credentials.

## 4. Database & backups

- Enable **automated backups** on your Postgres provider (Supabase/ RDS / etc.).
- Document **restore** steps in your runbook.
- Receipt files in Azure Blob Storage: configure redundancy and periodic backup/export if required for compliance.

## 5. Observability

- **Health:** `GET /health` for load balancer checks.
- **Metrics:** `GET /actuator/prometheus` (unauthenticated by design for scrapers; protect at network edge if needed).
- **Tracing:** Optional OTLP endpoint via `OTEL_EXPORTER_OTLP_ENDPOINT`; disable in minimal setups with `TRACING_ENABLED=false`.
- **Grafana/Prometheus:** See root `README.md` for local stack; in cloud, point Prometheus at your API’s `/actuator/prometheus` over private network or IP allowlist.

## 6. Rate limiting

`RATE_LIMIT_ENABLED` defaults to `true`. Tune `RATE_LIMIT_CAPACITY` and `RATE_LIMIT_REFILL_MINUTES` under load. E2E/CI often sets `RATE_LIMIT_ENABLED=false`.

## 7. Admin users

- App users are **`USER`** by default. **`ADMIN`** unlocks `GET /api/admin/overview` and the **Admin** tab in the web app (sidebar / tab bar).
- Promote in SQL (use **your** DB, e.g. Supabase SQL editor):

  ```sql
  UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
  ```

- **Grafana** `admin` / `admin` is separate (metrics UI only).

## 8. API documentation

- Swagger UI: `/swagger-ui.html`
- OpenAPI JSON: `/v3/api-docs`

Consider restricting Swagger in production (reverse proxy auth or disable springdoc via profile) if you do not want the API surface public.

## 9. Smoke tests after deploy

1. `GET /health` → 200  
2. Register + login → JWT works  
3. `GET /api/transactions` with Bearer token → 200  
4. (Optional) Admin user → `GET /api/admin/overview` → 200  

### Tracing receipt-upload failures

1. In Azure Container Apps, open **smartfinance-api → Log stream** and search for
   `Receipt storage initialized`. It must show `provider=azure` and the expected
   Azure Storage host and container.
2. Reproduce the upload and copy the `Reference` from the API response, then search
   the Container App logs for that reference and the nearby `uploadId` entry.
3. A failed Azure response logs its HTTP status, Azure error code, `x-ms-request-id`,
   and an abbreviated service response. Use that request ID and UTC timestamp in
   Azure support or Storage diagnostics if the account rejects the request.
4. Never log or paste `AZURE_STORAGE_CONNECTION_STRING`. Rotate the Storage Account
   keys immediately if it is exposed. The application logs only the host and
   container, not the connection string.

## 10. Mobile / Expo web

- Set **`EXPO_PUBLIC_API_URL`** to the public HTTPS API URL.
- Ensure that origin is allowed in `CORS_ALLOWED_ORIGINS` if the web build calls the API from a browser.

---

This document complements `README.md` (local dev, tests, observability). Update both when deployment targets change.
