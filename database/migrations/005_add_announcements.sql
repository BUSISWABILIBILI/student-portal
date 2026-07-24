USE student_portal;

ALTER TABLE announcements
    DROP FOREIGN KEY fk_announcements_author;

ALTER TABLE announcements
    DROP INDEX fk_announcements_author;

ALTER TABLE announcements
    CHANGE COLUMN author_id created_by INT UNSIGNED NOT NULL,
    CHANGE COLUMN published_at publish_at TIMESTAMP NULL,
    MODIFY COLUMN title VARCHAR(150) NOT NULL,
    MODIFY COLUMN expires_at TIMESTAMP NULL,
    ADD COLUMN target_type ENUM(
        'all',
        'role',
        'student'
    ) NOT NULL DEFAULT 'all'
        AFTER content,
    ADD COLUMN target_role ENUM(
        'admin',
        'student'
    ) NULL
        AFTER target_type,
    ADD COLUMN target_student_id INT UNSIGNED NULL
        AFTER target_role,
    ADD COLUMN priority ENUM(
        'low',
        'normal',
        'high',
        'urgent'
    ) NOT NULL DEFAULT 'normal'
        AFTER target_student_id,
    ADD COLUMN publication_status ENUM(
        'draft',
        'published'
    ) NOT NULL DEFAULT 'draft'
        AFTER priority;

UPDATE announcements
SET target_type = CASE audience
        WHEN 'admins' THEN 'role'
        WHEN 'students' THEN 'role'
        ELSE 'all'
    END,
    target_role = CASE audience
        WHEN 'admins' THEN 'admin'
        WHEN 'students' THEN 'student'
        ELSE NULL
    END,
    publication_status = CASE
        WHEN is_published = TRUE THEN 'published'
        ELSE 'draft'
    END,
    publish_at = CASE
        WHEN is_published = TRUE
            AND publish_at IS NULL
            THEN created_at
        ELSE publish_at
    END;

ALTER TABLE announcements
    DROP COLUMN audience,
    DROP COLUMN is_published,
    MODIFY COLUMN created_by INT UNSIGNED NOT NULL
        AFTER expires_at,
    ADD CONSTRAINT fk_announcements_student
        FOREIGN KEY (target_student_id)
        REFERENCES student_profiles(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    ADD CONSTRAINT fk_announcements_creator
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE;

CREATE INDEX idx_announcements_status
    ON announcements(publication_status);

CREATE INDEX idx_announcements_target_type
    ON announcements(target_type);

CREATE INDEX idx_announcements_target_role
    ON announcements(target_role);

CREATE INDEX idx_announcements_target_student
    ON announcements(target_student_id);

CREATE INDEX idx_announcements_publish_at
    ON announcements(publish_at);

CREATE INDEX idx_announcements_expires_at
    ON announcements(expires_at);
