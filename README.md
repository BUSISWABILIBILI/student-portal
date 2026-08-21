# Student Portal

A full-stack student management portal built with React, Vite, Node.js,
Express, and MySQL.

## Current Capabilities

- JWT authentication for administrators and students
- Role-based API authorization
- Student profile and user management endpoints
- Course management and registration endpoints
- Academic result capture, publication, and GPA summary logic
- Announcement targeting by all users, role, or student
- Admin and student dashboard endpoints
- React portal with login, protected routes, role-aware navigation, and
  workflow screens for dashboards, courses, registrations, results,
  announcements, and users

## Project Structure

```text
student-portal/
├── frontend/          React + Vite app
├── backend/           Express API
│   └── database/      MySQL schema, migrations, and seed data
├── docs/              API notes
├── e2e/               Browser smoke tests
└── package.json       Root workflow scripts
```

## Prerequisites

- Node.js 20.19 or newer
- MySQL 8 or compatible
- npm

## Environment Setup

Create the backend environment file:

```powershell
Copy-Item backend/.env.example backend/.env
```

Then update `backend/.env` for your local MySQL credentials and JWT secret.

Optional frontend environment file:

```powershell
Copy-Item frontend/.env.example frontend/.env
```

The default frontend API URL is `http://localhost:5000/api`.

## Install Dependencies

```powershell
npm run install:all
```

You can also install each side separately:

```powershell
cd backend
npm install

cd ../frontend
npm install
```

## Database Setup

`backend/database/schema.sql` is the source of truth for a fresh local
database. It drops and recreates `student_portal`, so run it only when you
intend to reset the local database.

```powershell
mysql -u root -p < backend/database/schema.sql
mysql -u root -p < backend/database/seed.sql
```

Create or refresh demo user accounts:

```powershell
npm run seed:users
```

Verify that the live database still matches the committed schema:

```powershell
npm run db:verify
```

Demo accounts:

```text
Administrator: admin@studentportal.local / Admin@123
Student:       student@studentportal.local / Student@123
```

## Run Locally

Start both the backend API and frontend app from the repository root:

```powershell
npm run dev
```

You can also run each side separately. In one terminal:

```powershell
npm run backend:dev
```

In another terminal:

```powershell
npm run frontend:dev
```

Frontend: `http://localhost:5173`

API health: `http://localhost:5000/api/health`

API readiness: `http://localhost:5000/api/ready`

## Verification

Run backend tests:

```powershell
npm run backend:test
```

Run frontend tests, lint, and build:

```powershell
npm run frontend:test
npm run frontend:lint
npm run frontend:build
```

Run all checks from the repository root:

```powershell
npm run check
```

Run the live database schema check when MySQL is available:

```powershell
npm run db:verify
```

GitHub Actions runs the same verification set on pushes and pull requests
targeting `main`.

## API Documentation

- [Authentication](docs/authentication-api.md)
- [User management](docs/user-management-api.md)
- [Courses and enrollments](docs/courses-and-enrollments-api.md)
- [Academic results](docs/results-api.md)
- [Announcements](docs/announcements-api.md)
- [Project readiness](docs/project-readiness.md)
- [Production operations](docs/production-operations.md)

## Notes

- Migrations in `backend/database/migrations/` are for upgrading older
  databases. Do not run them after applying `backend/database/schema.sql`; the
  fresh schema already contains their final state.

Author: Busiswa Bili-Bili
