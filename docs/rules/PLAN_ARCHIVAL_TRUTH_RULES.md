# Plan Archival Truth — Authoritative Rules

> This document defines the **single source of truth** for what it means for a Plan to be archived in F-Plan, how archival interacts with Tasks, Goals, Calendar, Focus Sessions, and Dashboard metrics, and why archival must be temporal, explicit, and irreversible.

This file is **blocking** for Focus Sessions and Dashboard implementation.

---

## 1. Purpose of Plan Archival

Archiving a Plan means:

* The Plan is **no longer active for execution**
* The Plan is **removed from default operational views**
* The Plan’s data remains **historically true and queryable**

Archival is not deletion.
Archival is not hiding.
Archival is not pausing.

Archival is a **terminal lifecycle transition** for a Plan.

---

## 2. Schema Requirements (Locked)

The `plans` table MUST include:

```
archived_at timestamptz null
```

Rules:

* `archived_at = NULL` → Plan is active
* `archived_at IS NOT NULL` → Plan is archived
* There is no `is_archived` boolean
* There is no soft-delete flag

The timestamp is the only truth.

---

## 3. What Archiving a Plan Does

When a Plan is archived:

1. `archived_at` is set to `now()`
2. The Plan becomes **read-only**
3. No new Stages can be created
4. No new Tasks can be created
5. Existing Tasks cannot change stage
6. Existing Tasks cannot be reopened once completed
7. Goal ↔ Plan links remain intact
8. Historical data remains visible

Archival is **not reversible** in v1.

---

## 4. What Archiving a Plan Does NOT Do

Archiving a Plan does NOT:

* Delete tasks
* Delete stages
* Delete goal links
* Alter task completion history
* Alter goal progress history
* Remove data from analytics windows

Archival freezes structure — it does not rewrite time.

---

## 5. Task Interaction Rules

### 5.1 Existing Tasks

Tasks inside an archived plan:

* Remain visible in historical views
* Retain `completed_at` values
* Retain assignment history
* Retain due dates

Tasks **cannot**:

* Be edited
* Be reassigned
* Be reopened
* Be moved

### 5.2 Completion Timing

If a task was completed **before** `archived_at`, it counts as completed.
If a task was incomplete at `archived_at`, it remains incomplete forever.

There is no automatic completion on archival.

---

## 6. Goal Interaction Rules

Goals linked to archived plans:

* Continue to exist
* Continue to show progress
* Do NOT receive new task contributions

Goal progress is always calculated from task history:

* Tasks completed **before** archival count
* Tasks completed **after** archival are impossible

Goals may span active and archived plans simultaneously.

---

## 7. Calendar Interaction Rules

Archived Plans:

* Do NOT surface tasks in Calendar views by default
* MAY surface tasks if the user explicitly enables historical visibility

Events and Reminders:

* Are unaffected by plan archival
* Continue to appear normally

Calendar is time-based, not lifecycle-based.

---

## 8. Focus Session Interaction Rules

Focus Sessions:

* May reference tasks from archived plans
* Must not be created for archived plan tasks

If a task becomes archived while a focus session is active:

* The focus session completes normally
* The task becomes read-only afterward

Focus history is preserved.

---

## 9. Dashboard Interaction Rules

### 9.1 Active Metrics

Dashboard **active metrics** include:

* Only tasks from plans where `archived_at IS NULL`
* Only goals with at least one active linked plan

### 9.2 Historical Metrics

Dashboard **historical metrics** include:

* Tasks completed within window regardless of plan archival
* Focus sessions regardless of plan archival

The timestamp determines inclusion, not the current lifecycle state.

---

## 10. Visibility Rules

Archived Plans:

* Hidden from default Plans index
* Hidden from default Tasks view
* Hidden from default Calendar

They are accessible via:

* Explicit "Show archived" toggles
* Direct deep links

No silent resurfacing.

---

## 11. Multi-User Semantics

Plan archival:

* Is workspace-wide
* Requires sufficient role permission
* Affects all members equally

Archival is not personal preference.

---

## 12. Explicit Non-Goals

Plan archival does NOT:

* Trigger notifications
* Trigger auto-goal completion
* Trigger dashboard alerts
* Trigger task migration
* Trigger data cleanup

It is a structural boundary only.

---

## 13. Invariants (Must Never Break)

* A task’s past is immutable
* A plan’s archival timestamp is final
* Historical truth always beats UI state
* No metric may depend on boolean flags
* Time-based logic always uses timestamps

---

## 14. Why This Exists

Without `archived_at`:

* Dashboard metrics lie
* Focus streaks break
* Goal progress becomes inconsistent
* Historical analysis becomes impossible

This document exists to prevent silent corruption of meaning.

---



