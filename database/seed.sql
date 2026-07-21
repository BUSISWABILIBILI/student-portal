USE student_portal;

INSERT INTO academic_periods (
    academic_year,
    semester,
    registration_open_at,
    registration_close_at,
    is_current
)
VALUES (
    2026,
    'second',
    '2026-07-01 08:00:00',
    '2026-08-15 23:59:59',
    TRUE
);

INSERT INTO courses (
    course_code,
    course_name,
    description,
    credits,
    department,
    semester,
    year_level,
    capacity
)
VALUES
(
    'DEV101',
    'Introduction to Software Development',
    'Introduces programming principles and problem solving.',
    15,
    'Information Technology',
    'first',
    1,
    120
),
(
    'DBS201',
    'Database Systems',
    'Relational database design, SQL and data management.',
    15,
    'Information Technology',
    'second',
    2,
    100
),
(
    'WEB301',
    'Advanced Web Development',
    'Full-stack application development using modern web technologies.',
    20,
    'Information Technology',
    'second',
    3,
    80
),
(
    'SEN301',
    'Software Engineering',
    'Software architecture, testing and project management.',
    20,
    'Computer Science',
    'year',
    3,
    80
);