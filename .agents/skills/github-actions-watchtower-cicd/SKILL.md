---
name: github-actions-watchtower-cicd
description: >-
  CI/CD automation, GitHub Actions workflows (.github/workflows/job-sync.yml), preflight database verification
  (scripts/verify-turso.cjs), secret inversion auto-recovery, and Watchtower continuous container deployment on OCI.
  Use whenever modifying GitHub workflows, debugging scheduled cron tasks, rotating database secrets, or deploying containers.
---

# ⚙️ GitHub Actions CI/CD & Watchtower Deployment Mastery

This skill defines the autonomous pipeline engineering, database preflight verification, secret self-healing, and continuous container deployment powering AstreWork.

---

## 🔄 1. The 3-Hour Scraping Engine Cron (`.github/workflows/job-sync.yml`)

AstreWork discovers fresh remote engineering opportunities across 19 sources using a scheduled GitHub Actions runner that feeds into Turso Cloud.

### Workflow Architecture
- **Cron Schedule:** `0 */3 * * *` (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 UTC).
- **Manual Trigger:** `workflow_dispatch:` enabled for immediate manual verification.
- **Timeout Bound:** `timeout-minutes: 10` (prevents hung runners from consuming repository action minutes).
- **Runtime Environment:** `ubuntu-latest` with Node.js 22 and npm caching (`cache: 'npm'`).

---

## 🛡️ 2. Preflight Verification & Secret Inversion Auto-Recovery (`scripts/verify-turso.cjs`)

The most common operational failure in CI/CD pipelines occurs when developers inadvertently invert or misformat database credentials in repository secrets (e.g., pasting the JWT auth token into `TURSO_DATABASE_URL` and the database URL into `TURSO_AUTH_TOKEN`).

### Autonomous Secret Heuristics
Before running scrapers, `node scripts/verify-turso.cjs` analyzes secret payloads:
1. **JWT Detection:** If a value starts with `eyJ` or matches `/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/`, it is mathematically identified as an auth token, regardless of which secret variable contained it.
2. **URL / Hostname Detection:** If a value matches `libsql://`, `https://`, or `*.turso.io`, it is identified as the database URL.
3. **Protocol Normalization:** Coerces `https://[db].turso.io` to `libsql://[db].turso.io`.
4. **Active Connection Ping:** Executes `client.execute("SELECT 1")` via `@libsql/client`. If the ping fails, the step exits with code 1 before scraping begins.
5. **Dynamic `$GITHUB_ENV` Export:** Appends the correctly mapped, sanitized credentials directly to the GitHub Actions environment for downstream steps.

---

## 🐳 3. Watchtower Continuous Container Deployment

Production services run within Docker containers on our dedicated Oracle Cloud Infrastructure (OCI) VM, continuously updated via Watchtower.

```
[Developer Git Push]
         |
         v
[GitHub Actions Build & Push to GHCR / Docker Hub]
         |
         v (Tag: ghcr.io/astrework/career-engine:latest)
[Watchtower Daemon on OCI VM] (Polls every 60s)
         |
         v (New digest detected)
[Graceful Drain & Zero-Downtime Container Swap]
         |
         v
[Container Prune & Dangling Image Cleanup (--cleanup)]
```

### Production Watchtower Command
```bash
docker run -d \
  --name watchtower \
  --restart always \
  --volume /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --interval 60 \
  --cleanup \
  --include-stopped \
  career-engine-web career-engine-agent
```

### Safety Flags
- `--cleanup`: Automatically deletes stale, untagged images, preventing disk space exhaustion on root storage volumes.
- `--interval 60`: Checks for new image tags every 60 seconds without aggressive rate-limiting.

---

## 🔐 4. Secret Matrix & Environment Hygiene

| Secret Name | Expected Format | Purpose |
| :--- | :--- | :--- |
| `TURSO_DATABASE_URL` | `libsql://[name].turso.io` | Primary LibSQL cloud database endpoint |
| `TURSO_AUTH_TOKEN` | `eyJ...` (JWT Token) | Read/Write database authentication token |
| `NEXTAUTH_SECRET` | 32+ hex characters | NextAuth session cookie encryption |
| `GROQ_API_KEY` | `gsk_...` | Ultra-fast Llama-3 / GPT-OSS inference |
| `GEMINI_API_KEY` | `AIza...` | Google AI Studio 1M token context inference |
| `CEREBRAS_API_KEY` | `csk-...` | Cerebras cloud inference fallback |
| `NVIDIA_NIM_API_KEY`| `nvapi-...` | NVIDIA NIM Maverick Llama-4 inference |

---

## 🚨 5. CI/CD Failure Runbook

If `.github/workflows/job-sync.yml` fails:
1. **Check Preflight Step:** If `Sanitize & Verify Turso Cloud Secrets` failed, verify Turso Cloud token expiration (`turso db tokens create [dbname]`).
2. **Check Memory Exhaustion:** Look for `JavaScript heap out of memory` in scraper step. If found, ensure Playwright concurrency is throttled.
3. **Verify LibSQL Protocol:** Ensure URL starts with `libsql://` and not raw `http://`.
