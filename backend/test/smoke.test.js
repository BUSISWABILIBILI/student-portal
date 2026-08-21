import "dotenv/config";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import app from "../src/app.js";
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from "../src/validators/announcementValidators.js";
import {
  changePasswordSchema,
  createUserSchema,
  loginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "../src/validators/authValidators.js";
import {
  createCourseSchema,
  listCoursesSchema,
  registerCourseSchema,
} from "../src/validators/courseValidators.js";
import { listEnrollmentsSchema } from "../src/validators/enrollmentValidators.js";
import {
  captureResultSchema,
  listResultsSchema,
} from "../src/validators/resultValidators.js";
import {
  createStudentSchema,
  listUsersSchema,
} from "../src/validators/userValidators.js";
import formatUser from "../src/utils/formatUser.js";
import { createReadinessCheck } from "../src/controllers/healthController.js";
import { validateEnvironment } from "../src/config/environment.js";

const expectValid = (schema, input) => {
  const result = schema.safeParse(input);

  assert.equal(
    result.success,
    true,
    result.success ? undefined : JSON.stringify(result.error.issues),
  );

  return result.data;
};

const expectInvalid = (schema, input) => {
  const result = schema.safeParse(input);

  assert.equal(result.success, false);

  return result.error.issues;
};

const createResponse = () => {
  const response = {
    body: undefined,
    statusCode: undefined,
    json(payload) {
      this.body = payload;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
  };

  return response;
};

const validEnvironment = {
  NODE_ENV: "production",
  PORT: "5000",
  CLIENT_URL: "https://portal.example.edu",
  DB_HOST: "mysql.internal.example.edu",
  DB_PORT: "3306",
  DB_USER: "student_portal_app",
  DB_PASSWORD: "secret",
  DB_NAME: "student_portal",
  JWT_SECRET: "a-production-secret-with-at-least-32-characters",
  JWT_EXPIRES_IN: "1d",
};

describe("backend smoke checks", () => {
  it("imports the Express app and mounted routes", () => {
    assert.equal(typeof app.listen, "function");
    assert.equal(typeof app.use, "function");
  });

  it("reports readiness based on database connectivity", async () => {
    const readyResponse = createResponse();
    const readyHandler = createReadinessCheck({
      checkDatabase: async () => {},
    });

    await readyHandler({}, readyResponse);

    assert.equal(readyResponse.statusCode, 200);
    assert.equal(readyResponse.body.success, true);
    assert.equal(readyResponse.body.status, "ready");
    assert.equal(readyResponse.body.checks.database, "up");

    const failedResponse = createResponse();
    const failedHandler = createReadinessCheck({
      checkDatabase: async () => {
        throw new Error("Database unavailable.");
      },
    });

    await failedHandler({}, failedResponse);

    assert.equal(failedResponse.statusCode, 503);
    assert.equal(failedResponse.body.success, false);
    assert.equal(failedResponse.body.status, "not_ready");
    assert.equal(failedResponse.body.checks.database, "down");
  });

  it("validates environment configuration", () => {
    assert.doesNotThrow(() => validateEnvironment(validEnvironment));

    assert.throws(
      () =>
        validateEnvironment({
          ...validEnvironment,
          DB_HOST: "",
        }),
      /Missing environment variables: DB_HOST/,
    );

    assert.throws(
      () =>
        validateEnvironment({
          ...validEnvironment,
          PORT: "70000",
        }),
      /PORT must be an integer between 1 and 65535/,
    );

    assert.throws(
      () =>
        validateEnvironment({
          ...validEnvironment,
          CLIENT_URL: "https://portal.example.edu/app",
        }),
      /CLIENT_URL must be an origin/,
    );

    assert.throws(
      () =>
        validateEnvironment({
          ...validEnvironment,
          JWT_EXPIRES_IN: "soon",
        }),
      /JWT_EXPIRES_IN must be a duration/,
    );

    assert.throws(
      () =>
        validateEnvironment({
          ...validEnvironment,
          JWT_SECRET: "replace_with_a_long_random_secret",
        }),
      /JWT_SECRET must be at least 32 characters/,
    );
  });

  it("parses authentication payloads", () => {
    const login = expectValid(loginSchema, {
      body: {
        email: "ADMIN@EXAMPLE.COM",
        password: "Admin@123",
      },
      params: {},
      query: {},
    });

    assert.equal(login.body.email, "admin@example.com");

    expectValid(createUserSchema, {
      body: {
        firstName: "Demo",
        lastName: "Student",
        email: "student@example.com",
        password: "Student@123",
        role: "student",
      },
      params: {},
      query: {},
    });

    expectValid(changePasswordSchema, {
      body: {
        currentPassword: "Admin@123",
        newPassword: "Admin@456",
      },
      params: {},
      query: {},
    });

    expectValid(requestPasswordResetSchema, {
      body: {
        email: "student@example.com",
      },
      params: {},
      query: {},
    });

    expectValid(resetPasswordSchema, {
      body: {
        token:
          "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        newPassword: "Student@456",
      },
      params: {},
      query: {},
    });
  });

  it("parses user management payloads", () => {
    expectValid(listUsersSchema, {
      body: {},
      params: {},
      query: {},
    });

    expectValid(createStudentSchema, {
      body: {
        firstName: "Demo",
        lastName: "Student",
        email: "student@example.com",
        password: "Student@123",
        programme: "Diploma in Information Technology",
        yearLevel: 2,
      },
      params: {},
      query: {},
    });

    const formattedUser = formatUser({
      id: 1,
      first_name: "Demo",
      last_name: "Student",
      email: "student@example.com",
      role: "student",
      is_active: true,
      student_profile_id: 7,
      student_number: "STU20260001",
      programme: "Diploma in Information Technology",
      year_level: 2,
    });

    assert.equal(formattedUser.studentProfile.id, 7);
  });

  it("parses course and enrollment payloads", () => {
    const course = expectValid(createCourseSchema, {
      body: {
        courseCode: " dev101 ",
        courseName: "Introduction to Software Development",
        department: "Information Technology",
      },
      params: {},
      query: {},
    });

    assert.equal(course.body.courseCode, "DEV101");
    assert.equal(course.body.creditValue, 12);
    assert.equal(course.body.capacity, 50);

    expectValid(listCoursesSchema, {
      body: {},
      params: {},
      query: {},
    });

    expectValid(registerCourseSchema, {
      body: {
        courseId: "1",
        academicPeriodId: "1",
      },
      params: {},
      query: {},
    });

    const enrollments = expectValid(listEnrollmentsSchema, {
      body: {},
      params: {},
      query: {
        resultStatus: "pending",
        sortBy: "studentName",
      },
    });

    assert.equal(enrollments.query.resultStatus, "pending");
    assert.equal(enrollments.query.limit, 25);
  });

  it("parses result payloads", () => {
    expectValid(captureResultSchema, {
      body: {
        enrollmentId: "1",
        courseworkMark: "75",
        examinationMark: "80",
      },
      params: {},
      query: {},
    });

    expectValid(listResultsSchema, {
      body: {},
      params: {},
      query: {
        publicationStatus: "published",
      },
    });
  });

  it("parses announcement payloads without import-time refinement crashes", () => {
    expectValid(createAnnouncementSchema, {
      body: {
        title: "Registration notice",
        content: "Registration is open for the active academic period.",
        targetType: "role",
        targetRole: "student",
      },
      params: {},
      query: {},
    });

    expectValid(updateAnnouncementSchema, {
      body: {
        title: "Updated registration notice",
      },
      params: {
        announcementId: "1",
      },
      query: {},
    });

    const issues = expectInvalid(createAnnouncementSchema, {
      body: {
        title: "Registration notice",
        content: "Registration is open for the active academic period.",
        targetType: "role",
      },
      params: {},
      query: {},
    });

    assert.equal(issues[0].path.join("."), "body.targetRole");
  });
});
