USE student_portal;

ALTER TABLE results
    DROP CHECK chk_assessment_mark,
    DROP CHECK chk_exam_mark,
    DROP CHECK chk_final_mark;

ALTER TABLE results
    CHANGE COLUMN assessment_mark coursework_mark DECIMAL(5,2) NULL,
    CHANGE COLUMN exam_mark examination_mark DECIMAL(5,2) NULL,
    ADD COLUMN grade_point DECIMAL(3,2) NULL
        AFTER grade,
    ADD COLUMN outcome ENUM(
        'pass',
        'fail',
        'incomplete'
    ) NOT NULL DEFAULT 'incomplete'
        AFTER grade_point,
    ADD COLUMN publication_status ENUM(
        'draft',
        'published'
    ) NOT NULL DEFAULT 'draft'
        AFTER outcome,
    ADD COLUMN remarks VARCHAR(500) NULL
        AFTER publication_status,
    ADD COLUMN captured_by INT UNSIGNED NULL
        AFTER remarks,
    MODIFY COLUMN published_at TIMESTAMP NULL
        AFTER captured_by,
    MODIFY COLUMN updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    ADD CONSTRAINT fk_results_captured_by
        FOREIGN KEY (captured_by)
        REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    ADD CONSTRAINT chk_coursework_mark
        CHECK (
            coursework_mark IS NULL
            OR coursework_mark BETWEEN 0 AND 100
        ),
    ADD CONSTRAINT chk_examination_mark
        CHECK (
            examination_mark IS NULL
            OR examination_mark BETWEEN 0 AND 100
        ),
    ADD CONSTRAINT chk_final_mark
        CHECK (
            final_mark IS NULL
            OR final_mark BETWEEN 0 AND 100
        ),
    ADD CONSTRAINT chk_grade_point
        CHECK (
            grade_point IS NULL
            OR grade_point BETWEEN 0 AND 4
        );

UPDATE results
SET outcome = CASE status
        WHEN 'passed' THEN 'pass'
        WHEN 'failed' THEN 'fail'
        ELSE 'incomplete'
    END,
    publication_status = CASE
        WHEN published_at IS NULL THEN 'draft'
        ELSE 'published'
    END;

ALTER TABLE results
    DROP COLUMN status;

CREATE INDEX idx_results_status
    ON results(publication_status);

CREATE INDEX idx_results_outcome
    ON results(outcome);

CREATE INDEX idx_results_final_mark
    ON results(final_mark);
