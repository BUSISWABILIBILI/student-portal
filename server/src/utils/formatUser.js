const formatDate = (value) => value || null;

const formatUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: `${user.first_name} ${user.last_name}`,
    email: user.email,
    role: user.role,
    isActive: Boolean(user.is_active),
    lastLoginAt: formatDate(user.last_login_at),
    createdAt: formatDate(user.created_at),
    updatedAt: formatDate(user.updated_at),

    studentProfile:
      user.role === "student"
        ? {
            studentNumber: user.student_number || null,
            dateOfBirth: formatDate(user.date_of_birth),
            gender: user.gender || null,
            phoneNumber: user.phone_number || null,
            addressLine: user.address_line || null,
            city: user.city || null,
            province: user.province || null,
            postalCode: user.postal_code || null,
            programme: user.programme || null,
            yearLevel: user.year_level || null,
            profileImageUrl: user.profile_image_url || null,
            admissionDate: formatDate(user.admission_date),
          }
        : null,
  };
};

export default formatUser;
