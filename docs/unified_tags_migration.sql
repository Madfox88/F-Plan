-- ═══════════════════════════════════════════════════════════════════
-- Unified Tag System Migration
-- Creates workspace-scoped tags table + 3 join tables for
-- goals, plans, and tasks. Migrates existing JSONB tags/labels.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Create the shared tags table
CREATE TABLE IF NOT EXISTS tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  label      text NOT NULL,
  color      text NOT NULL DEFAULT 'blue',  -- named palette: neutral, blue, green, orange, red, purple
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, label)
);

-- 2. Create join tables
CREATE TABLE IF NOT EXISTS goal_tags (
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (goal_id, tag_id)
);

CREATE TABLE IF NOT EXISTS plan_tags (
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (plan_id, tag_id)
);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- 3. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_tags_workspace ON tags(workspace_id);
CREATE INDEX IF NOT EXISTS idx_goal_tags_tag   ON goal_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_plan_tags_tag   ON plan_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag   ON task_tags(tag_id);

-- 4. Enable RLS
ALTER TABLE tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_tags  ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tags  ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags  ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies — workspace members can CRUD their workspace tags
CREATE POLICY "workspace members can manage tags"
  ON tags FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "workspace members can manage goal_tags"
  ON goal_tags FOR ALL
  USING (tag_id IN (SELECT id FROM tags WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));

CREATE POLICY "workspace members can manage plan_tags"
  ON plan_tags FOR ALL
  USING (tag_id IN (SELECT id FROM tags WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));

CREATE POLICY "workspace members can manage task_tags"
  ON task_tags FOR ALL
  USING (tag_id IN (SELECT id FROM tags WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));

-- 6. Migrate existing goal JSONB tags → tags table + goal_tags
-- This extracts unique (workspace_id, label, color) from goals.tags JSONB
INSERT INTO tags (workspace_id, label, color)
SELECT DISTINCT
  g.workspace_id,
  (t->>'label')::text,
  COALESCE(t->>'color', 'blue')::text
FROM goals g, jsonb_array_elements(g.tags) AS t
WHERE jsonb_typeof(g.tags) = 'array' AND jsonb_array_length(g.tags) > 0
ON CONFLICT (workspace_id, label) DO NOTHING;

-- Link goals to their migrated tags
INSERT INTO goal_tags (goal_id, tag_id)
SELECT g.id, tg.id
FROM goals g, jsonb_array_elements(g.tags) AS t
JOIN tags tg ON tg.workspace_id = g.workspace_id AND tg.label = (t->>'label')::text
WHERE jsonb_typeof(g.tags) = 'array' AND jsonb_array_length(g.tags) > 0
ON CONFLICT DO NOTHING;

-- 7. Migrate existing task JSONB labels → tags table + task_tags
-- Tasks don't have workspace_id directly, so we join through stages → plans
INSERT INTO tags (workspace_id, label, color)
SELECT DISTINCT
  p.workspace_id,
  (l->>'name')::text,
  CASE
    WHEN (l->>'color') ~ '^#' THEN 'blue'  -- hex colors map to blue; user can reassign in Tag Manager
    ELSE COALESCE(l->>'color', 'blue')
  END
FROM tasks tk
JOIN stages s ON s.id = tk.stage_id
JOIN plans p ON p.id = s.plan_id,
jsonb_array_elements(tk.labels) AS l
WHERE jsonb_typeof(tk.labels) = 'array' AND jsonb_array_length(tk.labels) > 0
ON CONFLICT (workspace_id, label) DO NOTHING;

-- Link tasks to their migrated tags
INSERT INTO task_tags (task_id, tag_id)
SELECT tk.id, tg.id
FROM tasks tk
JOIN stages s ON s.id = tk.stage_id
JOIN plans p ON p.id = s.plan_id,
jsonb_array_elements(tk.labels) AS l
JOIN tags tg ON tg.workspace_id = p.workspace_id AND tg.label = (l->>'name')::text
WHERE jsonb_typeof(tk.labels) = 'array' AND jsonb_array_length(tk.labels) > 0
ON CONFLICT DO NOTHING;
