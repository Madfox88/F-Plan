-- ══════════════════════════════════════════════════
-- Backfill & enforce task ownership
-- TASK_OWNERSHIP_RULES.md §3: Every task must have exactly one owner.
-- ══════════════════════════════════════════════════
--
-- Run this ONCE after deploying the ownership enforcement code.
--
-- Step 1: Backfill all unassigned tasks to the workspace owner (first user).
-- Step 2: Add NOT NULL constraint so no future nulls are possible.
-- ══════════════════════════════════════════════════

-- 1. Backfill: assign all NULL tasks to the first user in the system
--    (single-user-first — there is exactly one user row)
UPDATE tasks
SET assigned_to = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
WHERE assigned_to IS NULL;

-- 2. Verify no NULLs remain
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM tasks WHERE assigned_to IS NULL) THEN
    RAISE EXCEPTION 'Backfill incomplete — tasks with NULL assigned_to still exist';
  END IF;
END $$;

-- 3. Enforce NOT NULL going forward
ALTER TABLE tasks ALTER COLUMN assigned_to SET NOT NULL;
