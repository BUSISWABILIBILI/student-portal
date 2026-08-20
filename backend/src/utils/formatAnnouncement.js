const formatAnnouncement = (announcement) => {
  if (!announcement) {
    return null;
  }

  const targetStudent = announcement.target_student_id
    ? {
        id: announcement.target_student_id,

        studentNumber: announcement.target_student_number,

        firstName: announcement.target_student_first_name,

        lastName: announcement.target_student_last_name,

        fullName: `${announcement.target_student_first_name} ${announcement.target_student_last_name}`,
      }
    : null;

  return {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,

    targetType: announcement.target_type,

    targetRole: announcement.target_role || null,

    targetStudent,

    priority: announcement.priority,

    publicationStatus: announcement.publication_status,

    publishAt: announcement.publish_at || null,

    expiresAt: announcement.expires_at || null,

    createdBy: {
      id: announcement.created_by,

      firstName: announcement.creator_first_name,

      lastName: announcement.creator_last_name,

      fullName: `${announcement.creator_first_name} ${announcement.creator_last_name}`,
    },

    createdAt: announcement.created_at,

    updatedAt: announcement.updated_at,
  };
};

export default formatAnnouncement;
