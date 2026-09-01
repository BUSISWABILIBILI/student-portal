import { EmptyState, StatGrid } from "../ui";
import {
  formatAnnouncementDate,
  getAnnouncementPillClass,
  getAnnouncementTargetLabel,
} from "../../utils/announcements";

export function DashboardMetricSection({ title, stats }) {
  return (
    <section className="dashboard-section">
      <h2>{title}</h2>
      <StatGrid stats={stats} />
    </section>
  );
}

export function StudentProfileSummary({ student }) {
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

export function RecentStudents({ students }) {
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

export function RecentResults({ results }) {
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

export function DashboardAnnouncements({ announcements }) {
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
