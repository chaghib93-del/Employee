-- DANGER: deletes every table, view and function of the Employee Dashboard.
-- Use only on a development database, then run schema.sql again.
BEGIN;
DROP VIEW IF EXISTS v_family_quota_stats, v_phase_stats, v_employee_verification;
DROP FUNCTION IF EXISTS delete_completed_phase(uuid, uuid), reopen_phase(uuid, uuid), complete_phase(uuid, uuid);
DROP TABLE IF EXISTS audit_log, app_settings, messages, files, documents, notices,
                     family_quota_applications, employees, phase_districts, phases, users, districts CASCADE;
DROP FUNCTION IF EXISTS employees_auto_status(), employees_guard_update(), employees_guard_insert(),
                        phases_for_district(text), phase_covers(uuid, text), set_updated_at();
COMMIT;
