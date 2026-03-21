# SmartWallet AI

Modern personal finance platform with AI features (Java 21, Spring Boot 3.3+, Expo React Native).

## Java Version

- Use Java **21 (LTS)** for builds/tests.
- If your system default is newer, set `JAVA_HOME` to JDK 21 before running Maven.

## Modules

- `core`: domain entities (User, Transaction, Category)
- `auth`: JWT auth + security config
- `transactions`: CRUD + receipt upload + OCR
- `insights`: placeholder for behavioral insights
- `ml`: placeholder for categorization/forecasting
- `api-gateway`: Spring Boot app that wires everything

## Local Development

**Secrets:** Never commit real `.env` files.

- **Backend (Java):** Repo **root** — copy **`.env.example`** → **`.env`** (DB, JWT, AI keys, etc.). Used when you run `mvn … spring-boot:run`.
- **Frontend (Expo):** **`app/`** folder — copy **`app/.env.example`** → **`app/.env`** and set **`EXPO_PUBLIC_API_URL`** (e.g. `http://localhost:8080`). Expo only loads env from the **`app`** project directory, **not** the root `.env`.

1. Start dependencies:
   ```bash
   docker-compose up -d
   ```
   RabbitMQ Management UI: http://localhost:15672 (guest/guest)

   (Optional) For receipt OCR: `brew install tesseract` (macOS) or `apt install tesseract-ocr tesseract-ocr-eng` (Ubuntu)

2. Start the backend:
   ```bash
   mvn -pl api-gateway -am spring-boot:run
   ```

3. Start the frontend (Expo app):
   ```bash
   cd app
   cp .env.example .env   # optional: set EXPO_PUBLIC_API_URL in app/.env
   npm install
   npm run web
   ```

4. Open the app at `http://localhost:8081` (or the URL shown in the terminal).

5. Health check: `GET http://localhost:8080/health`

6. **API docs:** Swagger UI at `http://localhost:8080/swagger-ui.html`, OpenAPI JSON at `http://localhost:8080/v3/api-docs`

**Mobile:** Run `npm run start` in `app`, then scan the QR code with Expo Go.

**API URL:** In **`app/.env`**, set `EXPO_PUBLIC_API_URL=http://localhost:8080` (defaults to that if unset). **Restart** the dev server after editing.

