# DASHBOARD_RULES.md
## F-Plan — Dashboard Rules (Authoritative)

This document defines the exact purpose, scope, data sources, and behavior of the Dashboard in F-Plan.

The Dashboard is **read-only intelligence**.
It is not a control center.
It is not a planning surface.
It is not a productivity game.

If something is not defined here, it does not exist.

---

## 1. Purpose

The Dashboard answers one question only:

> “What is happening right now, and how am I doing?”

It exists to provide:
- Orientation
- Awareness
- Reflection

It does NOT exist to:
- Create data
- Edit data
- Apply pressure
- Compare users
- Optimize performance competitively

---

## 2. Perspective & Scope

### 2.1 Perspective

The Dashboard is rendered from the **current user’s perspective**.

All data shown is:
- Either owned by the user
- Or directly relevant to the user through assignment or participation

There is no workspace-wide aggregate Dashboard view.

---

### 2.2 Visibility Rules

The Dashboard shows:

- Tasks **assigned to the current user**
- Goals **the user contributes to**
- Focus sessions **belonging to the user**
- Calendar items **visible to the user**

The Dashboard never shows:
- Other users’ productivity stats
- Comparative metrics
- Rankings or leaderboards

---

## 3. Dashboard Sections (Fixed)

The Dashboard contains exactly **four sections**, in this order:

1. Today’s Schedule
2. Active Goals Progress
3. Productivity Stats
4. Focus Session Entry Point

No additional sections are allowed.

---

## 4. Today’s Schedule

### 4.1 What it shows

- Tasks assigned to the user that are:
  - Due today
  - Overdue
- Calendar Events occurring today
- Reminders scheduled for today

All items are read-only.

---

### 4.2 Behavior

- Items are grouped by type: Tasks, Events, Reminders
- Clicking an item opens a **read-only detail popup**
- No creation or editing is allowed from the Dashboard

---

### 4.3 Time Rules

- “Today” is based on the user’s local timezone
- Dates use the user’s locale formatting

---

## 5. Active Goals Progress

### 5.1 What it shows

- Goals in state: `active`
- Only goals where:
  - The user has at least one assigned task contributing to progress

---

### 5.2 Progress Rules

- Progress is derived from:
  - Completed tasks / total linked tasks
- Progress is never manually set
- Progress is displayed as:
  - Percentage
  - Completed / total task count

---

### 5.3 Interaction

- Clicking a goal opens a **read-only goal detail popup**
- No editing or linking from the Dashboard

---

## 6. Productivity Stats

### 6.1 Metrics (Fixed)

The Dashboard shows exactly these metrics:

- Tasks completed (last 7 days)
- Completion rate (completed vs assigned tasks)
- Average daily focus (minutes)
- Focus streak (consecutive days with ≥1 focus session)

No other metrics are allowed.

---

### 6.2 Time Window Rules

- All productivity stats use a **rolling 7-day window**
- Focus streak is calculated independently and is cumulative

---

### 6.3 Calculation Rules

- Only tasks with a `completed_at` timestamp are counted
- Only tasks assigned to the user are included
- Archived plans are excluded based on `archived_at`

---

## 7. Focus Session Entry Point

### 7.1 What it is

A single entry card allowing the user to:
- Start a focus session
- Resume an active session (if any)

This is the **only interactive element** on the Dashboard.

---

### 7.2 What it does NOT do

- It does not configure sessions
- It does not show history
- It does not show analytics

Those belong elsewhere.

---

## 8. Explicit Non-Goals

The Dashboard explicitly forbids:

- Task creation
- Goal creation
- Editing of any data
- Bulk actions
- Notifications or nudges
- Gamification
- Competition
- Social comparison

If it feels like pressure, it does not belong here.

---

## 9. Design Constraints

- Must follow DESIGN_SYSTEM.md exactly
- Uses glass surfaces only
- No charts with heavy visuals
- No bright colors or alerts
- Calm, neutral, informational tone

---

## 10. Enforcement Rule

If an implementation:
- Allows editing
- Shows other users’ productivity
- Introduces competitive metrics
- Adds creation actions

Then the implementation is incorrect.

This document is the single source of truth for the Dashboard.