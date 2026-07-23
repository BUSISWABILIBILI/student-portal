USE student_portal;

ALTER TABLE academic_periods
    ADD COLUMN registration_start_date DATE NULL
        AFTER end_date,
    ADD COLUMN registration_end_date DATE NULL
        AFTER registration_start_date,
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT FALSE
        AFTER registration_end_date;