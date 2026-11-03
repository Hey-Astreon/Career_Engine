---
name: cloud-cicd-infrastructure
description: >-
  Complete cloud infrastructure, database, and CI/CD architecture for AstreWork: Oracle Cloud (OCI Ampere A1 ARM64
  4 OCPU / 24GB RAM, PUPPETEER_EXECUTABLE_PATH, shm_size 2gb), Caddy HTTP/3 QUIC SSL termination, Docker Compose
  isolation, Prisma 7 + Turso Cloud LibSQL (@prisma/adapter-libsql, serverExternalPackages, Vitest DB isolation in
  src/lib/db.ts), 3-hour GitHub Actions cron (.github/workflows/job-sync.yml), verify-turso.cjs secret auto-recovery,
  and Watchtower 60s continuous deployment.
---

# ☁️ Oracle Cloud ARM64, Prisma 7 + Turso LibSQL & GitHub Actions CI/CD Mastery

This unified skill governs AstreWork's production cloud infrastructure (`Caddyfile`, `docker-compose.prod.yml`, `Dockerfile`), database persistence layer (`prisma/schema.prisma`, `src/lib/db.ts`, `next.config.ts`), and automated CI/CD pipelines (`.github/workflows/job-sync.yml`, `scripts/verify-turso.cjs`).

---

## ☁️ PART 1: ORACLE CLOUD (OCI) AMPERE A1 ARM64 & CADDY REVERSE PROXY

### 1. OCI Ampere A1 ARM64 Hardware & Container Constraints
- **Instance:** 4 ARM64 OCPUs (Ampere Altra), 24 GB RAM, 200 GB NVMe Boot Volume, Ubuntu 24.04 LTS (`ap-mumbai-1`, IP `137.23.43.128`, domain `astrework.app`).
- **ARM64 Chromium Law (`PUPPETEER_EXECUTABLE_PATH`):** Never rely on default x64 Chromium downloads on ARM64 processors. Always point Puppeteer/Playwright to system Chromium via `process.env.PUPPETEER_EXECUTABLE_PATH` and allocate `shm_size: '2gb'` in Docker to prevent renderer crashes.
- **Next.js Standalone Webpack Law (`next.config.ts`):** Native LibSQL binaries (`@libsql/client` and `@prisma/adapter-libsql`) MUST be listed in `serverExternalPackages` in `next.config.ts` so Webpack/Turbopack never bundles them into broken server chunks.

### 2. VCN Security & Caddy HTTP/3 QUIC Reverse Proxy (`Caddyfile`)
- **Ingress Policy:** Only `80/TCP`, `443/TCP+UDP` (Caddy HTTP/3 QUIC + automated Let's Encrypt TLS), and restricted `22/TCP` (key-only SSH with `ufw` & `fail2ban`) are exposed publicly.
- **Internal Docker Bridge:** Next.js (`:3000`), Python FastAPI Agent (`:8000`), and Redis 7 Alpine (`:6379`, `--maxmemory 1024mb --maxmemory-policy allkeys-lru`) stay isolated on internal networks.

---

## 💾 PART 2: PRISMA 7 + TURSO CLOUD LIBSQL & VITEST ISOLATION (`src/lib/db.ts`)

### 1. Dual-Environment LibSQL Adapter Architecture
AstreWork uses **Prisma 7** with `@prisma/adapter-libsql` and `@libsql/client`:
- **Production / Cloud Sync:** Connects to Turso Cloud (`libsql://astrework-db-hey-astreon.aws-ap-south-1.turso.io`) using `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
- **Local Development & Vitest Test Isolation (`src/lib/db.ts`):**
  ```ts
  const isTestEnv = process.env.VITEST === "true" || process.env.NODE_ENV === "test";
  const rawTursoUrl = isTestEnv && process.env.TEST_USE_TURSO !== "true"
    ? undefined
    : process.env.TURSO_DATABASE_URL?.trim();
  ```
  - **Inviolable Law:** Automated tests (`npx vitest run`) must ALWAYS default to local SQLite (`file:./prisma/dev.db`) unless `TEST_USE_TURSO === "true"` is explicitly passed. This prevents test runs from mutating production Turso Cloud data or failing when offline.

### 2. Essential Prisma 7 Commands
- **Push Schema to Local SQLite:** `npx prisma db push --url file:./prisma/dev.db` *(Note: Prisma 7 `db push` does not accept `--skip-generate`)*.
- **Regenerate Prisma Client:** `npx prisma generate`
- **Sync Master Profiles to Turso Cloud:** `node scripts/sync-master-profiles.cjs`

---

## ⚙️ PART 3: GITHUB ACTIONS 3-HOUR CRON & WATCHTOWER CD (`.github/workflows/job-sync.yml`)

```
[GitHub Actions 3-Hour Cron (0 */3 * * *)]
         │
         ▼
[Step 1: node scripts/verify-turso.cjs] -> (Auto-heals inverted URL/JWT secrets & pings SELECT 1)
         │
         ▼
[Step 2: npx tsx scripts/run-discovery-cli.ts] -> (Harvests 13 providers into Turso Cloud within 10m cap)
```

### 1. Preflight Secret Inversion Auto-Recovery (`scripts/verify-turso.cjs`)
- Automatically inspects `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
- If a JWT (`eyJ...`) was accidentally pasted into `TURSO_DATABASE_URL` and the `libsql://` URL into `TURSO_AUTH_TOKEN`, `verify-turso.cjs` swaps them back in memory, normalizes `https://` to `libsql://`, verifies connectivity via `SELECT 1`, and exports the repaired variables to `$GITHUB_ENV`.

### 2. Watchtower Zero-Downtime Container Delivery
- Watchtower runs on the OCI VM (`--interval 60 --cleanup --include-stopped`), polling GHCR (`ghcr.io/hey-astreon/career_engine:latest`) every 60 seconds to perform graceful container swaps and prune dangling images automatically.

