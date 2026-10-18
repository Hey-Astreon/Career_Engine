# Termius Pro Setup & Oracle Cloud VM Monitoring
===================================================
*Zero-Friction Server Management for Astrework & Antigravity Agent Core*

---

## 1. What is Termius Pro?
Termius Pro is an SSH client and terminal workspace included **100% free** in the [GitHub Student Developer Pack](https://education.github.com/pack).

### Key Features:
- **Encrypted Sync**: Syncs SSH hosts, keys, and terminal snippets across all devices (Windows, macOS, iPhone, iPad, Android).
- **1-Tap Mobile Terminal**: Monitor the Oracle Cloud VM directly from your phone on iOS or Android.
- **Built-in SFTP**: Graphical file browser to view, edit, download, and upload files on the VM without commands.
- **Snippet Vault**: Run common operational commands (`docker ps`, `docker logs`, container restarts) with a single tap.

---

## 2. Activation via GitHub Student Pack

1. Open the [GitHub Student Developer Pack](https://education.github.com/pack).
2. Scroll to **Termius** (or search "Termius").
3. Click **"Get benefit"**.
4. On the Termius website, choose **"Sign up with GitHub"** (or log in with your GitHub student account).
5. Your account is automatically upgraded to **Termius Pro** ($120/year value, $0 for students).
6. Download the app on your devices:
   - **Windows**: [termius.com/windows](https://termius.com/windows)
   - **iOS App Store**: Search *Termius - SSH client*
   - **Google Play Store**: Search *Termius - Terminal & SSH*

---

## 3. Host Configuration (1-Minute Setup)

In Termius, click **"New Host"** (or `+` icon on mobile) and enter the following settings:

| Setting | Value |
| :--- | :--- |
| **Label / Alias** | `Astrework Production (Oracle Cloud)` |
| **Hostname / IP** | `137.23.43.128` |
| **Port** | `22` |
| **Username** | `ubuntu` |
| **Key** | *Select "New Key" -> Import `C:\Users\Astreon\.ssh\oracle_key.key`* |

> [!TIP]
> Once you save this host in Termius, it will automatically sync to your phone and any other computer where you log into Termius. You can open a root-level terminal session with 1 tap anytime!

---

## 4. Pre-configured Snippets (1-Tap Commands)

In Termius, navigate to **Snippets** -> Click `+` to add these helpful shortcuts:

### 1. Check Container Health
- **Name**: `Container Status`
- **Command**:
  ```bash
  docker compose -f /home/ubuntu/app/docker-compose.prod.yml ps
  ```

### 2. View Antigravity Agent Logs
- **Name**: `Agent Live Logs`
- **Command**:
  ```bash
  docker logs -f --tail 100 astrework_agent
  ```

### 3. View Next.js Web App Logs
- **Name**: `Web App Logs`
- **Command**:
  ```bash
  docker logs -f --tail 100 astrepilot_web
  ```

### 4. View Caddy TLS & Proxy Logs
- **Name**: `Caddy SSL Logs`
- **Command**:
  ```bash
  docker logs -f --tail 100 astrework_caddy
  ```

### 5. Fast Container Restart
- **Name**: `Restart Agent Core`
- **Command**:
  ```bash
  docker restart astrework_agent
  ```

### 6. System Resource Monitor
- **Name**: `Server Resources`
- **Command**:
  ```bash
  free -h && df -h && uptime
  ```

---

## 5. Built-in SFTP File Manager

To browse files on the Oracle Cloud VM:
1. In Termius, click the **SFTP** tab in the sidebar.
2. Select `Astrework Production (Oracle Cloud)`.
3. You can now visually navigate:
   - `/home/ubuntu/app` (Application root)
   - `/home/ubuntu/app/caddy/Caddyfile` (Reverse proxy config)
   - `/home/ubuntu/app/python_agents` (Antigravity Python agent source)
4. You can edit files directly in Termius or upload/download logs and assets with drag-and-drop.
