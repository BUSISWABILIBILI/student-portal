import "dotenv/config";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import app from "../src/app.js";
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from "../src/validators/announcementValidators.js";
import {
  createUserSchema,
  loginSchema,
} from "../src/validators/authValidators.js";
import {
  createCourseSchema,
  listCoursesSchema,
  registerCourseSchema,
} from "../src/validators/courseValidators.js";
import {
  captureResultSchema,
  listResultsSchema,
} from "../src/validators/resultValidators.js";
import {
  createStudentSchema,
  listUsersSchema,
} from "../src/validators/userValidators.js";

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

describe("server smoke checks", () => {
  it("imports the Express app and mounted routes", () => {
    assert.equal(typeof app.listen, "function");
    assert.equal(typeof app.use, "function");
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
