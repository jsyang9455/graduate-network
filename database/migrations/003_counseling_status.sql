-- Migration: extend counseling_sessions.status to include pending/approved/rejected
ALTER TABLE counseling_sessions DROP CONSTRAINT IF EXISTS counseling_sessions_status_check;

ALTER TABLE counseling_sessions
  ADD CONSTRAINT counseling_sessions_status_check
  CHECK (status IN ('scheduled','completed','cancelled','no-show','pending','approved','rejected'));
