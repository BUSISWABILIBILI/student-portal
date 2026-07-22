DROP DATABASE IF EXISTS student_portal;

CREATE DATABASE student_portal
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE student_portal;

CREATE TABLE users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student') NOT NULL DEFAULT 'student',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
);

CREATE TABLE student_profiles (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    student_number VARCHAR(20) NOT NULL,
    date_of_birth DATE NULL,
    gender ENUM('female', 'male', 'other', 'prefer_not_to_say') NULL,
    phone_number VARCHAR(30) NULL,
    address_line VARCHAR(200) NULL,
    city VARCHAR(100) NULL,
    province VARCHAR(100) NULL,
    postal_code VARCHAR(20) NULL,
    programme VARCHAR(150) NOT NULL,
    year_level TINYINT UNSIGNED NOT NULL DEFAULT 1,
    profile_image_url VARCHAR(500) NULL,
    admission_date DATE NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_student_profiles_user (user_id),
    UNIQUE KEY uq_student_profiles_number (student_number),

    CONSTRAINT fk_student_profiles_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT chk_student_year_level
        CHECK (year_level BETWEEN 1 AND 10)
);

CREATE TABLE courses (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    course_code VARCHAR(20) NOT NULL,
    course_name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    credits TINYINT UNSIGNED NOT NULL,
    department VARCHAR(150) NOT NULL,
    semester ENUM('first', 'second', 'year') NOT NULL,
    year_level TINYINT UNSIGNED NOT NULL,
    capacity SMALLINT UNSIGNED NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_courses_code (course_code),

    CONSTRAINT chk_course_credits
        CHECK (credits BETWEEN 1 AND 120),

    CONSTRAINT chk_course_year_level
        CHECK (year_level BETWEEN 1 AND 10)
);

CREATE TABLE academic_periods (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    academic_year YEAR NOT NULL,
    semester ENUM('first', 'second', 'year') NOT NULL,
    registration_open_at DATETIME NOT NULL,
    registration_close_at DATETIME NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_academic_period (
        academic_year,
        semester
    ),

    CONSTRAINT chk_registration_dates
        CHECK (registration_close_at > registration_open_at)
);

CREATE TABLE student_number_sequences (
    academic_year YEAR NOT NULL,
    last_number INT UNSIGNED NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (academic_year)
);

CREATE TABLE enrollments (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    student_id INT UNSIGNED NOT NULL,
    course_id INT UNSIGNED NOT NULL,
    academic_period_id INT UNSIGNED NOT NULL,
    status ENUM(
        'registered',
        'completed',
        'cancelled'
    ) NOT NULL DEFAULT 'registered',
    registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_enrollment (
        student_id,
        course_id,
        academic_period_id
    ),

    KEY idx_enrollments_student (student_id),
    KEY idx_enrollments_course (course_id),

    CONSTRAINT fk_enrollments_student
        FOREIGN KEY (student_id)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_enrollments_course
        FOREIGN KEY (course_id)
        REFERENCES courses(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_enrollments_period
        FOREIGN KEY (academic_period_id)
        REFERENCES academic_periods(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE TABLE results (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    enrollment_id INT UNSIGNED NOT NULL,
    assessment_mark DECIMAL(5, 2) NULL,
    exam_mark DECIMAL(5, 2) NULL,
    final_mark DECIMAL(5, 2) NULL,
    grade VARCHAR(5) NULL,
    status ENUM(
        'pending',
        'passed',
        'failed',
        'supplementary'
    ) NOT NULL DEFAULT 'pending',
    published_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_results_enrollment (enrollment_id),

    CONSTRAINT fk_results_enrollment
        FOREIGN KEY (enrollment_id)
        REFERENCES enrollments(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT chk_assessment_mark
        CHECK (
            assessment_mark IS NULL
            OR assessment_mark BETWEEN 0 AND 100
        ),

    CONSTRAINT chk_exam_mark
        CHECK (
            exam_mark IS NULL
            OR exam_mark BETWEEN 0 AND 100
        ),

    CONSTRAINT chk_final_mark
        CHECK (
            final_mark IS NULL
            OR final_mark BETWEEN 0 AND 100
        )
);

CREATE TABLE announcements (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    author_id INT UNSIGNED NOT NULL,
    title VARCHAR(180) NOT NULL,
    content TEXT NOT NULL,
    audience ENUM(
        'all',
        'students',
        'admins'
    ) NOT NULL DEFAULT 'all',
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    published_at DATETIME NULL,
    expires_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_announcements_author
        FOREIGN KEY (author_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE TABLE refresh_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_refresh_token_hash (token_hash),
    KEY idx_refresh_tokens_user (user_id),

    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE audit_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NULL,
    action VARCHAR(120) NOT NULL,
    entity_type VARCHAR(80) NULL,
    entity_id VARCHAR(80) NULL,
    metadata JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_audit_logs_user (user_id),
    KEY idx_audit_logs_action (action),

    CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);