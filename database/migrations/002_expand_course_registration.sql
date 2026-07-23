USE student_portal;

ALTER TABLE courses
    ADD COLUMN department VARCHAR(120) NULL AFTER description,
    ADD COLUMN credit_value DECIMAL(5,2) NOT NULL DEFAULT 12.00
        AFTER department,
    ADD COLUMN capacity INT UNSIGNED NOT NULL DEFAULT 50
        AFTER credit_value,
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE
        AFTER capacity,
    ADD COLUMN created_by BIGINT UNSIGNED NULL
        AFTER is_active,
    ADD COLUMN updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
        AFTER created_at,
    ADD CONSTRAINT fk_courses_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE SET NULL;

ALTER TABLE enrollments
    ADD COLUMN academic_period_id BIGINT UNSIGNED NULL
        AFTER course_id,
    ADD COLUMN status ENUM(
        'registered',
        'cancelled',
        'completed'
    ) NOT NULL DEFAULT 'registered'
        AFTER academic_period_id,
    ADD COLUMN registered_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        AFTER status,
    ADD COLUMN cancelled_at TIMESTAMP NULL
        AFTER registered_at,
    ADD COLUMN updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
        AFTER cancelled_at,
    ADD CONSTRAINT fk_enrollments_academic_period
        FOREIGN KEY (academic_period_id)
        REFERENCES academic_periods(id)
        ON DELETE RESTRICT;

CREATE UNIQUE INDEX uq_active_student_course_period
    ON enrollments (
        student_id,
        course_id,
        academic_period_id
    );

CREATE INDEX idx_courses_code
    ON courses(course_code);

CREATE INDEX idx_courses_active
    ON courses(is_active);

CREATE INDEX idx_enrollments_status
    ON enrollments(status);