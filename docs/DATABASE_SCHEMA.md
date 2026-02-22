# F-Plan – Database Schema (Authoritative)

This document defines the complete database schema for **F-Plan**.

It is the single source of truth for:
- Tables
- Columns
- Relationships
- Constraints
- Intended usage

If something is not defined here, it does not exist.
AI implementations must NOT invent tables, columns, or relations.

---

## 1. Core Principles

- Single-user first, extensible to multi-user later
- Relational, normalized structure
- No derived or cached data stored
- IDs are UUIDs
- Timestamps are always UTC
- Soft deletion is NOT used unless explicitly stated

---

## 2. Tables Overview

| Table Name        | Purpose                                      |
|-------------------|----------------------------------------------|
| users             | User identity (FK target for ownership)      |
| workspaces        | Logical container for all data               |
| plans             | High-level planning entities                 |
| stages            | Ordered stages within a plan                 |
| tasks             | Actionable items inside stages               |
| goals             | Long-term objectives                         |
| plan_goals        | Join table between plans and goals           |
| events            | Calendar time-blocked events                 |
| reminders         | Calendar personal reminders                  |
| focus_sessions    | User focus session tracking                  |

---

## 3. users

User identity table. Provides the FK target for task ownership
and focus sessions. When Supabase Auth is fully wired, a trigger
can sync `auth.users` → `users`.

### Columns

| Column       | Type        | Nullable | Notes |
|-------------|-------------|----------|------|
| id          | uuid        | no       | Primary key, default gen_random_uuid() |
| email       | text        | no       | Unique |
| display_name| text        | no       | User display name |
| avatar_url  | text        | yes      | Optional avatar URL |
| created_at  | timestamptz | no       | Default: now() |

### Constraints

- Primary key on `id`
- Unique on `email`

---

## 4. workspaces

Represents a single planning space.

### Columns

| Column       | Type        | Nullable | Notes |
|-------------|-------------|----------|------|
| id          | uuid        | no       | Primary key |
| name        | text        | no       | Workspace name |
| created_at  | timestamptz | no       | Default: now() |

### Constraints

- Primary key on `id`

### Notes

- For single-user mode, there is exactly **one workspace**
- Multi-workspace support is future-safe but not required

---

## 5. plans

Represents a plan or initiative.

### Columns

| Column        | Type        | Nullable | Notes |
|--------------|-------------|----------|------|
| id           | uuid        | no       | Primary key |
| workspace_id | uuid        | no       | FK → workspaces.id |
| title        | text        | no       | Plan title |
| description  | text        | yes      | Optional description |
| intent       | text        | yes      | Optional intent |
| status       | text        | no       | `active`, `archived`, or `draft` |
| is_pinned    | boolean     | no       | Default: false |
| due_date     | date        | yes      | Optional plan due date |
| archived_at  | timestamptz | yes      | Archival timestamp (sole truth per PLAN_ARCHIVAL_TRUTH_RULES.md) |
| created_at   | timestamptz | no       | Default: now() |

### Constraints

- Primary key on `id`
- Foreign key (`workspace_id`) references `workspaces(id)`
- `status` must be one of: `active`, `archived`, `draft`
- Index on `archived_at`

### Notes

- Plans are always scoped to a workspace
- `archived_at` is the sole temporal truth for archival (PLAN_ARCHIVAL_TRUTH_RULES.md §2)
- `status` remains for backwards compatibility but `archived_at` is canonical

---

## 6. stages

Represents a structured phase inside a plan.

### Columns

| Column     | Type        | Nullable | Notes |
|------------|-------------|----------|------|
| id         | uuid        | no       | Primary key |
| plan_id    | uuid        | no       | FK → plans.id |
| title      | text        | no       | Stage name |
| position   | integer     | no       | Ordering index |
| created_at | timestamptz | no       | Default: now() |

### Constraints

- Primary key on `id`
- Foreign key (`plan_id`) references `plans(id)`
- `position` must be ≥ 0

### Notes

- Stages are ordered **within a plan**
- No workspace_id here by design

---

## 7. tasks

Represents a concrete action.

### Columns

| Column       | Type        | Nullable | Notes |
|-------------|-------------|----------|------|
| id          | uuid        | no       | Primary key |
| stage_id    | uuid        | no       | FK → stages.id |
| title       | text        | no       | Task title |
| completed   | boolean     | no       | Default: false (derived from completed_at) |
| completed_at| timestamptz | yes      | Sole temporal truth for completion |
| assigned_to | uuid        | yes      | FK → users.id, nullable = unassigned |
| status      | text        | yes      | `not_started`, `in_progress`, `completed` |
| priority    | text        | yes      | `urgent`, `important`, `medium`, `low` |
| start_date  | date        | yes      | Optional start date |
| due_date    | date        | yes      | Optional due date |
| repeat      | text        | yes      | Repeat rule |
| description | text        | yes      | Optional description |
| checklists  | jsonb       | yes      | Array of checklist items |
| labels      | jsonb       | yes      | Array of label objects |
| created_at  | timestamptz | no       | Default: now() |

### Constraints

- Primary key on `id`
- Foreign key (`stage_id`) references `stages(id)`
- Foreign key (`assigned_to`) references `users(id)` ON DELETE SET NULL
- Index on `assigned_to`
- Index on `completed_at`

### Notes

- `completed_at` is the sole temporal authority for task completion (TASK_TEMPORAL_TRUTH_RULES.md §2)
- `completed` boolean is kept in sync but is derived, not authoritative
- `assigned_to` defines task ownership (TASK_OWNERSHIP_RULES.md §3)
- Nullable `assigned_to` = unassigned task

