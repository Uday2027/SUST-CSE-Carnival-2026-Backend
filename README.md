# SUST CSE Carnival 2026 - Backend API

Production-ready backend for the SUST CSE Carnival admin panel and team registration system. Built with Node.js, TypeScript, and Prisma.

## 🚀 Quick Setup

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)

### 2. Installation
```bash
npm install
```

### 3. Configuration
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

### 4. Database Initialization
```bash
# Enable UUID extension (Required)
sudo -u postgres psql -d sust_cse_carnival -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'

# Push schema and seed admin
npm run db:push
npm run prisma:seed
```

### 5. Start Server
```bash
# Development
npm run dev

# Production
npm run build && npm start
```

---

## 📂 Project Architecture

The project follows a **Modular Architecture** to ensure scalability and maintainability.

```
src/
├── common/                # Shared utilities, middleware, and services
│   ├── middleware/        # Auth, Validation, Error Handling
│   ├── services/          # Shared business logic (e.g., EmailService)
│   └── lib/               # Shared libraries (Prisma, JWT)
└── modules/               # Feature-based modules
    ├── admin/             # Authentication & Admin Management
    ├── team/              # Registration & Competition Logic
    ├── email/             # Granular Bulk Email System
    ├── payment/           # SSLCommerz Integration
    └── pdf/               # PDF Generation Reports
```

---

## 📡 API Overview

| Endpoint | Description | Auth |
| :--- | :--- | :--- |
| `POST /api/admin/login` | Admin Authentication | Public |
| `POST /api/teams/register` | Team Registration | Public |
| `GET /api/teams` | Manage Registered Teams | Admin |
| `POST /api/email/send-bulk` | Targeted Email Notification | Admin |
| `POST /api/payment/initiate`| Start Payment Process | Public |
| `GET /api/download/teams` | Export Teams to PDF | Admin |

---

## 🛠️ Developer Resources
- **[PostgreSQL Terminal Guide](./POSTGRES_GUIDE.md)**: How to manage DB from Ubuntu terminal.
- **Postman Collection**: Import `postman_collection.json` for testing.
- **Prisma Studio**: Run `npm run prisma:studio` for a database GUI.

---

**SUST CSE Carnival 2026**
