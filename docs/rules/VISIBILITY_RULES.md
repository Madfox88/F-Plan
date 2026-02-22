# VISIBILITY_RULES.md

> Authoritative visibility, privacy, and scope rules for F-Plan.
> These rules apply across Dashboard, Goals, Plans, Tasks, Calendar, and Focus Sessions.

---

## 1. Core Principle

F-Plan is **collaborative but non-invasive**.

Visibility must:
- Support collaboration
- Preserve personal autonomy
- Avoid surveillance, pressure, or comparison
- Scale cleanly from solo → team usage

If a rule is ambiguous, default to **personal visibility only**.

---

## 2. Visibility Axes

All data visibility is governed by **three axes**:

1. **Ownership** — who created or owns the data
2. **Assignment** — who is responsible for execution
3. **Workspace Scope** — whether data is shared or personal

No feature may bypass these axes.

---

## 3. User vs Workspace Perspective

### 3.1 Dashboard Perspective (Locked)

The Dashboard is rendered from the **current user’s perspective by default**.

This means:
- All counts, stats, and lists are scoped to the **current user**
- Workspace-wide aggregates are **not shown by default**

Workspace-level views may be added later via **explicit toggles**, not implicit behavior.

---

## 4. Tasks Visibility

### 4.1 Assigned Tasks

A task is visible to a user if:
- The user is the `assigned_to` user
- OR the user created the task
- OR the user is a workspace owner/admin (read-only override)

### 4.2 Unassigned Tasks

Unassigned tasks:
- Are visible to **all workspace members**
- Do NOT count toward any individual user’s productivity stats
- Appear in:
  - Plans
  - Tasks tab
  - Calendar
- Appear on Dashboard **only if explicitly filtered to “Workspace view” (future)**

### 4.3 Task Completion Visibility

- Task completion state is visible to all users who can see the task
- `completed_at` is visible but **not emphasized**
- Attribution (“completed by”) is not shown in v1

---

## 5. Plans Visibility

### 5.1 Plan Access

A plan is visible to a user if:
- The user is a workspace member
- The plan is not archived

### 5.2 Plan Ownership

- Plans are **workspace entities**, not personal
- Ownership affects permissions, not visibility

### 5.3 Plan Archive Visibility

- Archived plans are hidden by default
- Can be toggled visible explicitly
- Archived plans do not contribute to:
  - Dashboard stats
  - Active workload
  - Focus metrics

---

## 6. Goals Visibility

### 6.1 Goals Scope

Goals are **workspace-level outcomes**.

All workspace members can:
- See all goals
- See goal progress
- See linked plans

### 6.2 Personal Relevance

Goals do **not** filter automatically based on user contribution.

Rationale:
- Goals represent *why the workspace exists*
- Contribution variance is expected
- Hiding goals fragments alignment

### 6.3 Goal Privacy

- Goals cannot be private in v1
- No personal goals yet
- No per-user goal visibility

---

## 7. Calendar Visibility

### 7.1 Tasks and Goals in Calendar

- Tasks appear based on task visibility rules
- Goals appear if they have a due date
- Goals are always read-only in calendar

### 7.2 Events

Events are:
- Workspace-scoped by default
- Visible to all workspace members
- Editable only by creator or owner

### 7.3 Reminders

Reminders are:
- **Personal by default**
- Visible only to the creator
- Never shown on other users’ Dashboards or Calendars

---

## 8. Focus Sessions Visibility (Critical)

### 8.1 Ownership

Focus sessions are **strictly personal**.

Only the owning user can:
- See focus sessions
- See focus duration
- See streaks
- See averages

### 8.2 Aggregation Rules

- Focus data is never aggregated across users
- Workspace owners cannot see others’ focus time
- No team focus metrics exist

This is non-negotiable.

### 8.3 Dashboard Display

Dashboard shows:
- Your focus streak
- Your average daily focus
- Your completed sessions

Never shows:
- Other users’ focus data
- Rankings
- Comparisons

---

## 9. Productivity Stats Visibility

### 9.1 Completed Tasks

Counts include:
- Tasks assigned to the current user
- Tasks completed by the user
- Tasks completed within scope window

Exclude:
- Tasks completed by others
- Unassigned tasks

### 9.2 Completion Rate

Completion rate is:
- Personal
- Based only on tasks assigned to the user
- Calculated over active plans only

### 9.3 Time Windows

All stats respect:
- User’s local timezone
- Explicit window definition (7 days, etc.)

---

## 10. What Is Explicitly Forbidden

The following are **not allowed** in v1 or future without explicit redesign:

- Leaderboards
- User comparison
- Productivity rankings
- “Who worked more” metrics
- Public streaks
- Peer pressure indicators
- Nudges like “You’re behind others”

---

## 11. Design Enforcement

UI must:
- Avoid showing names next to stats
- Avoid color-coded performance indicators tied to people
- Avoid charts that imply comparison

If a visualization risks comparison, it must be redesigned or removed.

---

## 12. Summary (Non-Optional)

| Data Type | Visibility |
|---------|------------|
| Tasks | Assigned + creator + owners |
| Unassigned Tasks | Workspace |
| Plans | Workspace |
| Goals | Workspace |
| Events | Workspace |
| Reminders | Personal |
| Focus Sessions | Personal only |
| Dashboard Stats | Personal only |

---

## 13. Authority

If implementation conflicts with this document “because it feels useful” —  
**the implementation is wrong**.

This file outranks:
- UI convenience
- Feature requests
- Team pressure
- Metrics obsession

F-Plan prioritizes clarity, safety, and sustainability.