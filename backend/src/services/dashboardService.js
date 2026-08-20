import AppError from "../utils/AppError.js";

import {
  getAdminDashboardStatistics,
  getStudentDashboardStatistics,
} from "../repositories/dashboardRepository.js";

import { getMyAnnouncements } from "./announcementService.js";

const numberOrZero = (value) => Number(value || 0);

export const getAdminDashboard = async () => {
  const dashboard = await getAdminDashboardStatistics();

  return {
    users: {
      total: numberOrZero(dashboard.users.total_users),

      students: numberOrZero(dashboard.users.total_students),

      administrators: numberOrZero(dashboard.users.total_administrators),

      active: numberOrZero(dashboard.users.active_users),

      inactive: numberOrZero(dashboard.users.inactive_users),
    },

    courses: {
      total: numberOrZero(dashboard.courses.total_courses),

      active: numberOrZero(dashboard.courses.active_courses),

      inactive: numberOrZero(dashboard.courses.inactive_courses),

      totalCredits: numberOrZero(dashboard.courses.total_course_credits),
    },

    enrollments: {
      total: numberOrZero(dashboard.enrollments.total_enrollments),

      registered: numberOrZero(dashboard.enrollments.registered_enrollments),

      completed: numberOrZero(dashboard.enrollments.completed_enrollments),

      cancelled: numberOrZero(dashboard.enrollments.cancelled_enrollments),
    },

    results: {
      total: numberOrZero(dashboard.results.total_results),

      published: numberOrZero(dashboard.results.published_results),

      draft: numberOrZero(dashboard.results.draft_results),

      passed: numberOrZero(dashboard.results.passed_results),

      failed: numberOrZero(dashboard.results.failed_results),

      averageFinalMark:
        dashboard.results.average_final_mark === null
          ? null
          : Number(dashboard.results.average_final_mark),
    },

    announcements: {
      total: numberOrZero(dashboard.announcements.total_announcements),

      published: numberOrZero(dashboard.announcements.published_announcements),

      draft: numberOrZero(dashboard.announcements.draft_announcements),
    },

    recentStudents: dashboard.recentStudents.map((student) => ({
      id: student.id,

      studentNumber: student.student_number,

      firstName: student.first_name,

      lastName: student.last_name,

      fullName: `${student.first_name} ${student.last_name}`,

      email: student.email,

      programme: student.programme,

      joinedAt: student.created_at,
    })),
  };
};

export const getStudentDashboard = async (user) => {
  const dashboard = await getStudentDashboardStatistics(user.id);

  if (!dashboard.profile) {
    throw new AppError("Student profile not found.", 404);
  }

  const announcements = await getMyAnnouncements(user, {
    limit: 5,
  });

  return {
    student: {
      studentProfileId: dashboard.profile.id,

      studentNumber: dashboard.profile.student_number,

      firstName: dashboard.profile.first_name,

      lastName: dashboard.profile.last_name,

      fullName: `${dashboard.profile.first_name} ${dashboard.profile.last_name}`,

      email: dashboard.profile.email,

      programme: dashboard.profile.programme,

      yearLevel: dashboard.profile.year_level,
    },

    enrollments: {
      total: numberOrZero(dashboard.enrollments.total_enrollments),

      registered: numberOrZero(dashboard.enrollments.registered_courses),

      completed: numberOrZero(dashboard.enrollments.completed_courses),

      cancelled: numberOrZero(dashboard.enrollments.cancelled_courses),
    },

    academicPerformance: {
      publishedResults: numberOrZero(dashboard.results.published_results),

      passedCourses: numberOrZero(dashboard.results.passed_courses),

      failedCourses: numberOrZero(dashboard.results.failed_courses),

      earnedCredits: numberOrZero(dashboard.results.earned_credits),

      averageMark:
        dashboard.results.average_mark === null
          ? null
          : Number(dashboard.results.average_mark),

      gpa:
        dashboard.results.gpa === null ? null : Number(dashboard.results.gpa),
    },

    recentResults: dashboard.recentResults.map((result) => ({
      id: result.id,

      finalMark: Number(result.final_mark),

      grade: result.grade,

      outcome: result.outcome,

      publishedAt: result.published_at,

      course: {
        courseCode: result.course_code,

        courseName: result.course_name,

        creditValue: Number(result.credit_value),
      },
    })),

    announcements,
  };
};
