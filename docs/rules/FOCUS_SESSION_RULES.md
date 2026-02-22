# FOCUS_SESSION_RULES.md
## F-Plan — Focus Session Rules (Authoritative)

This document defines the logic, lifecycle, and constraints of the Focus Session mini-app.

Focus sessions exist to support **deep, intentional work**.
They do not exist to optimize output or pressure performance.

---

## 1. Purpose

A Focus Session answers:

> “Am I intentionally working on something right now?”

It exists to:
- Encourage single-task focus
- Provide gentle reflection data
- Support habit formation without coercion

---

## 2. Core Definition

A Focus Session is:

- A timed interval of intentional focus
- Owned by a single user
- Optionally linked to:
  - A task
  - A plan
  - A goal

Linking is optional.

---

## 3. Session Lifecycle

### 3.1 States

A session has exactly three states:

- `active`
- `completed`
- `abandoned`

---

### 3.2 Start

When a session starts:
- `started_at` is recorded
- State becomes `active`

Only one active session is allowed per user.

---

### 3.3 End

A session ends when:
- The user manually ends it
- The timer completes

On end:
- `ended_at` is recorded
- Duration is calculated
- State becomes `completed`

---

### 3.4 Abandonment

If a session is interrupted and not completed:
- State becomes `abandoned`
- Duration may still be recorded
- Abandoned sessions do not count toward streaks

---

## 4. Duration Rules

- Minimum duration: 5 minutes
- Maximum duration: unlimited
- Duration is always derived from timestamps

No manual duration entry is allowed.

---

## 5. Focus Streak Rules

### 5.1 Definition

A Focus Streak is:
- Consecutive calendar days
- Where the user completed at least one focus session

---

### 5.2 Rules

- Streak resets if a full day passes with no completed session
- Abandoned sessions do not count
- Timezone is the user’s local timezone

---

## 6. Average Daily Focus

- Calculated over a rolling 7-day window
- Includes days with zero focus
- Measured in minutes

---

## 7. Linking Rules

- Sessions may optionally link to:
  - Task
  - Plan
  - Goal
- Linking does not affect:
  - Progress
  - Completion
  - Metrics beyond aggregation

---

## 8. Visibility & Privacy

- Focus sessions are always private
- No other user can see:
  - Session duration
  - Streaks
  - Focus history

Workspace owners do not have access.

---

## 9. UI Constraints

- The Focus mini-app is intentionally minimal
- Shows:
  - Timer
  - Current state
  - Optional linked item
- No analytics in-session
- No historical graphs in-session

Analytics live elsewhere.

---

## 10. Explicit Non-Goals

Focus Sessions do NOT include:

- Pomodoro enforcement
- Break policing
- Alerts or guilt nudges
- Social sharing
- Competitive mechanics

---

## 11. Enforcement Rule

If an implementation:
- Forces focus durations
- Compares users
- Applies pressure
- Gamifies focus

Then it violates F-Plan’s core philosophy.

This document is the single source of truth for Focus Sessions.