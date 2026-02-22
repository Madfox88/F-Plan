# F-Plan — CALENDAR_RULES.md (Authoritative)

This document defines the complete behavior, scope, UI rules, and database contract for the **Calendar** tab in **F-Plan**.

It is authoritative.
No additional calendar features, UI, data fields, logic, or behaviors may be added unless this document is explicitly updated.

---

## 1. Purpose

The Calendar exists to answer one question:

**“What is happening, and when?”**

It is a time-oriented view that brings together:
- Tasks (execution)
- Goals (outcomes)
- Calendar-native items (events and reminders)

The Calendar is a **projection and scheduling layer**, not a planning system and not an editing surface for tasks/goals.

---

## 2. Non-Negotiable Scope

### 2.1 Calendar can create ONLY:
- Events
- Reminders

### 2.2 Calendar CANNOT create:
- Goals
- Plans
- Stages
- Tasks

### 2.3 Calendar CANNOT edit:
- Goals
- Tasks

Tasks and goals are always shown read-only in Calendar.

---

## 3. Entity Model (Three Layers)

Calendar renders three distinct categories of items.

### 3.1 Tasks (Execution Layer)
- Origin: Plans → Stages → Tasks
- Scheduling semantics: due_date (date-level)
- Calendar role: informational execution deadlines
- Calendar interaction: read-only popup only
- Tasks are never created or edited from Calendar

### 3.2 Goals (Outcome Layer)
- Origin: Goals tab
- Scheduling semantics: due_date (date-level)
- Calendar role: milestone indicator
- Calendar interaction: read-only popup only
- Goals are never created or edited from Calendar

### 3.3 Calendar-native Items (Personal Time Layer)
Two types:
- Events (time blocks)
- Reminders (alerts/nudges)

These are created from Calendar and may be edited from Calendar.

---

## 4. Views

Calendar must support three views:

- Month view
- Week view
- Day view

Switching views is client-side and does not change underlying data.

### 4.1 Month View (Orientation)
Purpose: overview

Shows:
- Tasks on due_date (all-day marker)
- Goals on due_date (milestone marker)
- Events shown by title on their date range
- Reminders shown on their scheduled date

Month view does not allow inline edits.

### 4.2 Week View (Scheduling)
Purpose: schedule clarity

Shows:
- Events as time blocks in the time grid
- Reminders as small markers at their scheduled time
- Tasks due that day in an all-day or “Due” section (not time-blocked)
- Goals due that day in a milestone row/section (not time-blocked)

Week view does not allow inline edits.
Edits happen only through event/reminder modals.

### 4.3 Day View (Focus)
Purpose: day execution and schedule

Shows:
- Events as time blocks
- Reminders at time markers
- Tasks due that day in a due list/section
- Goals due that day in a milestone section

Day view does not allow inline edits.
Edits happen only through event/reminder modals.

---

## 5. Color Semantics (Locked)

Calendar uses type-based color coding only.

- Tasks: one consistent color
- Goals: one consistent color
- Events: one consistent color
- Reminders: one consistent color

Rules:
- No per-item custom colors
- No user-configurable colors
- The purpose is type recognition, not decoration

The visual system must use existing tokens and glass theme styles.
No redesign, no new shadows, no novel effects.

---

## 6. Click Behavior (Locked)

### 6.1 Clicking an EMPTY date/time slot
Opens a **Create Chooser** popup with exactly two options:
- Create Event
- Create Reminder

No “Create Task” and no “Create Goal”.

### 6.2 Clicking an EXISTING Event
Opens Event Detail popup (editable).

### 6.3 Clicking an EXISTING Reminder
Opens Reminder Detail popup (editable).

### 6.4 Clicking a Task item in Calendar
Opens **Task Read-only Popup** (not editable).
Popup includes full metadata (see §7.1).

### 6.5 Clicking a Goal item in Calendar
Opens **Goal Read-only Popup** (not editable).
Popup includes full metadata (see §7.2).

---

## 7. Read-only Popups (Tasks and Goals)

Read-only popups must use the universal popup system style (see Popup System reference standard).
They must not expose Save, Edit, Delete, or mutation actions.

### 7.1 Task Read-only Popup — Required Metadata
The popup must show:
- Title
- Status
- Completion state
- Priority
- Due date
- Description (if present)
- Labels/tags (if present)
- Checklist progress (if present)
- Plan name (required context)
- Stage name (required context)
- Created date
- Updated date (if tracked by schema)

No edit controls.
No inline toggles.
No checkbox mutation.

### 7.2 Goal Read-only Popup — Required Metadata
The popup must show:
- Title
- Description (if present)
- Due date (if present)
- Tags (if present)
- Progress percentage
- Completed tasks / total tasks (derived)
- Linked plan summary (first plan + count if more)
- Created date
- Updated date (if tracked by schema)

