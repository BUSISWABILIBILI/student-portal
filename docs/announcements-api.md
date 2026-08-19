# Announcements API

Base URL:

```text
http://localhost:5000/api
```

All endpoints require a bearer token. Admin-only endpoints are marked below.

## List Announcements

Administrator only:

```http
GET /announcements
```

Supported query parameters:

| Parameter | Description |
| --- | --- |
| `page` | Current page |
| `limit` | Results per page |
| `search` | Title or content search |
| `publicationStatus` | `draft` or `published` |
| `priority` | `low`, `normal`, `high`, or `urgent` |
| `targetType` | `all`, `role`, or `student` |
| `sortOrder` | `asc` or `desc` |

## Create Announcement

Administrator only:

```http
POST /announcements
```

Request for all users:

```json
{
  "title": "Registration notice",
  "content": "Registration is open for the active academic period.",
  "targetType": "all",
  "priority": "normal",
  "publishAt": null,
  "expiresAt": null
}
```

Request for a role:

```json
{
  "title": "Student registration notice",
  "content": "Please complete course registration before the deadline.",
  "targetType": "role",
  "targetRole": "student",
  "priority": "high"
}
```

Request for a specific student:

```json
{
  "title": "Advising appointment",
  "content": "Please meet your academic advisor this week.",
  "targetType": "student",
  "targetStudentId": 7,
  "priority": "normal"
}
```

`targetStudentId` is the `studentProfile.id` value returned by the user
management API.

## Update Announcement

Administrator only:

```http
PATCH /announcements/:announcementId
```

Updating an announcement returns it to draft.

## Publish Announcement

Administrator only:

```http
PATCH /announcements/:announcementId/publish
```

Expired announcements cannot be published.

## Return Announcement To Draft

Administrator only:

```http
PATCH /announcements/:announcementId/unpublish
```

## Delete Announcement

Administrator only:

```http
DELETE /announcements/:announcementId
```

## My Announcements

```http
GET /announcements/me
```

Returns published announcements visible to the signed-in user. Visibility is
based on publication status, publish/expiry windows, role targeting, and student
profile targeting.

Optional filters:

- `limit=20`
- `priority=urgent`
