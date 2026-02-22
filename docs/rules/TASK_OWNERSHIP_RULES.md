# TASK_OWNERSHIP_RULES.md

## F-Plan — Task Ownership (Authoritative)

This document defines **exactly** how task ownership works in F-Plan.
It is a locking document. Any implementation that violates this is incorrect.

---

## 1. Purpose

Task ownership answers **“Who is responsible for doing this?”**

Ownership is required for:

* Personal vs workspace views
* Dashboard metrics
* Focus sessions
* Calendar attribution
* Multi-user clarity

Ownership is **not** about permission, hierarchy, or control.

---

## 2. Core Principles (Locked)

1. **A task has at most one owner**
2. **Tasks may be unassigned**
3. **Ownership is explicit, not inferred**
4. **Ownership affects visibility, not existence**
5. **Ownership does not affect plan or stage structure**

No multi-assignee tasks.
No implicit ownership.
No automatic reassignment.

---

## 3. Data Model

### 3.1 Column (Required)

Add to `tasks` table:

```
assigned_to uuid references users(id) null
```

* Nullable
* No default value
* No cascading behavior

---

## 4. Ownership States

A task can be in exactly one of these states:

### 4.1 Assigned

* `assigned_to = user_id`
* The user is responsible for execution
* Appears in:

  * User’s Tasks tab
  * User’s Dashboard stats
  * User’s Calendar
  * Focus attribution

### 4.2 Unassigned

* `assigned_to IS NULL`
* Task belongs to the plan, not a person
* Appears in:

  * Workspace-level views
  * Plan board
* Does **not** appear in:

  * Personal Dashboard stats
  * Personal Focus metrics

Unassigned tasks are first-class citizens.

---

## 5. Assignment Rules

### 5.1 Who Can Assign

* Any workspace member can assign a task
* No role restriction (roles may exist later)

### 5.2 How Assignment Happens

* Assignment is always manual
* Assignment can be changed at any time
* Reassignment overwrites the previous owner

No history tracking at this stage.

---

## 6. Task Completion Semantics

* A task is completed **by its current owner**
* If unassigned:

  * Completion is allowed
  * No user gets credit
* Completion attribution uses:

  * `assigned_to`
  * `completed_at` (defined in TASK_TEMPORAL_TRUTH_RULES.md)

---

## 7. Visibility Rules

### 7.1 Tasks Tab

* Shows:

  * All tasks in workspace
  * Clearly labeled:

    * “Assigned to me”
    * “Assigned to others”
    * “Unassigned”
* Filtering by:

  * Owner (me / others / unassigned)

### 7.2 Plans (Board View)

* Shows all tasks regardless of assignment
* Ownership is informational only
* No filtering by owner by default

---

## 8. Dashboard Interaction (Forward Reference)

Ownership affects dashboard metrics as follows:

* **Completed Tasks (7d):**

  * Count only tasks where:

    * `assigned_to = current_user`
    * `completed_at` in window
* **Completion Rate:**

  * Based only on tasks assigned to user
* **Focus Stats:**

  * Only sessions tied to tasks owned by user

Workspace-wide dashboards may aggregate later.

---

## 9. Calendar Interaction

* Tasks appear on a user’s calendar **only if assigned**
* Unassigned tasks do not appear on personal calendars
* Workspace calendars may show all tasks (future feature)

---

## 10. Edge Cases

### 10.1 User Leaves Workspace

* Their tasks become **unassigned**
* No deletion
* No reassignment

### 10.2 User Deleted

* Same behavior as leaving workspace
* `assigned_to` set to NULL

### 10.3 Task Reassigned After Completion

* Historical metrics do not change
* Future stats reflect new owner only

---

## 11. Explicit Non-Features

The system explicitly does NOT support:

* Multiple assignees
* Task watchers
* Ownership history
* Automatic assignment
* Role-based assignment restrictions
* Task claiming mechanics

All of the above require a new version of this document.

---

## 12. Enforcement Rule

If any implementation:

* Allows multiple assignees
* Auto-assigns tasks
* Infers ownership from plan or stage
* Credits focus or stats for unassigned tasks

Then it is **incorrect**.

This document is the single source of truth for task ownership in F-Plan.
