# Authentication API

Base URL:

```text
http://localhost:5000/api
```

Demo accounts for local development:

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@studentportal.local` | `Admin@123` |
| Student | `student@studentportal.local` | `Student@123` |

## Login

```http
POST /auth/login
```

Request:

```json
{
  "email": "admin@studentportal.local",
  "password": "Admin@123"
}
```

Successful responses include `data.accessToken` and `data.user`.

## Current User

```http
GET /auth/me
Authorization: Bearer <access-token>
```

## Create Basic User Account

```http
POST /auth/users
Authorization: Bearer <administrator-token>
```

Request:

```json
{
  "firstName": "New",
  "lastName": "Admin",
  "email": "new.admin@studentportal.local",
  "password": "Admin@456",
  "role": "admin"
}
```

Use `POST /users/students` for full student account creation with an academic
profile and generated student number.

## Logout

```http
POST /auth/logout
Authorization: Bearer <access-token>
```

The API is stateless. Clients should remove the stored access token after this
request succeeds.
