# Courses And Enrollments API

Base URL:

```text
http://localhost:5000/api
```

All endpoints require a bearer token. Admin-only endpoints are marked below.

## Active Academic Periods

```http
GET /academic-periods/active
```

Returns active academic periods and whether registration is currently open.
Students use this endpoint before registering for a course.

## List Courses

```http
GET /courses
```

Available to administrators and students. Students only receive active courses.

Supported query parameters:

| Parameter | Description |
| --- | --- |
| `page` | Current page |
| `limit` | Results per page |
| `search` | Course code, name, description, or department |
| `department` | Exact department filter |
| `status` | `active` or `inactive`; ignored for students because students only see active courses |
| `availability` | `available` or `full` |
| `sortBy` | `courseCode`, `courseName`, `department`, `creditValue`, `capacity`, or `createdAt` |
| `sortOrder` | `asc` or `desc` |

## Create Course

Administrator only:

```http
POST /courses
```

Request:

```json
{
  "courseCode": "DEV101",
  "courseName": "Introduction to Software Development",
  "department": "Information Technology",
  "creditValue": 12,
  "capacity": 50,
  "isActive": true,
  "description": "Foundational software development concepts."
}
```

## Update Course

Administrator only:

```http
PATCH /courses/:courseId
```

Request:

```json
{
  "capacity": 75,
  "isActive": false
}
```

Capacity cannot be lowered below the current number of registered students.

## List Enrollments

Administrator only:

```http
GET /enrollments
```

Supported query parameters:

| Parameter | Description |
| --- | --- |
| `page` | Current page |
| `limit` | Results per page |
| `search` | Student, email, student number, course code, or course name |
| `academicPeriodId` | Academic period ID |
| `courseId` | Course ID |
| `status` | `registered`, `cancelled`, or `completed` |
| `resultStatus` | `pending`, `captured`, or `all` |
| `sortBy` | `registeredAt`, `studentName`, `studentNumber`, or `courseCode` |
| `sortOrder` | `asc` or `desc` |

The admin results screen uses this endpoint to find registered enrollments that
do not yet have captured results.

## My Enrollments

Student only:

```http
GET /enrollments/me
```

Optional filters:

- `status=registered`
- `academicPeriodId=1`

## Register For Course

Student only:

```http
POST /enrollments
```

Request:

```json
{
  "courseId": 1,
  "academicPeriodId": 1
}
```

Registration requires an active academic period with open registration dates, an
active course, available capacity, and no existing registered/completed
enrollment for that course and period.

## Cancel Registration

Student only:

```http
PATCH /enrollments/:courseId/cancel?academicPeriodId=1
```

Cancellation is only allowed during the academic period registration window.
