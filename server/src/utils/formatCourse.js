const formatCourse = (course) => {
  if (!course) {
    return null;
  }

  const enrolledCount = Number(course.enrolled_count || 0);

  const capacity = Number(course.capacity || 0);

  return {
    id: course.id,
    courseCode: course.course_code,
    courseName: course.course_name,
    description: course.description || null,
    department: course.department || null,
    creditValue: Number(course.credit_value),
    capacity,
    enrolledCount,
    availablePlaces: Math.max(capacity - enrolledCount, 0),
    isFull: capacity > 0 && enrolledCount >= capacity,
    isActive: Boolean(course.is_active),
    createdBy: course.created_by || null,
    createdAt: course.created_at || null,
    updatedAt: course.updated_at || null,
  };
};

export default formatCourse;
