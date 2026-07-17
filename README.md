# SmartWallet AI

Modern personal finance platform with a real Spring Boot backend, AI-powered financial insights, receipt upload/storage, and an Expo React Native web/mobile frontend.

## Current Architecture

```text
Render Web App
   ↓
Azure Container Apps API
   ↓              ↓              ↓
Supabase       Azure Blob       Groq AI
Postgres       Receipts         Insights
```

Local development still works with Docker Compose PostgreSQL, but the deployed project currently uses:

- **Frontend:** Expo React Native Web, deployed on Render
- **Backend:** Spring Boot API, containerized and deployed on Azure Container Apps
- **Database:** Supabase PostgreSQL
- **Receipt files:** Azure Blob Storage
- **AI:** Groq for AI insights, with Hugging Face/Ollama fallback support

## Java Version

- Use Java **21 (LTS)** for builds/tests.
- If your system default is newer, set `JAVA_HOME` to JDK 21 before running Maven.

## Modules

- `core`: domain entities (User, Transaction, Category)
- `auth`: JWT auth + security config
- `transactions`: CRUD + receipt upload + OCR
- `insights`: analytics, forecast, recurring detection, AI insight cards, AI chat
- `ml`: category suggestion support
- `api-gateway`: Spring Boot app that wires everything

## Key Features

- JWT authentication and user-scoped finance data
- Transaction CRUD, budgets, spending charts, and monthly dashboard
- Structured AI insight cards:
  - Spending Summary
  - Budget Warning
  - Unusual Activity
  - Next Step
- SmartWallet AI chat for questions about recent spending
- Forecast panel based on recent spending pace
- Recurring transaction detection
- Receipt upload with OCR and remote storage support
- Admin overview endpoint for aggregate app stats

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

## Deployment

The current deployment uses Render for the frontend, Azure Container Apps for the API,
Supabase PostgreSQL, and Azure Blob Storage for receipts.

### Frontend: Render

The Expo web app is deployed on Render as a static web service.

Set this frontend environment variable:

- `EXPO_PUBLIC_API_URL=https://smartfinance-api.wittyglacier-7789888f.eastus2.azurecontainerapps.io`

### Backend: Azure Container Apps

The Spring Boot backend is built from the root `Dockerfile`, stored in Azure Container
Registry, and deployed as the `smartfinance-api` Container App. The Render backend
definition remains available as a fallback.

Important backend environment variables/secrets:

- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` for Supabase PostgreSQL
- `JWT_SECRET`
- `GROQ_API_KEY` for AI insights
- `HF_TOKEN` as optional fallback
- `STORAGE_PROVIDER=azure`
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_CONTAINER=receipts`
- `AZURE_STORAGE_BLOB_PREFIX=receipts/`
- `CORS_ALLOWED_ORIGINS` = deployed frontend URL

For Supabase transaction pooler, use a JDBC URL like:

```text
jdbc:postgresql://aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require&prepareThreshold=0
```

The `prepareThreshold=0` part avoids PostgreSQL prepared-statement issues with transaction pooling.

### Database: Supabase PostgreSQL

Use Supabase for the hosted PostgreSQL database. The backend uses Spring Data JPA/Hibernate and updates schema with `ddl-auto=update` for this project.

### Receipts: Azure Blob Storage

Receipt images are stored in Azure Blob Storage when:

```text
STORAGE_PROVIDER=azure
```

The backend uploads with the Storage Account connection string and returns the blob URL. Configure the container for public blob reads if the app should display that URL directly.

### Production Hardening

Set `SPRING_PROFILES_ACTIVE=prod`, use a strong `JWT_SECRET`, lock down `CORS_ALLOWED_ORIGINS`, and review **[docs/PRODUCTION.md](docs/PRODUCTION.md)** for backups, observability, admin users, and smoke tests.

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

Run the screen smoke test only:
```bash
cd e2e
npx playwright test tests/screens.spec.ts --headed
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
  - `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER` for receipts
- Use `.env.example` as the template; do **not** commit real `.env` files.
