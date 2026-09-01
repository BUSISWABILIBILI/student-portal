import { useAuth } from "../app/authContext";
import {
  ErrorState,
  PageLoader,
  SectionHeader,
  StatGrid,
} from "../components/ui";
import {
  DashboardAnnouncements,
  DashboardMetricSection,
  RecentResults,
  RecentStudents,
  StudentProfileSummary,
} from "../components/dashboard/DashboardPanels";
import { useApiResource } from "../hooks/useApiResource";

export function DashboardPage() {
  const { user } = useAuth();
  const path =
    user.role === "admin" ? "/dashboard/admin" : "/dashboard/student";
  const { data, error, isLoading } = useApiResource(path, null);

  if (isLoading) {
    return <PageLoader label="Loading dashboard" />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (user.role === "admin") {
    const dashboard = data.dashboard;

    return (
      <>
        <SectionHeader eyebrow="Overview" title="Institution dashboard" />
        <StatGrid
          stats={[
            { label: "Users", value: dashboard.users.total },
            { label: "Students", value: dashboard.users.students },
            { label: "Active courses", value: dashboard.courses.active },
            { label: "Registrations", value: dashboard.enrollments.registered },
            { label: "Published results", value: dashboard.results.published },
            {
              label: "Announcements",
              value: dashboard.announcements.published,
            },
          ]}
        />
        <DashboardMetricSection
          stats={[
            { label: "Administrators", value: dashboard.users.administrators },
            { label: "Active users", value: dashboard.users.active },
            { label: "Inactive users", value: dashboard.users.inactive },
            { label: "Total courses", value: dashboard.courses.total },
            { label: "Inactive courses", value: dashboard.courses.inactive },
            { label: "Course credits", value: dashboard.courses.totalCredits },
          ]}
          title="People and courses"
        />
        <DashboardMetricSection
          stats={[
            { label: "Total enrollments", value: dashboard.enrollments.total },
            { label: "Completed", value: dashboard.enrollments.completed },
            { label: "Cancelled", value: dashboard.enrollments.cancelled },
            { label: "Total results", value: dashboard.results.total },
            { label: "Draft results", value: dashboard.results.draft },
            {
              label: "Average final mark",
              value: dashboard.results.averageFinalMark || 0,
            },
          ]}
          title="Academic operations"
        />
        <DashboardMetricSection
          stats={[
            { label: "Passed results", value: dashboard.results.passed },
            { label: "Failed results", value: dashboard.results.failed },
            {
              label: "Total announcements",
              value: dashboard.announcements.total,
            },
            {
              label: "Draft announcements",
              value: dashboard.announcements.draft,
            },
          ]}
          title="Publishing"
        />
        <RecentStudents students={dashboard.recentStudents} />
      </>
    );
  }

  const dashboard = data.dashboard;

  return (
    <>
      <SectionHeader eyebrow="Overview" title="My dashboard" />
      <StudentProfileSummary student={dashboard.student} />
      <StatGrid
        stats={[
          {
            label: "Registered courses",
            value: dashboard.enrollments.registered,
          },
          { label: "Completed courses", value: dashboard.enrollments.completed },
          { label: "Cancelled courses", value: dashboard.enrollments.cancelled },
          {
            label: "Published results",
            value: dashboard.academicPerformance.publishedResults,
          },
          {
            label: "Passed courses",
            value: dashboard.academicPerformance.passedCourses,
          },
          {
            label: "Failed courses",
            value: dashboard.academicPerformance.failedCourses,
          },
          {
            label: "Earned credits",
            value: dashboard.academicPerformance.earnedCredits,
          },
          {
            label: "Average mark",
            value: dashboard.academicPerformance.averageMark || 0,
          },
          { label: "GPA", value: dashboard.academicPerformance.gpa || 0 },
        ]}
      />
      <RecentResults results={dashboard.recentResults} />
      <DashboardAnnouncements announcements={dashboard.announcements || []} />
    </>
  );
}
