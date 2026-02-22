-- F-Plan Calendar — SQL Migration (CALENDAR_RULES.md §10)
-- Run this in your Supabase SQL Editor.

-- 1. Events table (§10.2)
CREATE TABLE IF NOT EXISTS events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid       NOT NULL REFERENCES workspaces(id),
  title       text        NOT NULL,
  notes       text,
  location    text,
  start_at    timestamptz NOT NULL,
  end_at      timestamptz NOT NULL,
  repeat_rule text        NOT NULL DEFAULT 'none',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT events_time_order CHECK (start_at < end_at),
  CONSTRAINT events_repeat_rule_check CHECK (
    repeat_rule IN (
      'none','daily','bi_daily','weekly','bi_weekly',
      'monthly','bi_monthly','yearly','bi_yearly'
    )
  )
);

-- 2. Reminders table (§10.3)
CREATE TABLE IF NOT EXISTS reminders (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid       NOT NULL REFERENCES workspaces(id),
  title       text        NOT NULL,
  notes       text,
  remind_at   timestamptz NOT NULL,
  repeat_rule text        NOT NULL DEFAULT 'none',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT reminders_repeat_rule_check CHECK (
    repeat_rule IN (
      'none','daily','bi_daily','weekly','bi_weekly',
      'monthly','bi_monthly','yearly','bi_yearly'
    )
  )
);

-- 3. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
