USE student_portal;

CREATE TABLE IF NOT EXISTS student_number_sequences (
    academic_year YEAR NOT NULL,
    last_number INT UNSIGNED NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (academic_year)
);