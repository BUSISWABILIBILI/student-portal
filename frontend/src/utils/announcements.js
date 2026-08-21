export function formatAnnouncementDate(value) {
  if (!value) {
    return "not scheduled";
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getAnnouncementTargetLabel(announcement) {
  if (announcement.targetType === "all") {
    return "Everyone";
  }

  if (announcement.targetType === "role") {
    return announcement.targetRole === "admin" ? "Administrators" : "Students";
  }

  if (announcement.targetStudent) {
    return announcement.targetStudent.fullName;
  }

  return "Targeted";
}

export function getAnnouncementPillClass(announcement) {
  if (announcement.priority === "urgent") {
    return "pill danger-pill";
  }

  if (announcement.priority === "high") {
    return "pill warning-pill";
  }

  if (announcement.priority === "low") {
    return "pill muted-pill";
  }

  return "pill";
}