**AI Insights (production):** Groq first, Hugging Face fallback.
- `GROQ_API_KEY` (free at [console.groq.com](https://console.groq.com))
- `HF_TOKEN` (free at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) — enable "Inference Providers")

**AI Insights (OpenAI):** Optionally set `OPENAI_API_KEY` for paid OpenAI.

**Local dev:** Ollama works as final fallback if running locally (`ollama run llama3.2`).

## Auth Endpoints

- `POST /auth/register` `{ "email": "...", "password": "...", "displayName": "..." }`
- `POST /auth/login` `{ "email": "...", "password": "..." }`

## Transactions

- `GET /api/transactions` (requires JWT; userId from token)
- `POST /api/transactions`
- `PUT /api/transactions/{id}`
- `DELETE /api/transactions/{id}`
- `POST /api/transactions/upload-receipt` (multipart file upload)

## Deployment (Render)

Deploy backend + frontend to [Render](https://render.com) (free tier):

1. **Push repo to GitHub**

2. **Render Dashboard** → New → Blueprint → Connect your repo

3. **Add environment variables** in Render (for both services):
   - `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` (Supabase Postgres)
   - `GROQ_API_KEY`, `HF_TOKEN` (AI insights)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (receipt storage)
   - For **smartwallet-web** only: `EXPO_PUBLIC_API_URL` = your backend URL (e.g. `https://smartwallet-api.onrender.com`)

4. **Deploy** – Render builds from `render.yaml`. Deploy backend first, then set `EXPO_PUBLIC_API_URL` on the frontend and redeploy.

5. **Production hardening:** Set `SPRING_PROFILES_ACTIVE=prod`, a strong `JWT_SECRET` (≥32 chars, not the default), and `CORS_ALLOWED_ORIGINS` to your real frontend URLs. See **[docs/PRODUCTION.md](docs/PRODUCTION.md)** for the full checklist (backups, observability, admin users, smoke tests).

### Admin (app)

- Users are `USER` by default. Set `role = 'ADMIN'` in the database for your admin email (e.g. Supabase SQL Editor).
- After promoting, **sign out and sign in** (or open **Admin** after a fresh load) so `/auth/me` returns `role` and the **Admin** link appears (sidebar on wide web, tab on mobile when applicable).
- `GET /api/admin/overview` returns aggregate user / transaction / budget counts (JWT + `ADMIN` only).

---

## Local Docker (alternative)

Build and run with Docker (includes Tesseract for receipt OCR):

```bash
docker build -t smartwallet-api .
docker run -p 8080:8080 \
  -e DB_URL=jdbc:postgresql://host.docker.internal:5432/smartwallet \
  -e DB_USERNAME=smartwallet \
  -e DB_PASSWORD=smartwallet \
  -e JWT_SECRET=your-secret \
  -e GROQ_API_KEY=your-groq-key \
  -e HF_TOKEN=your-hf-token \
  smartwallet-api
```

## Tests

Use **Java 21** for tests (see [Java Version](#java-version)). Run from the project root.

**Run all backend tests** (from the **repository root** so all modules build in order):
```bash
mvn clean test
```

**Unit tests** (auth, transactions, insights):
```bash
mvn test -pl auth,transactions,insights
```

**Integration tests** (requires Docker—Testcontainers spins up PostgreSQL; production uses your real DB, e.g. Supabase):
```bash
mvn test -pl api-gateway -Dtest=ApiGatewayIntegrationTest -Dsurefire.failIfNoSpecifiedTests=false
```

**HTML test report** (pass/fail per test, easy to read):
```bash
mvn clean test surefire-report:report-only
open target/site/surefire-report.html   # macOS; or open in a browser
```

**E2E tests** (requires backend + frontend running; install Playwright browsers first time):
```bash
# Terminal 1: mvn -pl api-gateway -am spring-boot:run
# Terminal 2: cd app && npm run web
cd e2e && npm install && npx playwright install && npm test
```

See `e2e/README.md` for E2E details and troubleshooting.

## Distributed Tracing (OpenTelemetry)

The backend uses Micrometer Tracing with OpenTelemetry for distributed tracing. Traces are exported via OTLP.

**To view traces locally**, run [Jaeger](https://www.jaeger.io/) with OTLP support:
```bash
docker run -d --name jaeger -p 4317:4317 -p 16686:16686 \
  jaegertracing/all-in-one:latest --collector.otlp.enabled=true
```
Then open http://localhost:16686 to search traces.

**Environment variables:**
- `OTEL_EXPORTER_OTLP_ENDPOINT` – OTLP endpoint (default: `http://localhost:4317/v1/traces`)
- `TRACING_ENABLED` – Set to `false` to disable (e.g. in CI)
- `TRACING_SAMPLING_PROBABILITY` – Sampling rate 0.0–1.0 (default: 1.0)

## Memory Profiling

The backend exposes memory metrics and heap dumps via Actuator (requires JWT):

- **`GET /actuator/metrics`** – JVM metrics including `jvm.memory.used`, `jvm.memory.max`, etc.
- **`GET /actuator/prometheus`** – Metrics in Prometheus format (for Grafana, etc.)
- **`GET /actuator/heapdump`** – Download a heap dump (HPROF) for analysis with Eclipse MAT or VisualVM

Example: `curl -H "Authorization: Bearer YOUR_JWT" http://localhost:8080/actuator/metrics/jvm.memory.used`

## Observability (Prometheus + Grafana)

Metrics are scraped by Prometheus and visualized in Grafana.

1. **Start the stack** (Postgres, RabbitMQ, Prometheus, Grafana):
   ```bash
   docker-compose up -d
   ```

2. **Start the backend** (metrics exposed at `http://localhost:8080/actuator/prometheus`):
   ```bash
   mvn -pl api-gateway -am spring-boot:run
   ```

3. **Open Grafana:** http://localhost:3000 (admin/admin)

4. **Pre-provisioned:**
   - Prometheus datasource (scrapes every 15s)
   - **SmartWallet Overview** dashboard: JVM heap, HTTP request rate, latency (p95), CPU

5. **Prometheus UI:** http://localhost:9090 for ad-hoc queries

**Note:** Prometheus scrapes `host.docker.internal:8080` so it can reach the backend running on your host. On Linux, you may need `--add-host=host.docker.internal:host-gateway` when running Docker.

## Notes

- Configure secrets using environment variables:
  - `JWT_SECRET`
  - `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
  - `GROQ_API_KEY` or `HF_TOKEN` (free, for AI insights)
  - `KAFKA_BOOTSTRAP`
