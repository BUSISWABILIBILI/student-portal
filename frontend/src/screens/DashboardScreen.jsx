import { useAuth } from "../app/authContext";
import {
  EmptyState,
  ErrorState,
  PageLoader,
  SectionHeader,
  StatGrid,
} from "../components/ui";
import { useApiResource } from "../hooks/useApiResource";
import {
  formatAnnouncementDate,
  getAnnouncementPillClass,
  getAnnouncementTargetLabel,
} from "../utils/announcements";

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

function DashboardMetricSection({ title, stats }) {
  return (
    <section className="dashboard-section">
      <h2>{title}</h2>
      <StatGrid stats={stats} />
    </section>
  );
}

function StudentProfileSummary({ student }) {
  return (
    <section className="data-section profile-summary">
      <div>
        <p className="eyebrow">Student profile</p>
        <h2>{student.fullName}</h2>
        <p className="muted">{student.email}</p>
      </div>
      <div className="profile-meta-grid">
        <div>
          <span>Student number</span>
          <strong>{student.studentNumber}</strong>
        </div>
        <div>
          <span>Programme</span>
          <strong>{student.programme}</strong>
        </div>
        <div>
          <span>Year level</span>
          <strong>{student.yearLevel}</strong>
        </div>
      </div>
    </section>
  );
}

function RecentStudents({ students }) {
  if (!students.length) {
    return (
      <EmptyState
        title="No recent students"
        message="Student activity will appear here as accounts are created."
      />
    );
  }

  return (
    <section className="data-section">
      <h2>Recent students</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Student number</th>
              <th>Programme</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.fullName}</td>
                <td>{student.studentNumber}</td>
                <td>{student.programme}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RecentResults({ results }) {
  if (!results.length) {
    return (
      <EmptyState
        title="No published results"
        message="Published academic results will appear here."
      />
    );
  }

  return (
    <section className="data-section">
      <h2>Recent results</h2>
      <div className="item-list">
        {results.map((result) => (
          <article className="list-item" key={result.id}>
            <div>
              <strong>{result.course.courseCode}</strong>
              <span>{result.course.courseName}</span>
            </div>
            <span className="pill">{result.finalMark}%</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function DashboardAnnouncements({ announcements }) {
  if (!announcements.length) {
    return (
      <EmptyState
        title="No recent announcements"
        message="Published announcements will appear here."
      />
    );
  }

  return (
    <section className="dashboard-section">
      <h2>Recent announcements</h2>
      <div className="item-list">
        {announcements.map((announcement) => (
          <article
            className="list-item announcement announcement-list-item"
            key={announcement.id}
          >
            <div className="announcement-main">
              <div className="announcement-heading">
                <strong>{announcement.title}</strong>
                <span className={getAnnouncementPillClass(announcement)}>
                  {announcement.priority}
                </span>
              </div>
              <span>{announcement.content}</span>
              <div className="announcement-meta">
                <span>{getAnnouncementTargetLabel(announcement)}</span>
                <span>
                  Published {formatAnnouncementDate(announcement.publishAt)}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
