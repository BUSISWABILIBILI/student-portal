import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const clientDir = path.join(rootDir, "frontend");
const apiPort = Number(process.env.E2E_API_PORT || 5100);
const webPort = Number(process.env.E2E_WEB_PORT || 5175);
const apiUrl = `http://127.0.0.1:${apiPort}`;
const webUrl = `http://127.0.0.1:${webPort}`;
const timeoutMs = 30000;
const debugE2e = process.env.E2E_DEBUG === "1";

const debug = (...messages) => {
  if (debugE2e) {
    console.log("[e2e]", ...messages);
  }
};

const escapeGithubCommandValue = (value) =>
  String(value)
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const demoUsers = {
  "admin@studentportal.local": {
    id: 1,
    firstName: "Portal",
    lastName: "Administrator",
    fullName: "Portal Administrator",
    email: "admin@studentportal.local",
    password: "Admin@123",
    role: "admin",
    isActive: true,
  },
  "student@studentportal.local": {
    id: 2,
    firstName: "Demo",
    lastName: "Student",
    fullName: "Demo Student",
    email: "student@studentportal.local",
    password: "Student@123",
    role: "student",
    isActive: true,
    studentProfile: {
      id: 7,
      studentNumber: "STU20260001",
      programme: "Diploma in Information Technology",
      yearLevel: 1,
    },
  },
};

const demoCourse = {
  id: 1,
  courseCode: "DEV101",
  courseName: "Introduction to Software Development",
  description: "Foundational software development concepts.",
  department: "Information Technology",
  creditValue: 12,
  capacity: 50,
  enrolledCount: 12,
  availablePlaces: 38,
  isFull: false,
  isActive: true,
};

const academicPeriod = {
  id: 1,
  name: "2026 First Semester",
  academicYear: 2026,
  registrationOpen: true,
};

const demoStudentSummary = {
  id: 2,
  name: "Demo Student",
  studentNumber: "STU20260001",
};

let nextCourseId = 2;
let nextEnrollmentId = 2;
let nextResultId = 1;
let nextUserId = 3;
let nextStudentProfileId = 8;
let nextAnnouncementId = 2;

const courses = [demoCourse];

const enrollments = [
  {
    id: 1,
    status: "registered",
    student: demoStudentSummary,
    course: demoCourse,
    academicPeriod,
    result: null,
  },
];

const results = [];

const passwordResetTokens = new Map();

const announcements = [
  {
    id: 1,
    title: "Registration notice",
    content: "Course registration is open.",
    targetType: "all",
    targetRole: null,
    targetStudent: null,
    priority: "normal",
    publicationStatus: "published",
    publishAt: new Date().toISOString(),
    expiresAt: null,
    createdBy: { fullName: "Portal Administrator" },
  },
];

