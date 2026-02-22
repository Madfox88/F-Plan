-- ============================================================
-- F-Plan: Dashboard Truth Layer Migration
-- ============================================================
-- This migration adds the schema elements required by:
--   - TASK_OWNERSHIP_RULES.md (assigned_to)
--   - TASK_TEMPORAL_TRUTH_RULES.md (completed_at)
--   - PLAN_ARCHIVAL_TRUTH_RULES.md (archived_at)
--   - FOCUS_SESSIONS_RULES.md (focus_sessions table)
--   - VISIBILITY_RULES.md §7.3 (reminders.user_id)
--   - DASHBOARD_RULES.md (all cards depend on the above)
--
-- Run against your Supabase project via SQL Editor.
-- ============================================================

-- ────────────────────────────────────────────────
-- 1. USERS TABLE
-- ────────────────────────────────────────────────
-- Standalone user identity table.
-- When Supabase Auth is fully wired, a trigger can sync
-- auth.users → users. For now this provides the FK target
-- for task ownership and focus sessions.

CREATE TABLE IF NOT EXISTS users (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL UNIQUE,
  display_name text       NOT NULL,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────
-- 2. TASK OWNERSHIP (TASK_OWNERSHIP_RULES.md §3)
-- ────────────────────────────────────────────────
-- A task has at most one owner. Nullable = unassigned.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assigned_to uuid
  REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to
  ON tasks (assigned_to);

-- ────────────────────────────────────────────────
-- 3. TASK TEMPORAL TRUTH (TASK_TEMPORAL_TRUTH_RULES.md §2)
-- ────────────────────────────────────────────────
-- completed_at is the sole temporal authority for task completion.
-- completed boolean remains for backwards compatibility but is
-- derived from completed_at.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_tasks_completed_at
  ON tasks (completed_at);

-- ────────────────────────────────────────────────
-- 4. PLAN ARCHIVAL TRUTH (PLAN_ARCHIVAL_TRUTH_RULES.md §2)
-- ────────────────────────────────────────────────
-- archived_at timestamp is the sole truth for plan archival.
-- The existing status column remains for backwards compatibility.

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_plans_archived_at
  ON plans (archived_at);

-- ────────────────────────────────────────────────
-- 5. FOCUS SESSIONS TABLE (FOCUS_SESSIONS_RULES.md §11)
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS focus_sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id     uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  started_at       timestamptz NOT NULL,
  ended_at         timestamptz,
  duration_minutes integer,
  task_id          uuid        REFERENCES tasks(id) ON DELETE SET NULL,
  plan_id          uuid        REFERENCES plans(id) ON DELETE SET NULL,
  goal_id          uuid        REFERENCES goals(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),

  -- Only one optional context link is allowed (enforced at app layer,
  -- but we add a CHECK for safety)
  CONSTRAINT chk_single_context CHECK (
    (CASE WHEN task_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN plan_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN goal_id IS NOT NULL THEN 1 ELSE 0 END) <= 1
  ),

  -- Minimum 5 minutes, maximum 240 minutes (4 hours)
  -- Only enforced when session is ended (duration_minutes is set)
  CONSTRAINT chk_duration_range CHECK (
    duration_minutes IS NULL OR
    (duration_minutes >= 5 AND duration_minutes <= 240)
  )
);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_started
  ON focus_sessions (user_id, started_at);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_workspace
  ON focus_sessions (workspace_id);

-- ────────────────────────────────────────────────
-- 6. REMINDERS PRIVACY (VISIBILITY_RULES.md §7.3)
-- ────────────────────────────────────────────────
-- Reminders are personal. user_id scopes them to a single user.
-- Nullable for backwards compatibility with existing data.

ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS user_id uuid
  REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reminders_user_id
  ON reminders (user_id);

-- ────────────────────────────────────────────────
-- 7. BACKFILLS
-- ────────────────────────────────────────────────

-- 7a. Tasks: if completed=true and completed_at is null,
-- set completed_at to created_at (best available timestamp).
UPDATE tasks
  SET completed_at = created_at
  WHERE completed = true
    AND completed_at IS NULL;

-- 7b. Plans: if status='archived' and archived_at is null,
-- set archived_at to now() (best-effort, no better data exists).
UPDATE plans
  SET archived_at = now()
  WHERE status = 'archived'
    AND archived_at IS NULL;
