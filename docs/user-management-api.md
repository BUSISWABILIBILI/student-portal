# User Management API

Base URL:

```text
http://localhost:5000/api

All endpoints require an administrator access token.

Authentication header
Authorization: Bearer <administrator-token>
List users
GET /users

Supported query parameters:

Parameter	Description
page	Current page
limit	Results per page
search	Name, email, student number or programme
role	admin or student
status	active or inactive
sortBy	Sort field
sortOrder	asc or desc

Example:

GET /users?page=1&limit=10&role=student&status=active
Create student
POST /users/students

Example request:

{
  "firstName": "Ayanda",
  "lastName": "Mthembu",
  "email": "ayanda@studentportal.local",
  "password": "Student@789",
  "programme": "Diploma in Information Technology",
  "yearLevel": 1,
  "admissionDate": "2026-02-02"
}
Get user
GET /users/:userId
Update account
PATCH /users/:userId
Update student profile
PATCH /users/:userId/student-profile
Activate or deactivate account
PATCH /users/:userId/status

Request:

{
  "isActive": false
}
```
