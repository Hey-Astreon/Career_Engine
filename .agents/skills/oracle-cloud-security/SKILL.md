---
name: oracle-cloud-security
description: >-
  Infrastructure architecture, OCI Ampere A1 ARM64 sizing, Caddy reverse proxy SSL/TLS automation,
  Docker bridge networking, and server hardening protocols for AstreWork (astrework.app / agent.astrework.app).
  Use whenever managing OCI virtual machines, configuring Caddyfile, hardening Linux firewalls, or optimizing memory.
---

# 🛡️ Oracle Cloud Infrastructure (OCI) Deployment & Security Mastery

This skill defines the production infrastructure sizing, automated reverse proxy SSL configuration, network security lists, container orchestration (`docker-compose.prod.yml`), and host hardening protocols for the AstreWork cloud environment.

---

## ☁️ 1. OCI Ampere A1 Compute Architecture

AstreWork runs on a dedicated Oracle Cloud Infrastructure (OCI) Always-Free Ampere A1 ARM64 instance located in the Mumbai region (`ap-mumbai-1`).

### Hardware & Virtual Machine Sizing
- **Processor:** 4 OCPUs (ARM64 Ampere Altra Architecture).
- **RAM:** 24 GB LPDDR4x Memory (allocated with zero swap overhead).
- **Storage:** 200 GB NVMe Boot Volume (high IOPS, auto-tuned read caches).
- **Operating System:** Ubuntu 24.04 LTS (Noble Numbat) 64-bit ARM.
- **Shared Memory:** `shm_size: '2gb'` allocated to browser automation containers to eliminate Chromium rendering crashes.

---

## 🌐 2. Virtual Cloud Network (VCN) & Ingress Rules

The instance is anchored within `career-engine-vcn` behind an OCI Internet Gateway with strict Security Lists.

### Port Exposure Policy
| Port / Protocol | Source CIDR | Destination | Purpose |
| :--- | :--- | :--- | :--- |
| `80 / TCP` | `0.0.0.0/0` | Caddy | HTTP validation & auto-redirect to HTTPS |
| `443 / TCP & UDP` | `0.0.0.0/0` | Caddy | HTTPS & HTTP/3 (QUIC) secure client traffic |
| `22 / TCP` | Admin IP / Restrict | OpenSSH | Key-pair only SSH (Password Auth disabled) |
| `3000 / TCP` | Internal Docker | Astrepilot | Next.js web application (NEVER exposed publicly) |
| `8000 / TCP` | Internal Docker | Agent | Python AI Gateway (Bound to localhost/Caddy) |
| `6379 / TCP` | `127.0.0.1` | Redis | Local queue & cache (Never bound to `0.0.0.0`) |

---

## 🔒 3. Automated Reverse Proxy & SSL (`Caddyfile`)

Caddy operates as the edge reverse proxy, managing automated Let's Encrypt certificates, HTTP/3 QUIC transport, and gzip/zstd compression.

### Production Caddyfile Configuration
```caddy
# Web Application & Public Gateway
astrework.app, www.astrework.app {
    reverse_proxy astrepilot:3000
    
    # Security Headers
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
    }
}

# Dedicated Python AI Agent Gateway
agent.astrework.app {
    reverse_proxy agent:8000
    
    # Internal auth validation & header sanitization
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
    }
}
```

---

## 🐳 4. Docker Isolation & Multi-Service Topology (`docker-compose.prod.yml`)

The microservices stack is strictly partitioned into internal Docker bridge networks.

### Service Matrix
1. **`astrepilot_web` (`ghcr.io/hey-astreon/career_engine:latest`):**
   - Next.js 15 SSR workspace.
   - Depends on Redis and Agent gateway.
   - Connected directly to Turso Cloud LibSQL via edge credentials.
2. **`astrework_agent` (`ghcr.io/hey-astreon/career_engine-agent:latest`):**
   - Python 3.11 fast agent runtime for heavy parsing and deep LLM orchestration.
   - Bounded to `127.0.0.1:8000` to prevent public ingress bypass.
3. **`astrework_redis` (`redis:7-alpine`):**
   - In-memory cache capped at `--maxmemory 1024mb` with `allkeys-lru` eviction policy.
   - Data volume persisted to `redis_data:/data`.

---

## 🛡️ 5. Host Hardening & Maintenance Checklist

To maintain 99.9% uptime and zero compromise:
1. **SSH Key Hardening:** In `/etc/ssh/sshd_config`, enforce:
   ```ini
   PasswordAuthentication no
   PermitRootLogin prohibit-password
   PubkeyAuthentication yes
   MaxAuthTries 3
   ```
2. **UFW Rules:** Enable `ufw` with default deny incoming, allow 22, 80, 443.
3. **Fail2ban:** Active jail on SSH port 22 with 5-strike 24-hour ban.
4. **Environment File Security:** Production `.env` file on OCI host must be restricted: `chmod 600 .env`.
5. **Periodic Memory Verification:** Monitor `free -m` to verify that 24GB RAM operates with at least 8GB buffer for Playwright scraper spikes.
