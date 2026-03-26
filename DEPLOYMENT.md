# Black Falcon — Production Deployment Guide

**Version:** 1.0.0  
**Build Date:** March 26, 2026  
**Package:** `black-falcon-production-20260326-1335.tar.gz` (142 MB)

---

## 📦 Package Contents

- **Backend:** Node.js server (Express + TypeORM + PostgreSQL)
- **Frontend:** Electron desktop app (.dmg for macOS)

---

## 🚀 Backend Deployment

### 1. Extract Package

```bash
tar -xzf black-falcon-production-*.tar.gz
cd deploy/backend
```

### 2. Setup Environment

```bash
cp .env.example .env
nano .env  # Edit with production database credentials
```

**Required Environment Variables:**

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_NAME=black_falcon

JWT_SECRET=your-secret-key-change-in-production
PORT=3000
NODE_ENV=production
```

### 3. Database Setup

Ensure PostgreSQL is running and create database:

```bash
psql -U postgres -c "CREATE DATABASE black_falcon;"
```

### 4. Run Migrations

```bash
npm run typeorm migration:run -- -d dist/ormconfig.js
```

### 5. Start Server

**Option A: Direct start**
```bash
NODE_ENV=production npm start
```

**Option B: PM2 (recommended for production)**
```bash
npm install -g pm2
pm2 start dist/src/server.js --name black-falcon
pm2 save
pm2 startup  # Enable auto-restart on reboot
```

### 6. Verify Server

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-03-26T...","uptime":123.45,"environment":"production"}
```

---

## 🖥️ Frontend Deployment

### 1. Install Desktop App

Navigate to `deploy/frontend/` and:

- **macOS:** Double-click `black-falcon-0.1.0.dmg` and drag to Applications
- **Windows:** Run `.exe` installer (if built)
- **Linux:** Run AppImage or .deb package (if built)

### 2. Configure Backend URL

On first launch, configure the backend server URL in Settings:

- **Local:** `http://localhost:3000`
- **Remote:** `http://your-server-ip:3000` or `https://your-domain.com`

---

## 🔒 Security Checklist

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Use strong database password
- [ ] Enable HTTPS in production (reverse proxy: nginx/caddy)
- [ ] Configure firewall (allow only port 3000 from trusted IPs)
- [ ] Regularly backup database
- [ ] Monitor server logs (`pm2 logs black-falcon`)

---

## 🩺 Health Check & Monitoring

**Health endpoint:**
```bash
curl http://your-server:3000/health
```

**PM2 monitoring:**
```bash
pm2 status
pm2 logs black-falcon
pm2 monit
```

**Database connection test:**
```bash
psql -U postgres -d black_falcon -c "SELECT COUNT(*) FROM items;"
```

---

## 🔄 Updates & Rollback

**To update:**
1. Stop server: `pm2 stop black-falcon`
2. Backup database: `pg_dump black_falcon > backup.sql`
3. Extract new package over existing
4. Run new migrations: `npm run typeorm migration:run`
5. Start server: `pm2 start black-falcon`

**To rollback:**
1. Stop server
2. Restore database: `psql -U postgres black_falcon < backup.sql`
3. Restore previous `deploy/backend/` directory
4. Start server

---

## 🐛 Troubleshooting

**Server won't start:**
- Check `.env` file exists and has correct values
- Verify database is running: `pg_isready`
- Check logs: `pm2 logs black-falcon --lines 100`

**Frontend can't connect:**
- Verify backend is running: `curl http://localhost:3000/health`
- Check firewall allows port 3000
- Confirm backend URL in frontend settings

**Database errors:**
- Ensure migrations ran: `npm run typeorm migration:show`
- Check database permissions
- Verify database exists: `psql -l | grep black_falcon`

---

## 📞 Support

- **Project:** Black Falcon Inventory Management System
- **Version:** 1.0.0
- **Repository:** ~/black-falcon/

---

**🎯 Ready for Production!**
