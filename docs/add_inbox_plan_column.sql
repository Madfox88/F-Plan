-- Migration: Add is_inbox column to plans table
-- This supports the hidden "Inbox" plan pattern for standalone tasks.
-- The inbox plan is auto-created per workspace and hidden from the Plans page.

ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_inbox boolean NOT NULL DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Prevent more than one inbox plan per workspace
CREATE UNIQUE INDEX IF NOT EXISTS uq_plans_inbox_per_workspace
  ON plans (workspace_id)
  WHERE is_inbox = true;

-- Add completed_at to goals for manual completion tracking
ALTER TABLE goals ADD COLUMN IF NOT EXISTS completed_at timestamptz;
