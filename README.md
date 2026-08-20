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
├── client/      React + Vite frontend
├── server/      Express API
├── database/    MySQL schema, migrations, and seed data
├── docs/        API notes
└── package.json Root workflow scripts
```

## Prerequisites

- Node.js 20.19 or newer
- MySQL 8 or compatible
- npm

## Environment Setup

Create the server environment file:

```powershell
Copy-Item server/.env.example server/.env
```

Then update `server/.env` for your local MySQL credentials and JWT secret.

Optional client environment file:

```powershell
Copy-Item client/.env.example client/.env
```

The default client API URL is `http://localhost:5000/api`.

## Install Dependencies

```powershell
cd server
npm install

cd ../client
npm install
```

## Database Setup

`database/schema.sql` is the source of truth for a fresh local database. It
drops and recreates `student_portal`, so run it only when you intend to reset
the local database.

```powershell
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

Create or refresh demo user accounts:

```powershell
npm run seed:users
```

Demo accounts:

```text
Administrator: admin@studentportal.local / Admin@123
Student:       student@studentportal.local / Student@123
```

## Run Locally

In one terminal:

```powershell
npm run server:dev
```

In another terminal:

```powershell
npm run client:dev
```

Frontend: `http://localhost:5173`

API health: `http://localhost:5000/api/health`

## Verification

Run backend tests:

```powershell
npm run server:test
```

Run frontend lint and build:

```powershell
npm run client:lint
npm run client:build
```

Run all checks from the repository root:

```powershell
npm run check
```

## API Documentation

- [Authentication](docs/authentication-api.md)
- [User management](docs/user-management-api.md)
- [Courses and enrollments](docs/courses-and-enrollments-api.md)
- [Academic results](docs/results-api.md)
- [Announcements](docs/announcements-api.md)
- [Project readiness](docs/project-readiness.md)
- [Production operations](docs/production-operations.md)

## Notes

- Migrations in `database/migrations/` are for upgrading older databases. Do
  not run them after applying `database/schema.sql`; the fresh schema already
  contains their final state.

Author: Busiswa Bili-Bili