No edit controls.
No linking controls.
No mutation actions.

---

## 8. Event and Reminder Creation (Locked)

### 8.1 Create Event Modal — Required Fields
- Title (required)
- Start datetime (required)
- End datetime (required)
- Notes (optional)
- Location (optional)
- Repeat rule (required, can be “none”)

### 8.2 Create Reminder Modal — Required Fields
- Title (required)
- Datetime (required)
- Notes (optional)
- Repeat rule (required, can be “none”)

### 8.3 Repeat Rule Options (Locked)
Repeat selection must support exactly these values:

- none
- daily
- bi_daily
- weekly
- bi_weekly
- monthly
- bi_monthly
- yearly
- bi_yearly

No custom RRULE builder.
No “weekday only”.
No complex recurrence exceptions.
No per-instance edits in v1.

---

## 9. Recurrence Interpretation Rules

Repeat rules generate an ongoing series.

Rules:
- A repeating event/reminder is stored as **one row** with a recurrence rule.
- The UI must expand occurrences client-side (or via query helper later) for display.
- No separate row per occurrence is allowed.
- No exception tables are allowed in v1.

Occurrences:
- Must be displayed in Month/Week/Day views within the currently visible range only.
- Must not generate infinite lists.
- Must be computed only for the range being viewed.

Editing repeating items:
- Edits apply to the whole series.
- “Edit this occurrence only” is explicitly out of scope.

---

## 10. Database Contract (Authoritative)

The Calendar requires two new tables:
- `events`
- `reminders`

These tables are workspace-scoped.

### 10.1 Common Rules
- IDs are UUID
- Timestamps are UTC
- No soft delete unless explicitly added later
- No additional calendar tables (no recurrence_instances, no exceptions) in v1

### 10.2 `events` Table

| Column        | Type        | Nullable | Notes |
|--------------|-------------|----------|------|
| id           | uuid        | no       | Primary key |
| workspace_id | uuid        | no       | FK → workspaces.id |
| title        | text        | no       | Event title |
| notes        | text        | yes      | Optional notes |
| location     | text        | yes      | Optional location |
| start_at     | timestamptz | no       | UTC |
| end_at       | timestamptz | no       | UTC |
| repeat_rule  | text        | no       | See §8.3 |
| created_at   | timestamptz | no       | Default: now() |
| updated_at   | timestamptz | no       | Default: now() (or trigger-managed) |

Constraints:
- PK(id)
- FK(workspace_id) references workspaces(id)
- start_at < end_at
- repeat_rule must be one of allowed values

### 10.3 `reminders` Table

| Column        | Type        | Nullable | Notes |
|--------------|-------------|----------|------|
| id           | uuid        | no       | Primary key |
| workspace_id | uuid        | no       | FK → workspaces.id |
| title        | text        | no       | Reminder title |
| notes        | text        | yes      | Optional notes |
| remind_at    | timestamptz | no       | UTC |
| repeat_rule  | text        | no       | See §8.3 |
| created_at   | timestamptz | no       | Default: now() |
| updated_at   | timestamptz | no       | Default: now() (or trigger-managed) |

Constraints:
- PK(id)
- FK(workspace_id) references workspaces(id)
- repeat_rule must be one of allowed values

### 10.4 Repeat Rule Constraint (Shared)
Allowed values for repeat_rule:
- 'none'
- 'daily'
- 'bi_daily'
- 'weekly'
- 'bi_weekly'
- 'monthly'
- 'bi_monthly'
- 'yearly'
- 'bi_yearly'

No other values are allowed.

---

## 11. Data Loading Rules

Calendar must load:
- Tasks with due dates (and relevant metadata/context)
- Goals with due dates (and relevant metadata/context)
- Events in visible time range (plus repeats expanded for view range)
- Reminders in visible time range (plus repeats expanded for view range)

Loading must be bounded by visible range.
No unbounded fetches.

---

## 12. Explicit Non-Features (Locked Out)

Calendar must NOT include:
- Creating tasks/goals
- Editing tasks/goals
- Drag-and-drop scheduling
- Task time-blocking
- Goal time-blocking
- Per-item custom colors
- Complex recurrence rules or exceptions
- Editing a single occurrence within a recurring series
- Shared calendars, invites, attendees
- Notifications or push delivery logic (UI may store reminders, delivery is future scope)
- External calendar sync (Apple/Google/ICS)

---

## 13. Enforcement Rule

Any implementation that:
- Allows task/goal creation from Calendar
- Allows task/goal editing from Calendar
- Adds recurrence exception storage
- Adds extra recurrence options beyond §8.3
- Adds per-item color customization
- Adds additional calendar tables not listed in §10
- Adds UI actions not defined here

is incorrect.

This document is the single source of truth for Calendar behavior in F-Plan.