const sendJson = (response, status, body) => {
  response.writeHead(status, {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Origin": webUrl,
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(body));
};

const readBody = (request) =>
  new Promise((resolve) => {
    let rawBody = "";

    request.on("data", (chunk) => {
      rawBody += chunk;
    });
    request.on("end", () => {
      resolve(rawBody ? JSON.parse(rawBody) : {});
    });
  });

const getFullName = (user) => `${user.firstName} ${user.lastName}`;

const getPublicUser = (user) => {
  const { password: _password, ...publicUser } = user;

  return {
    ...publicUser,
    ...(user.studentProfile && {
      studentProfile: { ...user.studentProfile },
    }),
  };
};

const getUserById = (userId) =>
  Object.values(demoUsers).find((user) => user.id === Number(userId));

const filterUsers = (items, url) => {
  const search = (url.searchParams.get("search") || "").trim().toLowerCase();
  const role = url.searchParams.get("role");
  const status = url.searchParams.get("status");
  const sortBy = url.searchParams.get("sortBy") || "createdAt";
  const sortOrder = url.searchParams.get("sortOrder") || "desc";
  const direction = sortOrder === "asc" ? 1 : -1;
  let visibleUsers = [...items];

  if (search) {
    visibleUsers = visibleUsers.filter((item) =>
      [
        item.fullName,
        item.firstName,
        item.lastName,
        item.email,
        item.studentProfile?.studentNumber,
        item.studentProfile?.programme,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }

  if (role) {
    visibleUsers = visibleUsers.filter((item) => item.role === role);
  }

  if (status === "active") {
    visibleUsers = visibleUsers.filter((item) => item.isActive);
  }

  if (status === "inactive") {
    visibleUsers = visibleUsers.filter((item) => !item.isActive);
  }

  return visibleUsers.sort((left, right) => {
    const leftValue = left[sortBy] ?? "";
    const rightValue = right[sortBy] ?? "";

    return String(leftValue).localeCompare(String(rightValue)) * direction;
  });
};

const calculateResultFields = ({ courseworkMark, examinationMark }) => {
  if (courseworkMark === null || examinationMark === null) {
    return {
      finalMark: null,
      grade: null,
      gradePoint: null,
      outcome: "incomplete",
    };
  }

  const finalMark = Number((courseworkMark * 0.4 + examinationMark * 0.6).toFixed(2));

  if (finalMark >= 75) {
    return { finalMark, grade: "A", gradePoint: 4, outcome: "pass" };
  }

  if (finalMark >= 65) {
    return { finalMark, grade: "B", gradePoint: 3, outcome: "pass" };
  }

  if (finalMark >= 50) {
    return { finalMark, grade: "C", gradePoint: 2, outcome: "pass" };
  }

  return { finalMark, grade: "F", gradePoint: 0, outcome: "fail" };
};

const syncCourseCapacity = (course) => {
  course.availablePlaces = Math.max(course.capacity - course.enrolledCount, 0);
  course.isFull = course.availablePlaces === 0;

  return course;
};

const isAnnouncementVisibleToUser = (announcement, user) => {
  const now = Date.now();

  if (announcement.publicationStatus !== "published") {
    return false;
  }

  if (
    announcement.publishAt &&
    new Date(announcement.publishAt).getTime() > now
  ) {
    return false;
  }

  if (
    announcement.expiresAt &&
    new Date(announcement.expiresAt).getTime() <= now
  ) {
    return false;
  }

  if (announcement.targetType === "all") {
    return true;
  }

  if (announcement.targetType === "role") {
    return announcement.targetRole === user.role;
  }

  return (
    announcement.targetType === "student" &&
    announcement.targetStudent?.id === user.studentProfile?.id
  );
};

const filterAnnouncements = (items, url, user, { visibleOnly = false } = {}) => {
  const search = (url.searchParams.get("search") || "").trim().toLowerCase();
  const publicationStatus = url.searchParams.get("publicationStatus");
  const priority = url.searchParams.get("priority");
  const targetType = url.searchParams.get("targetType");
  const sortOrder = url.searchParams.get("sortOrder") || "desc";
  let visibleAnnouncements = [...items];

  if (visibleOnly) {
    visibleAnnouncements = visibleAnnouncements.filter((announcement) =>
      isAnnouncementVisibleToUser(announcement, user),
    );
  } else if (publicationStatus) {
    visibleAnnouncements = visibleAnnouncements.filter(
      (announcement) => announcement.publicationStatus === publicationStatus,
    );
  }

  if (search) {
    visibleAnnouncements = visibleAnnouncements.filter((announcement) =>
      [announcement.title, announcement.content]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }

  if (priority) {
    visibleAnnouncements = visibleAnnouncements.filter(
      (announcement) => announcement.priority === priority,
    );
  }

  if (targetType) {
    visibleAnnouncements = visibleAnnouncements.filter(
      (announcement) => announcement.targetType === targetType,
    );
  }

  const direction = sortOrder === "asc" ? 1 : -1;

  return visibleAnnouncements.sort(
    (left, right) => (left.id - right.id) * direction,
  );
};

const getUserFromRequest = (request) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (token === "admin-token") {
    return demoUsers["admin@studentportal.local"];
  }

  if (token === "student-token") {
    return demoUsers["student@studentportal.local"];
  }

  return null;
};

const startMockApi = () =>
  new Promise((resolve) => {
    const server = http.createServer(async (request, response) => {
      const url = new URL(request.url, apiUrl);
      const route = `${request.method} ${url.pathname}`;

      if (request.method === "OPTIONS") {
        sendJson(response, 204, {});
        return;
      }

      if (route === "GET /api/health") {
        sendJson(response, 200, {
          success: true,
          message: "Student Portal API is running.",
        });
        return;
      }

      if (route === "POST /api/auth/login") {
        const body = await readBody(request);
        const user = demoUsers[body.email];

        if (!user || body.password !== user.password) {
          sendJson(response, 401, {
            success: false,
            message: "Invalid email or password.",
          });
          return;
        }

        sendJson(response, 200, {
          success: true,
          message: "Login successful.",
          data: {
            accessToken: `${user.role}-token`,
            user: getPublicUser(user),
          },
        });
        return;
      }

      if (route === "POST /api/auth/password-reset/request") {
        const body = await readBody(request);
        const user = demoUsers[body.email];
        const resetToken = "mock-password-reset-token-1234567890";

        if (user?.isActive) {
          passwordResetTokens.set(resetToken, user.email);
        }

        sendJson(response, 200, {
          success: true,
          message:
            "If an active account exists for that email, password reset instructions have been prepared.",
          data: user?.isActive
            ? {
                resetToken,
                expiresInMinutes: 60,
              }
            : {},
        });
        return;
      }

      if (route === "POST /api/auth/password-reset/confirm") {
        const body = await readBody(request);
        const email = passwordResetTokens.get(body.token);
        const user = email ? demoUsers[email] : null;

        if (!user) {
          sendJson(response, 400, {
            success: false,
            message: "Password reset token is invalid or expired.",
          });
          return;
        }

        user.password = body.newPassword;
        passwordResetTokens.delete(body.token);

        sendJson(response, 200, {
          success: true,
          message: "Password reset successfully.",
        });
        return;
      }

      const user = getUserFromRequest(request);

      if (!user) {
        sendJson(response, 401, {
          success: false,
          message: "Authentication is required.",
        });
        return;
      }

      if (route === "GET /api/auth/me") {
        sendJson(response, 200, {
          success: true,
          data: { user: getPublicUser(user) },
        });
        return;
      }

      if (route === "PATCH /api/auth/me/password") {
        const body = await readBody(request);

        if (body.currentPassword !== user.password) {
          sendJson(response, 400, {
            success: false,
            message: "Current password is incorrect.",
          });
          return;
        }

        user.password = body.newPassword;

        sendJson(response, 200, {
          success: true,
          message: "Password changed successfully.",
          data: {
            user: getPublicUser(user),
          },
        });
        return;
      }

      if (route === "POST /api/auth/logout") {
        sendJson(response, 200, {
          success: true,
          message: "Logout successful. Remove the access token from the client.",
        });
        return;
      }

      if (route === "GET /api/dashboard/admin") {
        sendJson(response, 200, {
          success: true,
          data: {
            dashboard: {
              users: { total: 2, students: 1 },
              courses: { active: 1 },
              enrollments: { registered: 1 },
              results: { published: 1 },
              announcements: { published: 1 },
              recentStudents: [
                getPublicUser(demoUsers["student@studentportal.local"]),
              ],
            },
          },
        });
        return;
      }

      if (route === "GET /api/dashboard/student") {
        sendJson(response, 200, {
          success: true,
          data: {
            dashboard: {
              enrollments: { registered: 1, completed: 0 },
              academicPerformance: {
                publishedResults: 1,
                earnedCredits: 12,
                averageMark: 74,
                gpa: 3,
              },
              recentResults: [
                {
                  id: 1,
                  finalMark: 74,
                  course: {
                    courseCode: demoCourse.courseCode,
                    courseName: demoCourse.courseName,
                  },
                },
              ],
            },
          },
        });
        return;
      }

      if (route === "GET /api/courses") {
        const search = (url.searchParams.get("search") || "")
          .trim()
          .toLowerCase();
        const department = (url.searchParams.get("department") || "")
          .trim()
          .toLowerCase();
        const status = url.searchParams.get("status");
        const availability = url.searchParams.get("availability");
        const sortBy = url.searchParams.get("sortBy") || "courseCode";
        const sortOrder = url.searchParams.get("sortOrder") || "asc";
        let visibleCourses =
          user.role === "student"
            ? courses.filter((course) => course.isActive)
            : courses;

        visibleCourses = visibleCourses.map(syncCourseCapacity);

        if (search) {
          visibleCourses = visibleCourses.filter((course) =>
            [
              course.courseCode,
              course.courseName,
              course.description,
              course.department,
            ]
              .join(" ")
              .toLowerCase()
              .includes(search),
          );
        }

        if (department) {
          visibleCourses = visibleCourses.filter(
            (course) => (course.department || "").toLowerCase() === department,
          );
        }

        if (status === "active" || status === "inactive") {
          visibleCourses = visibleCourses.filter(
            (course) => course.isActive === (status === "active"),
          );
        }

        if (availability === "available") {
          visibleCourses = visibleCourses.filter((course) => !course.isFull);
        }

        if (availability === "full") {
          visibleCourses = visibleCourses.filter((course) => course.isFull);
        }

        visibleCourses = [...visibleCourses].sort((left, right) => {
          const leftValue = left[sortBy] ?? left.courseCode ?? "";
          const rightValue = right[sortBy] ?? right.courseCode ?? "";
          const direction = sortOrder === "desc" ? -1 : 1;

          if (typeof leftValue === "number" && typeof rightValue === "number") {
            return (leftValue - rightValue) * direction;
          }

          return String(leftValue).localeCompare(String(rightValue)) * direction;
        });

        sendJson(response, 200, {
          success: true,
          data: {
            courses: visibleCourses,
            pagination: {
              page: 1,
              limit: 50,
              totalItems: visibleCourses.length,
              totalPages: 1,
            },
          },
        });
        return;
      }

      if (route === "POST /api/courses") {
        const body = await readBody(request);
        const course = syncCourseCapacity({
          id: nextCourseId,
          courseCode: body.courseCode,
          courseName: body.courseName,
          description: body.description,
          department: body.department,
          creditValue: body.creditValue,
          capacity: body.capacity,
          enrolledCount: 0,
          availablePlaces: body.capacity,
          isFull: false,
          isActive: body.isActive,
        });

        nextCourseId += 1;
        courses.unshift(course);

        sendJson(response, 201, {
          success: true,
          message: "Course created successfully.",
          data: { course },
        });
        return;
      }

      const courseRouteMatch = url.pathname.match(/^\/api\/courses\/(\d+)$/);

      if (courseRouteMatch && request.method === "PATCH") {
        const [, rawCourseId] = courseRouteMatch;
        const course = courses.find((item) => item.id === Number(rawCourseId));

        if (!course) {
          sendJson(response, 404, {
            success: false,
            message: "Course not found.",
          });
          return;
        }

        const body = await readBody(request);

        Object.assign(course, body);
        syncCourseCapacity(course);

        sendJson(response, 200, {
          success: true,
          message: "Course updated successfully.",
          data: { course },
        });
        return;
      }

      if (route === "GET /api/academic-periods/active") {
        sendJson(response, 200, {
          success: true,
          data: {
            academicPeriods: [academicPeriod],
          },
        });
        return;
      }

      if (route === "GET /api/enrollments") {
        const pendingOnly = url.searchParams.get("resultStatus") === "pending";
        const visibleEnrollments = pendingOnly
          ? enrollments.filter(
              (enrollment) =>
                enrollment.status === "registered" &&
                !results.some((result) => result.enrollmentId === enrollment.id),
            )
          : enrollments;

        sendJson(response, 200, {
          success: true,
          data: {
            enrollments: visibleEnrollments,
            pagination: {
              page: 1,
              limit: 100,
              totalItems: visibleEnrollments.length,
              totalPages: 1,
            },
          },
        });
        return;
      }

      if (route === "GET /api/enrollments/me") {
        sendJson(response, 200, {
          success: true,
          data: {
            courses: enrollments.map((enrollment) => ({
              id: enrollment.id,
              status: enrollment.status,
              course: syncCourseCapacity(enrollment.course),
              academicPeriod: enrollment.academicPeriod,
            })),
          },
        });
        return;
      }

      if (route === "POST /api/enrollments") {
        const body = await readBody(request);
        const course = courses.find((item) => item.id === Number(body.courseId));

        if (!course) {
          sendJson(response, 404, {
            success: false,
            message: "Course not found.",
          });
          return;
        }

        let enrollment = enrollments.find(
          (item) => item.course.id === course.id && item.status !== "registered",
        );

        if (enrollment) {
          enrollment.status = "registered";
        } else {
          enrollment = {
            id: nextEnrollmentId,
            status: "registered",
            student: demoStudentSummary,
            course,
            academicPeriod,
            result: null,
          };
          nextEnrollmentId += 1;
          enrollments.push(enrollment);
        }

        course.enrolledCount += 1;
        syncCourseCapacity(course);

        sendJson(response, 201, {
          success: true,
          message: "Course registration completed successfully.",
          data: { registration: enrollment },
        });
        return;
      }

      const cancelEnrollmentMatch = url.pathname.match(
        /^\/api\/enrollments\/(\d+)\/cancel$/,
      );

      if (cancelEnrollmentMatch && request.method === "PATCH") {
        const [, rawCourseId] = cancelEnrollmentMatch;
        const enrollment = enrollments.find(
          (item) =>
            item.course.id === Number(rawCourseId) &&
            item.status === "registered",
        );

        if (!enrollment) {
          sendJson(response, 404, {
            success: false,
            message: "Registration not found.",
          });
          return;
        }

        enrollment.status = "cancelled";
        enrollment.course.enrolledCount = Math.max(
          enrollment.course.enrolledCount - 1,
          0,
        );
        syncCourseCapacity(enrollment.course);

        sendJson(response, 200, {
          success: true,
          message: "Course registration cancelled successfully.",
          data: { registration: enrollment },
        });
        return;
      }

      if (route === "GET /api/results") {
        sendJson(response, 200, {
          success: true,
          data: {
            results,
          },
        });
        return;
      }

      if (route === "GET /api/results/me") {
        const publishedResults = results.filter(
          (result) => result.publicationStatus === "published",
        );
        const passedResults = publishedResults.filter(
          (result) => result.outcome === "pass",
        );
        const earnedCredits = passedResults.reduce(
          (total, result) => total + Number(result.course.creditValue || 0),
          0,
        );
        const averageMark =
          publishedResults.length > 0
            ? Number(
                (
                  publishedResults.reduce(
                    (total, result) => total + Number(result.finalMark || 0),
                    0,
                  ) / publishedResults.length
                ).toFixed(2),
              )
            : 0;
        const gpa =
          publishedResults.length > 0
            ? Number(
                (
                  publishedResults.reduce(
                    (total, result) => total + Number(result.gradePoint || 0),
                    0,
                  ) / publishedResults.length
                ).toFixed(2),
              )
            : 0;

        sendJson(response, 200, {
          success: true,
          data: {
            results: publishedResults,
            academicSummary: {
              totalPublishedResults: publishedResults.length,
              completedCourses: publishedResults.length,
              passedCourses: passedResults.length,
              earnedCredits,
              averageMark,
              gpa,
            },
          },
        });
        return;
      }

      if (route === "POST /api/results") {
        const body = await readBody(request);
        const enrollment = enrollments.find(
          (item) => item.id === Number(body.enrollmentId),
        );

        if (!enrollment) {
          sendJson(response, 404, {
            success: false,
            message: "Enrollment not found.",
          });
          return;
        }

        const marks = {
          courseworkMark: body.courseworkMark ?? null,
          examinationMark: body.examinationMark ?? null,
        };
        const result = {
          id: nextResultId,
          enrollmentId: enrollment.id,
          ...marks,
          ...calculateResultFields(marks),
          publicationStatus: "draft",
          remarks: body.remarks,
          student: enrollment.student,
          course: enrollment.course,
          academicPeriod: { label: enrollment.academicPeriod.name },
        };

        nextResultId += 1;
        enrollment.result = result;
        results.unshift(result);

        sendJson(response, 201, {
          success: true,
          message: "Result captured successfully.",
          data: { result },
        });
        return;
      }

      const resultRouteMatch = url.pathname.match(
        /^\/api\/results\/(\d+)(?:\/(publish|unpublish))?$/,
      );

      if (resultRouteMatch && request.method === "PATCH") {
        const [, rawResultId, action] = resultRouteMatch;
        const result = results.find((item) => item.id === Number(rawResultId));

        if (!result) {
          sendJson(response, 404, {
            success: false,
            message: "Result not found.",
          });
          return;
        }

        if (action === "publish") {
          result.publicationStatus = "published";

          sendJson(response, 200, {
            success: true,
            message: "Result published successfully.",
            data: { result },
          });
          return;
        }

        if (action === "unpublish") {
          result.publicationStatus = "draft";

          sendJson(response, 200, {
            success: true,
            message: "Result returned to draft successfully.",
            data: { result },
          });
          return;
        }

        const body = await readBody(request);
        const marks = {
          courseworkMark: body.courseworkMark ?? null,
          examinationMark: body.examinationMark ?? null,
        };

        Object.assign(result, {
          ...marks,
          ...calculateResultFields(marks),
          publicationStatus: "draft",
          remarks: body.remarks,
        });

        sendJson(response, 200, {
          success: true,
          message: "Result updated successfully.",
          data: { result },
        });
        return;
      }

      if (route === "GET /api/announcements") {
        const visibleAnnouncements = filterAnnouncements(
          announcements,
          url,
          user,
        );

        sendJson(response, 200, {
          success: true,
          data: {
            announcements: visibleAnnouncements,
            pagination: {
              page: 1,
              limit: 50,
              totalItems: visibleAnnouncements.length,
              totalPages: 1,
            },
          },
        });
        return;
      }

      if (route === "GET /api/announcements/me") {
        const visibleAnnouncements = filterAnnouncements(
          announcements,
          url,
          user,
          {
            visibleOnly: true,
          },
        );

        sendJson(response, 200, {
          success: true,
          data: {
            announcements: visibleAnnouncements,
          },
        });
        return;
      }

      if (route === "POST /api/announcements") {
        const body = await readBody(request);
        const announcement = {
          id: nextAnnouncementId,
          title: body.title,
          content: body.content,
          targetType: body.targetType,
          targetRole: body.targetType === "role" ? body.targetRole : null,
          targetStudent:
            body.targetType === "student"
              ? {
                  id: body.targetStudentId,
                  fullName: "Demo Student",
                  studentNumber: "STU20260001",
                }
              : null,
          priority: body.priority || "normal",
          publicationStatus: "draft",
          publishAt: body.publishAt,
          expiresAt: body.expiresAt,
          createdBy: { fullName: "Portal Administrator" },
        };

        nextAnnouncementId += 1;
        announcements.unshift(announcement);

        sendJson(response, 201, {
          success: true,
          message: "Announcement created successfully.",
          data: { announcement },
        });
        return;
      }

      const announcementRouteMatch = url.pathname.match(
        /^\/api\/announcements\/(\d+)(?:\/(publish|unpublish))?$/,
      );

      if (announcementRouteMatch && request.method === "PATCH") {
        const [, rawAnnouncementId, action] = announcementRouteMatch;
        const announcement = announcements.find(
          (item) => item.id === Number(rawAnnouncementId),
        );

        if (!announcement) {
          sendJson(response, 404, {
            success: false,
            message: "Announcement not found.",
          });
          return;
        }

        if (action === "publish") {
          announcement.publicationStatus = "published";
          announcement.publishAt ||= new Date().toISOString();

          sendJson(response, 200, {
            success: true,
            message: "Announcement published successfully.",
            data: { announcement },
          });
          return;
        }

        if (action === "unpublish") {
          announcement.publicationStatus = "draft";

          sendJson(response, 200, {
            success: true,
            message: "Announcement returned to draft.",
            data: { announcement },
          });
          return;
        }

        const body = await readBody(request);

        announcement.title = body.title;
        announcement.content = body.content;
        announcement.targetType = body.targetType;
        announcement.targetRole =
          body.targetType === "role" ? body.targetRole : null;
        announcement.targetStudent =
          body.targetType === "student"
            ? {
                id: body.targetStudentId,
                fullName: "Demo Student",
                studentNumber: "STU20260001",
              }
            : null;
        announcement.priority = body.priority || "normal";
        announcement.publishAt = body.publishAt;
        announcement.expiresAt = body.expiresAt;
        announcement.publicationStatus = "draft";

        sendJson(response, 200, {
          success: true,
          message: "Announcement updated successfully.",
          data: { announcement },
        });
        return;
      }

      if (announcementRouteMatch && request.method === "DELETE") {
        const [, rawAnnouncementId] = announcementRouteMatch;
        const index = announcements.findIndex(
          (item) => item.id === Number(rawAnnouncementId),
        );

        if (index === -1) {
          sendJson(response, 404, {
            success: false,
            message: "Announcement not found.",
          });
          return;
        }

        announcements.splice(index, 1);

        sendJson(response, 200, {
          success: true,
          message: "Announcement deleted successfully.",
        });
        return;
      }

      if (route === "POST /api/users/students") {
        const body = await readBody(request);
        const student = {
          id: nextUserId,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          role: "student",
          isActive: true,
          password: body.password,
          createdAt: new Date().toISOString(),
          studentProfile: {
            id: nextStudentProfileId,
            studentNumber: `STU2026000${nextStudentProfileId}`,
            programme: body.programme,
            yearLevel: body.yearLevel,
            dateOfBirth: body.dateOfBirth,
            gender: body.gender,
            phoneNumber: body.phoneNumber,
            addressLine: body.addressLine,
            city: body.city,
            province: body.province,
            postalCode: body.postalCode,
            admissionDate: body.admissionDate,
          },
        };

        student.fullName = getFullName(student);
        nextUserId += 1;
        nextStudentProfileId += 1;
        demoUsers[student.email] = student;

        sendJson(response, 201, {
          success: true,
          message: "Student account created successfully.",
          data: { student: getPublicUser(student) },
        });
        return;
      }

      const userProfileRouteMatch = url.pathname.match(
        /^\/api\/users\/(\d+)\/student-profile$/,
      );

      if (userProfileRouteMatch && request.method === "PATCH") {
        const [, rawUserId] = userProfileRouteMatch;
        const targetUser = getUserById(rawUserId);

        if (!targetUser?.studentProfile) {
          sendJson(response, 404, {
            success: false,
            message: "Student profile not found.",
          });
          return;
        }

        const body = await readBody(request);

        Object.assign(targetUser.studentProfile, body);

        sendJson(response, 200, {
          success: true,
          message: "Student profile updated successfully.",
          data: { student: getPublicUser(targetUser) },
        });
        return;
      }

      const userStatusRouteMatch = url.pathname.match(
        /^\/api\/users\/(\d+)\/status$/,
      );

      if (userStatusRouteMatch && request.method === "PATCH") {
        const [, rawUserId] = userStatusRouteMatch;
        const targetUser = getUserById(rawUserId);

        if (!targetUser) {
          sendJson(response, 404, {
            success: false,
            message: "User not found.",
          });
          return;
        }

        const body = await readBody(request);

        targetUser.isActive = body.isActive;

        sendJson(response, 200, {
          success: true,
          message: targetUser.isActive
            ? "User account activated successfully."
            : "User account deactivated successfully.",
          data: { user: getPublicUser(targetUser) },
        });
        return;
      }

      const userRouteMatch = url.pathname.match(/^\/api\/users\/(\d+)$/);

      if (userRouteMatch && request.method === "PATCH") {
        const [, rawUserId] = userRouteMatch;
        const targetUser = getUserById(rawUserId);

        if (!targetUser) {
          sendJson(response, 404, {
            success: false,
            message: "User not found.",
          });
          return;
        }

        const body = await readBody(request);
        const previousEmail = targetUser.email;

        Object.assign(targetUser, {
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
        });
        targetUser.fullName = getFullName(targetUser);

        if (previousEmail !== targetUser.email) {
          delete demoUsers[previousEmail];
          demoUsers[targetUser.email] = targetUser;
        }

        sendJson(response, 200, {
          success: true,
          message: "User account updated successfully.",
          data: { user: getPublicUser(targetUser) },
        });
        return;
      }

      if (route === "GET /api/users") {
        const users = filterUsers(Object.values(demoUsers), url);

        sendJson(response, 200, {
          success: true,
          data: {
            users: users.map(getPublicUser),
            pagination: {
              page: 1,
              limit: 50,
              totalItems: users.length,
              totalPages: 1,
            },
          },
        });
        return;
      }

      sendJson(response, 404, {
        success: false,
        message: `No mock route for ${route}`,
      });
    });

    server.listen(apiPort, "127.0.0.1", () => resolve(server));
  });

const findBrowserExecutable = () => {
  const candidates = [
    process.env.E2E_BROWSER_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/opt/google/chrome/chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate));
};

const waitForHttp = async (url, { expectStatus = 200 } = {}) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);

      if (response.status === expectStatus) {
        return response;
      }
    } catch {
      // Keep waiting while the process starts.
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for ${url}`);
};

const startProcess = ({ command, args, cwd, env, readyUrl }) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        ...env,
      },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let settled = false;
    let output = "";

    const finish = (error, processHandle) => {
      if (settled) {
        return;
      }

      settled = true;

      if (error) {
        reject(error);
        return;
      }

      resolve(processHandle);
    };

    const appendOutput = (chunk) => {
      const text = chunk.toString();
      output += text;

      if (debugE2e) {
        process.stderr.write(text);
      }
    };

    child.stdout.on("data", appendOutput);
    child.stderr.on("data", appendOutput);
    child.once("exit", (code) => {
      finish(
        new Error(
          `${command} exited before ready with code ${code}.\n${output}`,
        ),
      );
    });
    child.once("error", finish);

    waitForHttp(readyUrl)
      .then(() => finish(null, child))
      .catch((error) =>
        finish(
          new Error(
            `${error.message}\n\n${command} output:\n${output || "(no output)"}`,
          ),
        ),
      );
  });

const stopProcess = async (child) => {
  if (!child || child.killed) {
    return;
  }

  child.kill("SIGTERM");

  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    delay(3000).then(() => {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
    }),
  ]);
};

class CdpPage {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    this.socket = new WebSocket(this.webSocketUrl);

    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });

    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);

      if (!message.id || !this.pending.has(message.id)) {
        return;
      }

      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message));
        return;
      }

      resolve(message.result);
    });

    await this.send("Page.enable");
    await this.send("Runtime.enable");
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;

    this.socket.send(JSON.stringify({ id, method, params }));

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  async evaluate(expression) {
    const response = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });

    if (response.exceptionDetails) {
      throw new Error(
        response.exceptionDetails.exception?.description ||
          response.exceptionDetails.text,
      );
    }

    return response.result.value;
  }

  async waitFor(expression, message) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const value = await this.evaluate(expression);

      if (value) {
        return value;
      }

      await delay(250);
    }

    const bodyText = await this.evaluate("document.body.innerText");

    throw new Error(`${message}\n\nCurrent page text:\n${bodyText}`);
  }

  async close() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }
}

const launchBrowser = async (url) => {
  const executablePath = findBrowserExecutable();

  assert(
    executablePath,
    "Chrome or Edge was not found. Set E2E_BROWSER_PATH to a Chromium browser.",
  );

  debug("Using browser executable:", executablePath);

  const userDataDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "student-portal-e2e-"),
  );
  let browserOutput = "";
  let browserExited = false;
  let browserExitCode = null;
  const browser = spawn(
    executablePath,
    [
      "--headless=new",
      "--disable-gpu",
      ...(process.env.CI ? ["--no-sandbox", "--disable-dev-shm-usage"] : []),
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--remote-debugging-port=0",
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ],
    {
      stdio: ["ignore", "ignore", "pipe"],
    },
  );

  browser.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    browserOutput += text;

    if (debugE2e) {
      process.stderr.write(text);
    }
  });
  browser.once("exit", (code) => {
    browserExited = true;
    browserExitCode = code;
  });

  const portFile = path.join(userDataDir, "DevToolsActivePort");
  const startedAt = Date.now();
  let portText = "";

  while (Date.now() - startedAt < timeoutMs && !portText) {
    if (browserExited) {
      throw new Error(
        [
          `Browser exited before opening a debug port with code ${browserExitCode}.`,
          "Browser stderr:",
          browserOutput || "(no output)",
        ].join("\n"),
      );
    }

    if (fs.existsSync(portFile)) {
      try {
        portText = fs.readFileSync(portFile, "utf8").trim();
      } catch (error) {
        if (error.code !== "EBUSY") {
          throw error;
        }
      }
    }

    await delay(100);
  }

  assert(
    portText,
    [
      "Timed out waiting for browser debug port.",
      "Browser stderr:",
      browserOutput || "(no output)",
    ].join("\n"),
  );

  const [port] = portText.split(/\r?\n/);
  const targetResponse = await fetch(
    `http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`,
    {
      method: "PUT",
    },
  );
  assert(
    targetResponse.ok,
    `Browser target creation failed with status ${targetResponse.status}.`,
  );
  const target = await targetResponse.json();
  assert(target.webSocketDebuggerUrl, "Browser target did not include a WebSocket URL.");
  const page = new CdpPage(target.webSocketDebuggerUrl);

  await page.connect();

  return { browser, page, userDataDir };
};

const clickByText = async (page, text) => {
  await page.waitFor(
    `(() => {
      const candidates = [...document.querySelectorAll("button, a")];

      return candidates.some(
        (node) =>
          node.textContent.trim() === ${JSON.stringify(text)} &&
          !node.disabled,
      );
    })()`,
    `Expected enabled clickable text: ${text}`,
  );

  await page.evaluate(`(() => {
    const candidates = [...document.querySelectorAll("button, a")];
    const element = candidates.find(
      (node) =>
        node.textContent.trim() === ${JSON.stringify(text)} &&
        !node.disabled,
    );

    if (!element) {
      throw new Error("Could not find clickable text: ${text}");
    }

    element.click();
    return true;
  })()`);
};

const clickButtonNearText = async (page, contextText, buttonText) => {
  await page.waitFor(
    `(() => {
      const containers = [...document.querySelectorAll("tr, article, section")];

      return containers.some((node) => {
        const text = node.innerText || node.textContent || "";

        if (!text.includes(${JSON.stringify(contextText)})) {
          return false;
        }

        return [...node.querySelectorAll("button, a")].some(
          (candidate) =>
            candidate.textContent.trim() === ${JSON.stringify(buttonText)},
        );
      });
    })()`,
    `Expected ${buttonText} near ${contextText}`,
  );

  await page.evaluate(`(() => {
    const containers = [...document.querySelectorAll("tr, article, section")];
    const container = containers.find((node) =>
      (node.innerText || node.textContent || "").includes(${JSON.stringify(
        contextText,
      )})
    );

    if (!container) {
      throw new Error("Could not find container text: ${contextText}");
    }

    const candidates = [...container.querySelectorAll("button, a")];
    const element = candidates.find(
      (node) => node.textContent.trim() === ${JSON.stringify(buttonText)},
    );

    if (!element) {
      throw new Error("Could not find button near ${contextText}: ${buttonText}");
    }

    element.click();
    return true;
  })()`);
};

const fillField = async (page, name, value) => {
  await page.evaluate(`(() => {
    const element = document.querySelector('[name="${name}"]');

    if (!element) {
      throw new Error("Could not find field: ${name}");
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype,
      "value",
    );

    descriptor.set.call(element, ${JSON.stringify(value)});
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
};

const selectField = async (page, name, value) => {
  await page.waitFor(
    `(() => {
      const element = document.querySelector('[name="${name}"]');

      return Boolean(
        element &&
          [...element.options].some(
            (option) => option.value === ${JSON.stringify(value)},
          ),
      );
    })()`,
    `Expected select option ${value} for ${name}`,
  );

  await page.evaluate(`(() => {
    const element = document.querySelector('[name="${name}"]');

    if (!element) {
      throw new Error("Could not find field: ${name}");
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      "value",
    );

    descriptor.set.call(element, ${JSON.stringify(value)});
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
};

const expectText = async (page, text) => {
  await page.waitFor(
    `(document.body?.innerText || "").toLowerCase().includes(${JSON.stringify(
      text.toLowerCase(),
    )})`,
    `Expected page text: ${text}`,
  );
};

const expectNoText = async (page, text) => {
  const hasText = await page.evaluate(
    `(document.body?.innerText || "").toLowerCase().includes(${JSON.stringify(
      text.toLowerCase(),
    )})`,
  );

  assert(!hasText, `Unexpected page text: ${text}`);
};

const waitForNoText = async (page, text) => {
  await page.waitFor(
    `!(document.body?.innerText || "").toLowerCase().includes(${JSON.stringify(
      text.toLowerCase(),
    )})`,
    `Expected page text to disappear: ${text}`,
  );
};

const signIn = async (page, email, password) => {
  await fillField(page, "email", email);
  await fillField(page, "password", password);
  await clickByText(page, "Sign in");
};

const closeServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const run = async () => {
  debug("Root directory:", rootDir);
  debug("Frontend directory:", clientDir);
  assert(fs.existsSync(clientDir), `Frontend directory was not found: ${clientDir}`);

  const viteBinPath = path.join(
    clientDir,
    "node_modules",
    "vite",
    "bin",
    "vite.js",
  );
  assert(fs.existsSync(viteBinPath), `Vite binary was not found: ${viteBinPath}`);

  const api = await startMockApi();
  const web = await startProcess({
    command: process.execPath,
    args: [
      viteBinPath,
      "--host",
      "127.0.0.1",
      "--port",
      String(webPort),
      "--strictPort",
    ],
    cwd: clientDir,
    env: {
      VITE_API_URL: `${apiUrl}/api`,
    },
    readyUrl: webUrl,
  });
  let browser;
  let page;
  let userDataDir;

  try {
    ({ browser, page, userDataDir } = await launchBrowser(webUrl));

    await expectText(page, "Sign in");
    await clickByText(page, "Forgot password?");
    await expectText(page, "Reset password");
    await fillField(page, "email", "student@studentportal.local");
    await clickByText(page, "Prepare reset");
    await page.waitFor(
      `document.querySelector("textarea[readonly]")?.value === "mock-password-reset-token-1234567890"`,
      "Expected password reset token in readonly field",
    );
    await clickByText(page, "Enter reset token");
    await fillField(page, "token", "mock-password-reset-token-1234567890");
    await fillField(page, "newPassword", "Student@456");
    await clickByText(page, "Reset password");
    await expectText(page, "Password reset successfully.");
    await clickByText(page, "Back to sign in");
    await signIn(page, "admin@studentportal.local", "Admin@123");
    await expectText(page, "Institution dashboard");
    await expectText(page, "Users");
    await clickByText(page, "Account");
    await expectText(page, "Security");
    await fillField(page, "currentPassword", "Admin@123");
    await fillField(page, "newPassword", "Admin@456");
    await clickByText(page, "Change password");
    await expectText(page, "Password changed successfully.");

    await clickByText(page, "Courses");
    await expectText(page, "Course setup");
    await fillField(page, "courseCode", "E2E102");
    await fillField(page, "courseName", "Browser Tested Systems");
    await fillField(page, "department", "Quality Assurance");
    await fillField(page, "creditValue", "15");
    await fillField(page, "capacity", "3");
    await fillField(
      page,
      "description",
      "Managed through the browser smoke test.",
    );
    await clickByText(page, "Create course");
    await expectText(page, "Course created successfully.");
    await expectText(page, "E2E102");
    await clickButtonNearText(page, "E2E102", "Deactivate");
    await expectText(page, "Course updated successfully.");
    await expectText(page, "Inactive");
    await clickButtonNearText(page, "E2E102", "Activate");
    await expectText(page, "Course updated successfully.");
    await fillField(page, "courseSearch", "E2E102");
    await fillField(page, "courseDepartment", "Quality Assurance");
    await selectField(page, "courseStatus", "active");
    await selectField(page, "courseAvailability", "available");
    await selectField(page, "courseSortBy", "courseCode");
    await selectField(page, "courseSortOrder", "asc");
    await expectText(page, "E2E102");
    await waitForNoText(page, "DEV101");
    await clickByText(page, "Reset filters");
    await expectText(page, "DEV101");
    await clickByText(page, "Results");
    await expectText(page, "Capture result");
    await selectField(page, "enrollmentId", "1");
    await fillField(page, "courseworkMark", "85");
    await fillField(page, "examinationMark", "75");
    await fillField(page, "remarks", "Captured in the browser smoke test.");
    await clickByText(page, "Capture result");
    await expectText(page, "Result captured successfully.");
    await expectText(page, "DEV101");
    await expectText(page, "Draft");
    await clickButtonNearText(page, "DEV101", "Edit");
    await fillField(page, "courseworkMark", "90");
    await fillField(page, "examinationMark", "80");
    await fillField(page, "remarks", "Updated in the browser smoke test.");
    await clickByText(page, "Update result");
    await expectText(page, "Result updated successfully.");
    await clickButtonNearText(page, "DEV101", "Publish");
    await expectText(page, "Result published successfully.");
    await expectText(page, "pass");
    await fillField(page, "search", "DEV101");
    await selectField(page, "publicationStatus", "published");
    await selectField(page, "outcome", "pass");
    await selectField(page, "sortBy", "courseCode");
    await selectField(page, "sortOrder", "asc");
    await expectText(page, "DEV101");
    await clickByText(page, "Reset filters");
    await clickByText(page, "Announcements");
    await expectText(page, "New announcement");
    await fillField(page, "title", "E2E notice");
    await fillField(page, "content", "Created by the browser smoke test.");
    await selectField(page, "targetType", "role");
    await selectField(page, "targetRole", "student");
    await clickByText(page, "Create announcement");
    await expectText(page, "Announcement created successfully.");
    await expectText(page, "E2E notice");
    await expectText(page, "Draft");
    await clickByText(page, "Publish");
    await expectText(page, "Announcement published successfully.");
    await expectText(page, "Published");
    await clickByText(page, "Edit");
    await fillField(page, "title", "E2E updated notice");
    await fillField(page, "content", "Updated by the browser smoke test.");
    await clickByText(page, "Update announcement");
    await expectText(page, "Announcement updated successfully.");
    await expectText(page, "E2E updated notice");
    await expectText(page, "Draft");
    await clickByText(page, "Publish");
    await expectText(page, "Announcement published successfully.");
    await fillField(page, "announcementSearch", "E2E updated");
    await selectField(page, "announcementPublicationStatus", "published");
    await selectField(page, "announcementPriority", "normal");
    await selectField(page, "announcementTargetType", "role");
    await selectField(page, "announcementSortOrder", "asc");
    await expectText(page, "E2E updated notice");
    await waitForNoText(page, "Registration notice");
    await clickByText(page, "Reset filters");
    await expectText(page, "Registration notice");
    await page.evaluate("window.confirm = () => true");
    await clickButtonNearText(page, "E2E updated notice", "Delete");
    await expectText(page, "Announcement deleted successfully.");
    await waitForNoText(page, "E2E updated notice");
    await clickByText(page, "Users");
    await expectText(page, "New student");
    await fillField(page, "firstName", "E2E");
    await fillField(page, "lastName", "Learner");
    await fillField(page, "email", "e2e.learner@studentportal.local");
    await fillField(page, "password", "Student@123");
    await fillField(page, "programme", "Diploma in QA");
    await fillField(page, "yearLevel", "1");
    await clickByText(page, "Create student");
    await expectText(page, "Student account created successfully.");
    await expectText(page, "E2E Learner");
    await clickButtonNearText(page, "E2E Learner", "Edit");
    await fillField(page, "firstName", "E2E Updated");
    await fillField(page, "programme", "Diploma in Testing");
    await clickByText(page, "Update user");
    await expectText(
      page,
      "User account and student profile updated successfully.",
    );
    await expectText(page, "E2E Updated Learner");
    await clickButtonNearText(page, "E2E Updated Learner", "Deactivate");
    await expectText(page, "User account deactivated successfully.");
    await fillField(page, "userSearch", "E2E Updated");
    await selectField(page, "userRole", "student");
    await selectField(page, "userStatus", "inactive");
    await selectField(page, "userSortBy", "lastName");
    await selectField(page, "userSortOrder", "asc");
    await expectText(page, "E2E Updated Learner");
    await waitForNoText(page, "Demo Student");
    await clickByText(page, "Reset filters");
    await expectText(page, "Demo Student");

    await clickByText(page, "Sign out");
    await expectText(page, "Sign in");
    await signIn(page, "student@studentportal.local", "Student@456");
    await expectText(page, "My dashboard");
    await expectNoText(page, "Users");
    await clickByText(page, "Courses");
    await expectText(page, "Academic period");
    await fillField(page, "courseSearch", "E2E102");
    await selectField(page, "courseAvailability", "available");
    await expectText(page, "E2E102");
    await waitForNoText(page, "DEV101");
    await clickButtonNearText(page, "E2E102", "Register");
    await expectText(page, "Course registration completed successfully.");
    await expectText(page, "Registered for 2026 First Semester");
    await clickButtonNearText(page, "E2E102", "Cancel registration");
    await expectText(page, "Course registration cancelled successfully.");
    await clickByText(page, "Reset filters");
    await expectText(page, "DEV101");
    await clickByText(page, "Results");
    await expectText(page, "Published results");
    await selectField(page, "outcome", "pass");
    await expectText(page, "DEV101");
    await clickByText(page, "Announcements");
    await expectText(page, "Registration notice");
    await selectField(page, "announcementPriority", "normal");
    await expectText(page, "Registration notice");
    await selectField(page, "announcementPriority", "urgent");
    await waitForNoText(page, "Registration notice");
    await clickByText(page, "Reset filters");
    await expectText(page, "Registration notice");

    console.log("Browser smoke test passed.");
  } finally {
    await page?.close();
    await stopProcess(browser);
    await stopProcess(web);
    await closeServer(api);

    if (userDataDir) {
      fs.rmSync(userDataDir, {
        force: true,
        maxRetries: 5,
        recursive: true,
        retryDelay: 100,
      });
    }
  }
};

run().catch((error) => {
  const message = error?.stack || error?.message || String(error);

  if (process.env.GITHUB_ACTIONS) {
    console.error(
      `::error title=Browser smoke test failed::${escapeGithubCommandValue(
        message,
      )}`,
    );
  }

  console.error(message);
  process.exit(1);
});
