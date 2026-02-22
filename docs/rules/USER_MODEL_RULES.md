# USER_MODEL_RULES.md  
**F-Plan — Authoritative User & Workspace Model**

> This document defines the **user model**, **workspace membership**, and **role semantics** for F-Plan.  
> It is **authoritative**. If behavior is not defined here, it does not exist.

---

## 1. Core Principles (Locked)

1. **Workspace-first ownership**
   - All domain data (plans, tasks, goals, events, reminders, focus sessions) belongs to a **workspace**, not to an individual user.
   - Users interact with workspace-owned data.

2. **Assignment is not ownership**
   - Assigning a task or event to a user does **not** transfer ownership.
   - Assignment is a visibility and responsibility lens only.

3. **Unassigned is first-class**
   - Work may exist without an assignee.
   - Unassigned items are valid, visible, and actionable.

4. **Historical integrity**
   - Removing a user must never invalidate past data or stats.
   - History remains correct even if a user leaves the workspace.

5. **Predictable access**
   - Permissions are simple, explicit, and role-based.
   - No implicit privilege escalation.

---

## 2. User Identity

### 2.1 Source of Truth
- Users are authenticated identities provided by the auth system (e.g., Supabase Auth).
- Each authenticated identity maps to exactly one `users` record.

### 2.2 User Record (Conceptual)
A user record represents **who** someone is, not what they own.

Minimum fields:
- `id` (uuid, primary key)
- `email`
- `display_name`
- `avatar_url` (optional)
- `created_at`

> Note: The exact auth provider is abstracted. This document defines behavior, not implementation.

---

## 3. Workspaces

### 3.1 Definition
A **workspace** is the top-level container for all work and collaboration.

- All plans, tasks, goals, calendar items, and focus sessions belong to exactly one workspace.
- A user may belong to multiple workspaces.

### 3.2 Workspace Membership
Membership is explicit via a join model:

- `workspace_members`
  - `workspace_id`
  - `user_id`
  - `role`
  - `joined_at`

Membership controls **visibility and capability**, not ownership.

---

## 4. Roles (Minimal, Locked)

Roles are intentionally minimal.

### 4.1 Roles Defined

#### Owner
- Creates the workspace
- Can:
  - Invite/remove users
  - Change member roles
  - Archive/delete workspace
- Sees all workspace-level data

#### Member
- Default role
- Can:
  - Create/edit plans, tasks, goals, events (subject to future permissions)
  - Be assigned work
- Cannot manage membership or workspace lifecycle

> No additional roles exist (no Admin, Viewer, Guest) unless explicitly added in a future version.

---

## 5. Visibility Rules

### 5.1 Data Visibility
- All workspace members can **see** all workspace data by default.
- Visibility is **not restricted by assignment**.
  - Assignment affects dashboards and filters, not access.

### 5.2 Personal vs Workspace Views
- Some views (e.g., Dashboard) may present **personal perspectives**:
  - “My tasks”
  - “My focus stats”
- This is a **view-level filter**, not a permission boundary.

---

## 6. Assignment Semantics (High-Level)

> Detailed task ownership rules are defined in `TASK_OWNERSHIP_RULES.md` (next step).

At the user-model level:
- Assignment links a user to a unit of work for responsibility.
- Assignment may be:
  - `NULL` (unassigned)
  - A single user (default)
- Multi-assignment is **not allowed by default**.

---

## 7. User Removal & Edge Cases

### 7.1 Removing a User from a Workspace
When a user is removed:
- Their membership row is deleted.
- Their past contributions remain:
  - Completed tasks still count.
  - Focus sessions still exist.
- Assigned items:
  - May become unassigned **or**
  - Retain the historical assignee reference (implementation detail).
- No data is deleted.

### 7.2 Deleting a User Account
- The system must preserve:
  - Task history
  - Completion stats
  - Goal progress
- User references may be anonymized but not removed from history.

---

## 8. Explicit Non-Goals (Locked)

The user model explicitly does **not** include:

- Per-user ownership of tasks/plans/goals
- Private workspaces inside a shared workspace
- Hidden tasks invisible to other members
- Per-user forks or personal copies of plans
- Competitive metrics (leaderboards, rankings)
- Gamification mechanics tied to users

---

## 9. Enforcement Rule

If any implementation:
- Treats a task or plan as “owned” by a user
- Deletes historical data when a user leaves
- Restricts visibility based on assignment
- Introduces new roles without updating this document

Then the implementation is **incorrect**.

---