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

## Request Password Reset

```http
POST /auth/password-reset/request
```

Request:

```json
{
  "email": "student@studentportal.local"
}
```

The response is intentionally generic so unknown email addresses are not
revealed. In non-production environments, `data.resetToken` is returned for
local testing. Production should deliver the reset token through a trusted email
provider.

## Confirm Password Reset

```http
POST /auth/password-reset/confirm
```

Request:

```json
{
  "token": "reset-token-from-email",
  "newPassword": "Student@456"
}
```

Reset tokens expire after 60 minutes and can only be used once.

## Current User

```http
GET /auth/me
Authorization: Bearer <access-token>
```

## Change Password

```http
PATCH /auth/me/password
Authorization: Bearer <access-token>
```

Request:

```json
{
  "currentPassword": "Admin@123",
  "newPassword": "Admin@456"
}
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
