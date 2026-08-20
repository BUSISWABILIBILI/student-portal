USE student_portal;

ALTER TABLE courses
    DROP CHECK chk_course_credits,
    DROP CHECK chk_course_year_level;

ALTER TABLE courses
    CHANGE COLUMN credits credit_value DECIMAL(5,2) NOT NULL DEFAULT 12.00,
    MODIFY COLUMN department VARCHAR(150) NOT NULL,
    MODIFY COLUMN capacity INT UNSIGNED NOT NULL DEFAULT 50,
    DROP COLUMN semester,
    DROP COLUMN year_level,
    ADD COLUMN created_by INT UNSIGNED NULL
        AFTER is_active,
    ADD CONSTRAINT fk_courses_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    ADD CONSTRAINT chk_course_credit_value
        CHECK (credit_value BETWEEN 1 AND 120),
    ADD CONSTRAINT chk_course_capacity
        CHECK (capacity > 0);

ALTER TABLE enrollments
    DROP FOREIGN KEY fk_enrollments_student;

UPDATE enrollments AS e
INNER JOIN student_profiles AS sp
    ON sp.user_id = e.student_id
SET e.student_id = sp.id;

ALTER TABLE enrollments
    MODIFY COLUMN student_id INT UNSIGNED NOT NULL,
    MODIFY COLUMN academic_period_id INT UNSIGNED NOT NULL,
    MODIFY COLUMN status ENUM(
        'registered',
        'cancelled',
        'completed'
    ) NOT NULL DEFAULT 'registered',
    ADD COLUMN cancelled_at TIMESTAMP NULL
        AFTER registered_at,
    ADD CONSTRAINT fk_enrollments_student
        FOREIGN KEY (student_id)
        REFERENCES student_profiles(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE;

CREATE INDEX idx_courses_active
    ON courses(is_active);

CREATE INDEX idx_enrollments_status
    ON enrollments(status);
