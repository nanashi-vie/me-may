CREATE TABLE employee_profile (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(160) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    phone VARCHAR(32),
    started_on DATE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    admin_user_id BIGINT UNIQUE REFERENCES admin_user(id) ON DELETE SET NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE employee_pin_credential (
    employee_id BIGINT PRIMARY KEY REFERENCES employee_profile(id),
    pin_hash VARCHAR(100) NOT NULL,
    revision BIGINT NOT NULL DEFAULT 0,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    failures INTEGER NOT NULL DEFAULT 0,
    blocked_until TIMESTAMPTZ
);

CREATE TABLE attendance_week (
    week_start_date DATE PRIMARY KEY CHECK (EXTRACT(ISODOW FROM week_start_date) = 1),
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employee_weekly_schedule (
    employee_id BIGINT NOT NULL REFERENCES employee_profile(id),
    week_start_date DATE NOT NULL REFERENCES attendance_week(week_start_date),
    day_mask SMALLINT NOT NULL CHECK (day_mask BETWEEN 1 AND 127),
    PRIMARY KEY (employee_id, week_start_date)
);

CREATE TABLE attendance_session (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employee_profile(id),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    original_started_at TIMESTAMPTZ NOT NULL,
    original_ended_at TIMESTAMPTZ,
    is_out_of_schedule BOOLEAN NOT NULL,
    start_request UUID NOT NULL UNIQUE,
    end_request UUID UNIQUE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE UNIQUE INDEX attendance_one_open_session
    ON attendance_session(employee_id) WHERE ended_at IS NULL;
CREATE INDEX attendance_session_start_idx ON attendance_session(started_at);

CREATE TABLE attendance_audit_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES attendance_session(id),
    actor_email VARCHAR(254) NOT NULL,
    old_started_at TIMESTAMPTZ NOT NULL,
    old_ended_at TIMESTAMPTZ,
    new_started_at TIMESTAMPTZ NOT NULL,
    new_ended_at TIMESTAMPTZ,
    reason VARCHAR(500) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX attendance_audit_session_idx ON attendance_audit_log(session_id, id);
