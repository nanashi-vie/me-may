CREATE TABLE attendance_period_note (
    employee_id BIGINT NOT NULL REFERENCES employee_profile(id),
    period VARCHAR(5) NOT NULL CHECK (period IN ('WEEK', 'MONTH')),
    period_start DATE NOT NULL,
    note_text VARCHAR(500) NOT NULL,
    PRIMARY KEY (period, period_start, employee_id)
);
