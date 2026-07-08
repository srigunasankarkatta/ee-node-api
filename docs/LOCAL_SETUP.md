# Local Development Setup Guide

> **OS:** Windows 11  
> **MySQL:** 8.4.9 (installed via winget)  
> **Node:** v22.x / v24.x  
> **Project:** equity-eyes — `C:\Users\ASUS\Desktop\node\equity-eyes`

---

## 1. One-Time Setup (already done — reference only)

### 1a. Install MySQL via winget

```powershell
winget install Oracle.MySQL --accept-package-agreements --accept-source-agreements
```

Installs to: `C:\Program Files\MySQL\MySQL Server 8.4\bin\`

### 1b. Initialize the data directory

Open **any terminal** (no admin needed):

```bash
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --initialize-insecure --datadir="C:\ProgramData\MySQL\MySQL Server 8.4\Data"
```

- `--initialize-insecure` sets root password to **empty** (safe for local dev only)
- Only needs to be run **once** — skip this if the data directory already exists

### 1c. Create the local database and user

Start MySQL first (see Section 2), then run:

```bash
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -e "
CREATE DATABASE IF NOT EXISTS app_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'app_user'@'localhost' IDENTIFIED BY 'localpass123';
GRANT ALL PRIVILEGES ON app_db.* TO 'app_user'@'localhost';
ALTER USER 'root'@'localhost' IDENTIFIED BY 'rootpass123';
FLUSH PRIVILEGES;
"
```

**Local credentials:**

| Field | Value |
|-------|-------|
| Host | `localhost` |
| Port | `3306` |
| Database | `app_db` |
| User | `app_user` |
| Password | `localpass123` |
| Root password | `rootpass123` |

---

## 2. Starting MySQL (every session)

MySQL is **not installed as a Windows service** (requires admin rights). Start it manually each time you work on the project.

### Option A — Quick start (Git Bash / terminal)

```bash
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" \
  --datadir="C:\ProgramData\MySQL\MySQL Server 8.4\Data" \
  --console &
```

Keep this terminal open, or run it in the background.

### Option B — Install as a service (one-time, requires admin)

Open **PowerShell as Administrator** and run once:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --install MySQL84
Start-Service MySQL84
Set-Service MySQL84 -StartupType Automatic
```

After this, MySQL starts automatically on every boot — no manual step needed.

### Verify MySQL is running

```bash
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqladmin.exe" -u root -prootpass123 ping
# Expected: mysqld is alive
```

---

## 3. Project .env for Local Dev

The `.env` file in the project root should have these values for local development:

```env
NODE_ENV=development
PORT=3000
API_VERSION=v1
CORS_ORIGINS=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# MySQL — LOCAL DEV
DB_HOST=localhost
DB_PORT=3306
DB_NAME=app_db
DB_USER=app_user
DB_PASS=localpass123
DB_POOL_MAX=10
DB_POOL_MIN=2

# JWT
JWT_SECRET=local_dev_secret_change_in_production_64chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
```

> When deploying to the production server, replace `DB_PASS` with `]a.gY358*8DW` and update `JWT_SECRET` to a strong random value.

---

## 4. Running Migrations & Seeders

Run these **once** after setting up the database (or after a `db:fresh` reset).

```bash
# From the project root
cd C:\Users\ASUS\Desktop\node\equity-eyes

# Run all migrations (creates all 16 tables)
npm run db:migrate

# Run all seeders (inserts plans, ranks, plan projections from Excel)
npm run db:seed
```

### What gets seeded

| Seeder | Data |
|--------|------|
| `plans` | P1 (₹11K) → P5 (₹55K) with welcome bonus amounts |
| `ranks` | L1 → L5 with team size, weekly payment, tenure |
| `plan_projections` | **1,455 rows** — 291 days × 5 plans, sourced from `src/data/Xceed 16 Code Chat & _.xlsx` |

### Reset everything (fresh start)

```bash
npm run db:fresh
# Equivalent to: undo all migrations → re-migrate → re-seed
```

### Individual commands

```bash
npm run db:migrate          # Run pending migrations
npm run db:migrate:undo     # Undo all migrations (drops all tables)
npm run db:seed             # Run all seeders
npm run db:seed:undo        # Undo all seeders (clears seeded data)
```

---

## 5. Starting the Dev Server

```bash
cd C:\Users\ASUS\Desktop\node\equity-eyes

# Development (auto-restarts on file change via nodemon)
npm run dev

# OR production-style (no auto-restart)
npm start
```

Server starts at: **`http://localhost:3000`**  
API base URL: **`http://localhost:3000/api/v1`**

---

## 6. Verify Everything is Working

### Health check

```bash
curl http://localhost:3000/api/v1/health
```

Expected:
```json
{
  "success": true,
  "status": 200,
  "message": "equity-eyes API is running",
  "data": { "environment": "development", "version": "v1", "uptime": "Xs" }
}
```

### Plans (uses seeded data)

```bash
curl http://localhost:3000/api/v1/plans
# Returns all 5 plans P1–P5
```

### Check DB tables directly

```bash
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" \
  -u app_user -plocalpass123 app_db \
  -e "SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema='app_db';"
```

---

## 7. Full Daily Workflow

Every time you sit down to work on the project:

```bash
# Step 1 — Start MySQL (if not installed as a service)
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --datadir="C:\ProgramData\MySQL\MySQL Server 8.4\Data" --console &

# Step 2 — Start the dev server
cd C:\Users\ASUS\Desktop\node\equity-eyes
npm run dev
```

That's it. MySQL + server are running. Hit `http://localhost:3000/api/v1/health` to confirm.

---

## 8. Production vs Local — Key Differences

| Setting | Local | Production Server |
|---------|-------|-------------------|
| `DB_PASS` | `localpass123` | `]a.gY358*8DW` |
| `DB_HOST` | `localhost` | `localhost` (same, runs on server) |
| `JWT_SECRET` | `local_dev_secret_...` | Strong 64-char random string |
| `NODE_ENV` | `development` | `production` |
| MySQL start | Manual each session | PM2 / systemd auto-start |
| Server start | `npm run dev` | `npm run pm2:start` |

---

## 9. Troubleshooting

### "Can't connect to MySQL server"

MySQL isn't running. Start it (see Section 2).

### "Access denied for user 'app_user'"

Wrong password or user not created. Re-run Section 1c setup SQL as root.

### Migrations fail with "Table already exists"

Tables are already up. Check with:
```bash
npm run db:migrate
# Sequelize will skip already-applied migrations automatically
```

If you want a clean slate:
```bash
npm run db:fresh
```

### Seeder fails with "NaN" error

Some Excel rows (DAY 292+) are placeholder rows with no data — they are automatically skipped by the seeder. If new data is added to the Excel, re-run:
```bash
npm run db:seed:undo
npm run db:seed
```

### Port 3000 already in use

```bash
# Find and kill the process using port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```
