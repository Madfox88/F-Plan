-- Activity Log table for F-Plan workspace audit trail
-- Run this in the Supabase SQL Editor

-- ═══ Create the activity_log table ═══
CREATE TABLE IF NOT EXISTS activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text NOT NULL,          -- 'created', 'completed', 'reopened', 'edited', 'deleted', 'hidden', 'unhidden', 'moved', 'renamed'
  entity_type text NOT NULL,          -- 'goal', 'plan', 'task', 'tag', 'stage'
  entity_id   uuid NOT NULL,
  entity_title text NOT NULL DEFAULT '',  -- snapshot of name at log time (survives renames/deletes)
  metadata    jsonb DEFAULT '{}',     -- extra context: { "field": "title", "from": "Old", "to": "New" }
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ═══ Indexes for fast queries ═══
CREATE INDEX IF NOT EXISTS idx_activity_log_workspace
  ON activity_log(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_entity
  ON activity_log(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_user
  ON activity_log(user_id, created_at DESC);

-- ═══ RLS — users see logs from their workspace only ═══
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Allow SELECT for workspace members
CREATE POLICY "activity_log_select" ON activity_log
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Allow INSERT for workspace members
CREATE POLICY "activity_log_insert" ON activity_log
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- No UPDATE or DELETE — logs are immutable
