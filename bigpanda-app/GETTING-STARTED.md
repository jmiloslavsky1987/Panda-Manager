# Getting Started — Panda Manager (Local Testing)

## What you need first
- **Docker Desktop** installed and running — [download here](https://www.docker.com/products/docker-desktop/)
- Your **Anthropic API key** — [get one here](https://console.anthropic.com/)

---

## Step 1 — Run the setup script

**Mac / Linux:**
```
./setup.sh
```

**Windows (PowerShell):**
```
.\setup.ps1
```

The script will ask for your Anthropic API key (just paste it in), then build and start everything automatically. First run takes about 5 minutes while it downloads and builds the app — after that, restarts are instant.

---

## Step 2 — Log in

The browser opens automatically. Use these credentials:

| | |
|---|---|
| **Email** | `admin@localhost.dev` |
| **Password** | `admin123` |

---

## Stop / Restart

**Stop the app:**
```
docker compose -f install/docker-compose.local.yml down
```

**Start again (no rebuild):**
```
docker compose -f install/docker-compose.local.yml up -d
```

Your data is preserved between restarts.

---

## Something went wrong?

**App won't start — check logs:**
```
docker compose -f install/docker-compose.local.yml logs app
```

**Full reset (deletes all data):**
```
docker compose -f install/docker-compose.local.yml down -v
./setup.sh
```

**Docker not running?**
Open Docker Desktop, wait for the whale icon to stop animating, then try again.

**Port 3000 already in use?**
Something else is using port 3000. Stop that app first, or run:
```
docker compose -f install/docker-compose.local.yml down
```
then start again.
