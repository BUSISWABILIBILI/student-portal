USE student_portal;

ALTER TABLE academic_periods
    DROP CHECK chk_registration_dates;

ALTER TABLE academic_periods
    ADD COLUMN name VARCHAR(120) NULL
        AFTER id,
    ADD COLUMN start_date DATE NULL
        AFTER semester,
    ADD COLUMN end_date DATE NULL
        AFTER start_date,
    ADD COLUMN registration_start_date DATE NULL
        AFTER end_date,
    ADD COLUMN registration_end_date DATE NULL
        AFTER registration_start_date,
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT FALSE
        AFTER registration_end_date;

UPDATE academic_periods
SET name = CONCAT(
        academic_year,
        ' ',
        CASE semester
            WHEN 'first' THEN 'Semester 1'
            WHEN 'second' THEN 'Semester 2'
            ELSE 'Full Year'
        END
    ),
    start_date = DATE(registration_open_at),
    end_date = DATE(registration_close_at),
    registration_start_date = DATE(registration_open_at),
    registration_end_date = DATE(registration_close_at),
    is_active = is_current;

ALTER TABLE academic_periods
    MODIFY COLUMN name VARCHAR(120) NOT NULL,
    MODIFY COLUMN start_date DATE NOT NULL,
    MODIFY COLUMN end_date DATE NOT NULL,
    DROP COLUMN registration_open_at,
    DROP COLUMN registration_close_at,
    DROP COLUMN is_current,
    ADD CONSTRAINT chk_academic_period_dates
        CHECK (end_date > start_date),
    ADD CONSTRAINT chk_registration_dates
        CHECK (
            registration_start_date IS NULL
            OR registration_end_date IS NULL
            OR registration_end_date >= registration_start_date
        );
