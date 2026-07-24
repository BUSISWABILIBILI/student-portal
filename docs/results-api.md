# Academic Results API

Base URL:

```text
http://localhost:5000/api
```

## Grading Rules

Default final-mark calculation:

```text
Final mark = (coursework mark * 40%) + (examination mark * 60%)
```

Default pass mark:

```text
50%
```

Grade mapping:

| Final mark | Grade | Grade point |
| --- | --- | --- |
| 80-100 | A | 4 |
| 70-79.99 | B | 3 |
| 60-69.99 | C | 2 |
| 50-59.99 | D | 1 |
| Below 50 | F | 0 |

If either the coursework mark or examination mark is missing, the result is
stored as incomplete and cannot be published.

## Administrator Endpoints

Administrator routes require an admin access token:

```http
Authorization: Bearer ADMIN_TOKEN
```

### List Results

```http
GET /results
```

Supported query filters:

- `page`
- `limit`
- `search`
- `academicPeriodId`
- `courseId`
- `outcome`
- `publicationStatus`
- `sortBy`
- `sortOrder`

Search matches:

- student first name
- student last name
- student email
- student number
- course code
- course name

### Capture Result

```http
POST /results
```

Request:

```json
{
  "enrollmentId": 1,
  "courseworkMark": 72,
  "examinationMark": 64,
  "remarks": "Good performance."
}
```

Successful responses include the calculated final mark, letter grade, grade
point, outcome, and draft publication status.

### Get One Result

```http
GET /results/:resultId
```

### Update Result

```http
PATCH /results/:resultId
```

Request:

```json
{
  "courseworkMark": 78,
  "examinationMark": 70,
  "remarks": "Marks verified and corrected."
}
```

Updating a published result automatically returns it to draft.

### Publish Result

```http
PATCH /results/:resultId/publish
```

Incomplete results cannot be published.

### Return Result To Draft

```http
PATCH /results/:resultId/unpublish
```

## Student Endpoint

Student routes require a student access token:

```http
Authorization: Bearer STUDENT_TOKEN
```

### View Published Results

```http
GET /results/me
```

Optional filters:

- `academicPeriodId=1`
- `outcome=pass`

Students only receive published results. Draft results remain hidden.

Example response:

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "courseworkMark": 78,
        "examinationMark": 70,
        "finalMark": 73.2,
        "grade": "B",
        "gradePoint": 3,
        "outcome": "pass",
        "publicationStatus": "published",
        "course": {
          "courseCode": "PRG101",
          "courseName": "Programming Fundamentals",
          "creditValue": 12
        }
      }
    ],
    "academicSummary": {
      "totalPublishedResults": 1,
      "completedCourses": 1,
      "passedCourses": 1,
      "failedCourses": 0,
      "attemptedCredits": 12,
      "earnedCredits": 12,
      "outstandingCredits": 0,
      "averageMark": 73.2,
      "gpa": 3
    }
  }
}
```

## Academic Summary

The student response includes:

- completed courses
- passed courses
- failed courses
- attempted credits
- earned credits
- outstanding credits
- average mark
- GPA

## Audit Logs

Result actions are recorded in `audit_logs` with `entity_type = 'result'`.
Expected actions:

- `result_captured`
- `result_updated`
- `result_published`
- `result_unpublished`
