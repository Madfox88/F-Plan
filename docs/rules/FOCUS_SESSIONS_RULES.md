# Focus Sessions — Rules & Canonical Definition

> This document defines the **only valid interpretation** of Focus Sessions in F-Plan.
> If a feature contradicts this file, the feature is wrong.

---

## 1. Purpose & Philosophy

Focus Sessions exist to answer **one question only**:

> “How much intentional, uninterrupted work time did I spend?”

They are **not**:
- A productivity competition
- A performance metric for managers
- A task completion proxy
- A behavioral nudge system
- A gamification mechanic

Focus Sessions provide **self-awareness**, not pressure.

---

## 2. Core Definition

A **Focus Session** is a **user-initiated, time-bounded period of intentional focus**.

It has:
- A clear start
- A clear end
- A measurable duration
- A single owner (user)

It may optionally be *contextualized*, but context is never required.

---

## 3. Ownership & Visibility

### 3.1 Ownership

- Every Focus Session belongs to **exactly one user**
- A Focus Session can never be shared
- A Focus Session can never be transferred

Schema implication:
- `focus_sessions.user_id` is required
- No workspace-level ownership

---

### 3.2 Visibility Rules

| Viewer | Can See |
|------|--------|
| Session owner | ✅ Full visibility |
| Workspace admin | ❌ No visibility |
| Other members | ❌ No visibility |
| Dashboard (workspace) | ❌ No aggregation |

**Focus data is always personal.**

There is no team focus view.
There is no comparative focus chart.
There is no leaderboard.

---

## 4. Linking & Context (Optional)

A Focus Session **may** reference:
- A task
- A plan
- A goal

But:
- Linking is optional
- Only one context reference is allowed
- Context is informational only

### 4.1 Context Priority

If multiple IDs are supplied (should not happen), resolution priority is:

1. task_id
2. plan_id
3. goal_id

UI must prevent selecting more than one.

---

## 5. Duration Rules

### 5.1 Start & End

- `started_at` is set when the session begins
- `ended_at` is set explicitly by user action
- Sessions do not auto-end on navigation

### 5.2 Minimum Duration

- Minimum valid duration: **5 minutes**
- Sessions shorter than 5 minutes are discarded silently

### 5.3 Maximum Duration

- Maximum single session: **4 hours**
- If exceeded:
  - Session auto-ends at 4 hours
  - UI shows a gentle notice (not an alert)

### 5.4 Pausing

- No pause state exists in v1
- Stopping and restarting creates a new session

---

## 6. Streak Logic

### 6.1 Definition

A **Focus Streak** is:

> Consecutive calendar days with **at least one valid focus session**

### 6.2 Rules

- Calendar day is determined by **user’s local timezone**
- Any duration ≥ 5 minutes qualifies
- Multiple sessions in one day still count as **one streak unit**
- Missing a day resets the streak to zero

### 6.3 Weekends

- Weekends count
- There is no “business day” logic
- Streaks are calendar-based, not work-based

---

## 7. Average Daily Focus

### 7.1 Definition

Average Daily Focus is calculated as: Total focused minutes in window ÷ number of calendar days in window

### 7.2 Window

- Default window: **last 7 calendar days**
- Zero-focus days are included
- This avoids inflated averages

---

## 8. Completion Rate Relationship

Focus Sessions:
- Do **not** affect task completion
- Do **not** modify goal progress
- Do **not** auto-complete anything

They are observational, not causal.

---

## 9. Dashboard Usage

Focus Sessions may appear on the Dashboard as:

- Total focus time (7d)
- Current streak
- Average daily focus

They must:
- Be visually neutral
- Avoid motivational language
- Avoid warnings, alerts, or nudges

---

## 10. Explicit Non-Features (Locked)

Focus Sessions will **never** include:

- Pomodoro enforcement
- Break timers
- Notifications or reminders
- Team comparisons
- Manager visibility
- AI scoring or “focus quality”
- Automatic tracking
- Idle detection
- App usage monitoring

---

## 11. Schema Requirements (Canonical)

Required table:

`focus_sessions`

Required columns:

- id (uuid, pk)
- user_id (uuid, fk → users.id)
- workspace_id (uuid, fk → workspaces.id)
- started_at (timestamptz, required)
- ended_at (timestamptz, nullable until end)
- duration_minutes (integer, derived on end)
- task_id (uuid, nullable)
- plan_id (uuid, nullable)
- goal_id (uuid, nullable)
- created_at (timestamptz)

---

## 12. Mental Model (One Sentence)

> Tasks measure **what** you did.  
> Goals measure **why** you did it.  
> Focus Sessions measure **how present you were while doing it**.

That’s it. Nothing more.

---

## 13. Lock Statement

This file is **authoritative**.

Any future feature touching focus:
- Must reference this file
- Must not weaken privacy
- Must not introduce pressure mechanics
- Must not reinterpret streaks or averages

If a feature conflicts with this document, the feature is rejected.