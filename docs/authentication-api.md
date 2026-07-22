# Authentication API

Base URL:

```text
http://localhost:5000/api
```

Demo accounts
Administrator
Email: admin@studentportal.local
Password: Admin@123
Student
Email: student@studentportal.local
Password: Student@123

These accounts are intended for local development only.

Login
POST /auth/login

Request:

{
"email": "admin@studentportal.local",
"password": "Admin@123"
}
Current user
GET /auth/me
Authorization: Bearer <access-token>
Create user account

Administrator only:

POST /auth/users
Authorization: Bearer <administrator-token>

Request:

{
"firstName": "New",
"lastName": "Student",
"email": "new.student@studentportal.local",
"password": "Student@123",
"role": "student"
}
Logout
POST /auth/logout
Authorization: Bearer <access-token>
