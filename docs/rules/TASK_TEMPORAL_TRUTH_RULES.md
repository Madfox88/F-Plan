# Task Temporal Truth — Rules & Guarantees

> Authoritative specification for how time, completion, and historical truth are handled for tasks in F-Plan.

This document locks the semantics required for **Dashboard stats**, **Calendar views**, **Goals progress**, and **Focus metrics**.

If a rule is defined here, it is non-negotiable.
If a behavior is not defined here, it must not be implemented.

---

## 1. Core Principle

**Tasks have a single source of temporal truth.**

A task’s history must remain accurate even if:

* The task is reassigned
* The task’s plan is archived
* The task’s due date changes
* The task’s title or description changes

Time-based metrics must never be inferred from booleans alone.

---

## 2. Required Fields

The following fields are mandatory for correct temporal behavior:

### 2.1 `completed_at`

* Type: `timestamptz | null`
* Set **once**, at the moment a task is marked completed
* Stored in UTC
* Never auto-updated

Rules:

* `completed_at = null` → task is incomplete
* `completed_at != null` → task is completed
* The `completed` boolean (if retained) must be derived from `completed_at`, not authoritative

❌ Forbidden:

* Updating `completed_at` on reassignment
* Updating `completed_at` on reopen
* Overwriting `completed_at` on repeated completion

### 2.2 `created_at`

* Already exists
* Type: `timestamptz`
* Used only for ordering and age-based insights
* Never used for completion metrics

---

## 3. Completion Semantics

### 3.1 Completing a Task

When a task is completed:

1. `completed_at` is set to `now()`
2. Task becomes immutable in historical metrics
3. Ownership at that moment is recorded implicitly (via `assigned_to` at completion time)

The system does **not** backfill historical ownership changes.

### 3.2 Reopening a Task

If a completed task is reopened:

* `completed_at` is cleared (`null`)
* The task is removed from all historical completion metrics
* Any previous completion history is discarded

Rationale:
A reopened task is considered **unfinished work**, not “work that was done once.”

---

## 4. Time Windows

### 4.1 Rolling Windows (Default)

All time-based metrics use **rolling windows**, not calendar buckets.

Examples:

* “Last 7 days” = now minus 168 hours
* “Last 30 days” = now minus 720 hours

No midnight-boundary logic is used.

### 4.2 Inclusion Rule

A task counts toward a window **if and only if**:

```
completed_at >= window_start
```

There is no upper bound other than `now()`.

---

## 5. Ownership & Temporal Truth

### 5.1 Assignment at Completion

A completed task contributes to:

* The assignee’s stats **at the time of completion**

If a task is reassigned **after** completion:

* Historical stats do NOT change

If a task is reassigned **before** completion:

* The new assignee receives credit upon completion

### 5.2 Unassigned Tasks

If a task is completed while unassigned:

* It contributes to **workspace-level stats only**
* It does not contribute to any personal stats

---

## 6. Plan Archival Interaction

### 6.1 Archived Plans

When a plan is archived:

* Tasks completed **before** archival remain valid
* Tasks completed **after** archival are forbidden (UI-level prevention)

### 6.2 Metrics Rule

For time-based metrics:

* Completed tasks are counted **regardless of current plan status**
* The only determinant is `completed_at`

Rationale:
Archival is an organizational action, not a historical erasure.

---

## 7. Due Dates vs Completion

### 7.1 Due Date Is Not Truth

* `due_date` is a **planning hint**, not a truth source
* A task completed after its due date is still valid
* Overdue status has no effect on completion metrics

### 7.2 Overdue Metrics

If overdue analytics are introduced later:

* They must be derived from `(completed_at > due_date)`
* Not from boolean flags

---

## 8. Dashboard Dependencies

The following Dashboard metrics depend directly on these rules:

* Completed tasks (7d)
* Completion rate
* Average daily completion
* Focus attribution to tasks

Any dashboard implementation that bypasses `completed_at` is invalid.

---

## 9. Explicit Non-Goals

The following are intentionally excluded:

* Partial completion timestamps
* Multiple completion events per task
* Completion history logs
* Undo history beyond reopen
* Calendar-day-based stats

If these are ever required, a new rules document must be written.

---

## 10. Lock Statement

This document is **locked**.

Changes require:

* Explicit versioning
* Migration plan
* Dashboard recalculation strategy

Until then, `completed_at` is the sole temporal authority for task completion.
