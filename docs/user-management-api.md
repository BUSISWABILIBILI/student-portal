# User Management API

Base URL:

```text
http://localhost:5000/api
```

All endpoints require an administrator access token:

```http
Authorization: Bearer <administrator-token>
```

## List Users

```http
GET /users
```

Supported query parameters:

| Parameter | Description |
| --- | --- |
| `page` | Current page, defaults to `1` |
| `limit` | Results per page, defaults to `10`, maximum `100` |
| `search` | Name, email, student number, or programme search |
| `role` | `admin` or `student` |
| `status` | `active` or `inactive` |
| `sortBy` | `createdAt`, `firstName`, `lastName`, `email`, or `lastLoginAt` |
| `sortOrder` | `asc` or `desc` |

Example:

```http
GET /users?page=1&limit=10&role=student&status=active
```

Student user responses include `studentProfile.id`, which is the profile ID
used by student-targeted announcements.

## Create Student

```http
POST /users/students
```

Request:

```json
{
  "firstName": "Ayanda",
  "lastName": "Mthembu",
  "email": "ayanda@studentportal.local",
  "password": "Student@789",
  "programme": "Diploma in Information Technology",
  "yearLevel": 1,
  "admissionDate": "2026-02-02"
}
```

The API generates a student number from the admission year and the next
sequence value.

## Get User

```http
GET /users/:userId
```

## Update Account

```http
PATCH /users/:userId
```

Request:

```json
{
  "firstName": "Ayanda",
  "lastName": "Mthembu",
  "email": "ayanda.mthembu@studentportal.local"
}
```

## Update Student Profile

```http
PATCH /users/:userId/student-profile
```

Request:

```json
{
  "programme": "Bachelor of Information Technology",
  "yearLevel": 2,
  "phoneNumber": "+27123456789"
}
```

## Activate Or Deactivate Account

```http
PATCH /users/:userId/status
```

Request:

```json
{
  "isActive": false
}
```