---

## 8. goals

Represents long-term objectives.

### Columns

| Column       | Type        | Nullable | Notes |
|-------------|-------------|----------|------|
| id          | uuid        | no       | Primary key |
| workspace_id| uuid        | no       | FK → workspaces.id |
| title       | text        | no       | Goal name |
| description | text        | yes      | Optional |
| due_date    | date        | yes      | Optional due date |
| tags        | jsonb       | yes      | Array of {label, color} objects |
| created_at  | timestamptz | no       | Default: now() |

### Constraints

- Primary key on `id`
- Foreign key (`workspace_id`) references `workspaces(id)`

---

## 9. plan_goals

Join table connecting plans and goals.

### Columns

| Column   | Type | Nullable | Notes |
|----------|------|----------|------|
| plan_id  | uuid | no       | FK → plans.id |
| goal_id  | uuid | no       | FK → goals.id |

### Constraints

- Composite primary key (`plan_id`, `goal_id`)
- Foreign keys enforced

---

## 10. events

Calendar time-blocked events (CALENDAR_RULES.md §10.2).

### Columns

| Column        | Type        | Nullable | Notes |
|--------------|-------------|----------|------|
| id           | uuid        | no       | Primary key |
| workspace_id | uuid        | no       | FK → workspaces.id |
| title        | text        | no       | Event title |
| notes        | text        | yes      | Optional notes |
| location     | text        | yes      | Optional location |
| start_at     | timestamptz | no       | UTC |
| end_at       | timestamptz | no       | UTC |
| repeat_rule  | text        | no       | See CALENDAR_RULES.md §8.3 |
| created_at   | timestamptz | no       | Default: now() |
| updated_at   | timestamptz | no       | Default: now() |

### Constraints

- Primary key on `id`
- Foreign key (`workspace_id`) references `workspaces(id)`
- `start_at < end_at`
- `repeat_rule` must be one of: none, daily, bi_daily, weekly, bi_weekly, monthly, bi_monthly, yearly, bi_yearly

---

## 11. reminders

Calendar personal reminders (CALENDAR_RULES.md §10.3, VISIBILITY_RULES.md §7.3).

### Columns

| Column        | Type        | Nullable | Notes |
|--------------|-------------|----------|------|
| id           | uuid        | no       | Primary key |
| workspace_id | uuid        | no       | FK → workspaces.id |
| user_id      | uuid        | yes      | FK → users.id, personal ownership |
| title        | text        | no       | Reminder title |
| notes        | text        | yes      | Optional notes |
| remind_at    | timestamptz | no       | UTC |
| repeat_rule  | text        | no       | See CALENDAR_RULES.md §8.3 |
| created_at   | timestamptz | no       | Default: now() |
| updated_at   | timestamptz | no       | Default: now() |

### Constraints

- Primary key on `id`
- Foreign key (`workspace_id`) references `workspaces(id)`
- Foreign key (`user_id`) references `users(id)` ON DELETE SET NULL
- `repeat_rule` must be one of: none, daily, bi_daily, weekly, bi_weekly, monthly, bi_monthly, yearly, bi_yearly

---

## 12. focus_sessions

Tracks user focus sessions (FOCUS_SESSIONS_RULES.md §11).

### Columns

| Column           | Type        | Nullable | Notes |
|-----------------|-------------|----------|------|
| id              | uuid        | no       | Primary key |
| user_id         | uuid        | no       | FK → users.id |
| workspace_id    | uuid        | no       | FK → workspaces.id |
| started_at      | timestamptz | no       | Session start time |
| ended_at        | timestamptz | yes      | Null while session is active |
| duration_minutes| integer     | yes      | Derived on end |
| task_id         | uuid        | yes      | Optional context: FK → tasks.id |
| plan_id         | uuid        | yes      | Optional context: FK → plans.id |
| goal_id         | uuid        | yes      | Optional context: FK → goals.id |
| created_at      | timestamptz | no       | Default: now() |

### Constraints

- Primary key on `id`
- Foreign key (`user_id`) references `users(id)` ON DELETE CASCADE
- Foreign key (`workspace_id`) references `workspaces(id)` ON DELETE CASCADE
- Foreign key (`task_id`) references `tasks(id)` ON DELETE SET NULL
- Foreign key (`plan_id`) references `plans(id)` ON DELETE SET NULL
- Foreign key (`goal_id`) references `goals(id)` ON DELETE SET NULL
- CHECK: at most one of (task_id, plan_id, goal_id) may be non-null
- CHECK: duration_minutes is NULL or between 5 and 240
- Index on (`user_id`, `started_at`)
- Index on (`workspace_id`)

### Notes

- Focus sessions are strictly personal (VISIBILITY_RULES.md §8)
- Minimum valid duration: 5 minutes (shorter sessions discarded)
- Maximum duration: 4 hours (auto-end)
- Only one optional context link allowed

---

## 13. Relationships Summary

- users exist independently (FK target)
- workspace → plans (1:N)
- plan → stages (1:N)
- stage → tasks (1:N)
- workspace → goals (1:N)
- plans ↔ goals (N:M via plan_goals)
- workspace → events (1:N)
- workspace → reminders (1:N)
- user → reminders (1:N, personal ownership)
- user → focus_sessions (1:N)
- workspace → focus_sessions (1:N)
- tasks.assigned_to → users (N:1)

---

## 14. Enforcement Rule

Any implementation that:
- Adds columns not listed here
- Renames fields
- Changes relationships
- Infers missing tables

Is **incorrect**.

This schema is authoritative.