USE student_portal;

INSERT INTO academic_periods (
    name,
    academic_year,
    semester,
    start_date,
    end_date,
    registration_start_date,
    registration_end_date,
    is_active
)
VALUES (
    '2026 Semester 2',
    2026,
    'second',
    '2026-07-01',
    '2026-11-30',
    '2026-07-01',
    '2026-11-30',
    TRUE
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    start_date = VALUES(start_date),
    end_date = VALUES(end_date),
    registration_start_date = VALUES(registration_start_date),
    registration_end_date = VALUES(registration_end_date),
    is_active = VALUES(is_active);

INSERT INTO courses (
    course_code,
    course_name,
    description,
    department,
    credit_value,
    capacity,
    is_active
)
VALUES
(
    'DEV101',
    'Introduction to Software Development',
    'Introduces programming principles and problem solving.',
    'Information Technology',
    15.00,
    120,
    TRUE
),
(
    'DBS201',
    'Database Systems',
    'Relational database design, SQL and data management.',
    'Information Technology',
    15.00,
    100,
    TRUE
),
(
    'WEB301',
    'Advanced Web Development',
    'Full-stack application development using modern web technologies.',
    'Information Technology',
    20.00,
    80,
    TRUE
),
(
    'SEN301',
    'Software Engineering',
    'Software architecture, testing and project management.',
    'Computer Science',
    20.00,
    80,
    TRUE
)
ON DUPLICATE KEY UPDATE
    course_name = VALUES(course_name),
    description = VALUES(description),
    department = VALUES(department),
    credit_value = VALUES(credit_value),
    capacity = VALUES(capacity),
    is_active = VALUES(is_active);
