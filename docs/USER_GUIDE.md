# F-Plan — User Guide

Welcome to **F-Plan**, your professional planning companion. This guide covers every feature so you can get the most out of the app.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Navigation & Layout](#2-navigation--layout)
3. [Dashboard](#3-dashboard)
4. [Plans](#4-plans)
5. [Tasks](#5-tasks)
6. [Goals](#6-goals)
7. [Calendar](#7-calendar)
8. [Focus Sessions](#8-focus-sessions)
9. [Workspaces & Collaboration](#9-workspaces--collaboration)
10. [Profile & Account](#10-profile--account)
11. [Tips & Best Practices](#11-tips--best-practices)

---

## 1. Getting Started

### Creating an Account

1. Open F-Plan and click **Sign Up**.
2. Enter your email and a password (minimum 8 characters).
3. Confirm your email via the link sent to your inbox.
4. Log in to access your default workspace.

### Accepting an Invitation

If someone invites you to their workspace, you'll receive an email with a link. Click it and you'll be taken directly to the sign-up page. After signing up, the workspace will appear automatically.

### Resetting Your Password

Click **Forgot Password** on the login page. Enter your email, and a recovery link will be sent. Click the link and set a new password.

---

## 2. Navigation & Layout

### Sidebar

The sidebar is your primary navigation. It contains:

| Tab | What It Does |
|-----|-------------|
| **Dashboard** | At-a-glance overview of your day and productivity |
| **Goals** | Define objectives and track progress |
| **Plans** | Create and manage structured projects |
| **Tasks** | View and filter tasks across all plans |
| **Calendar** | Schedule events, reminders, and view due dates |
| **Focus** | Review your focus session history |

Below the navigation tabs, any **pinned plans** appear for quick access.

At the bottom:
- **Settings** — opens workspace settings
- **Logout** — signs you out

### Header

- **Workspace switcher** — switch between workspaces, create a new one, or rename the current one.
- **Theme toggle** — switch between light and dark mode.
- **Profile avatar** — click to go to your profile.

On mobile, a **hamburger menu** (☰) toggles the sidebar.

---

## 3. Dashboard

The Dashboard is a **read-only overview** of your day and recent activity. It contains four cards:

### Today's Schedule

Shows everything due or happening today:
- **Tasks** due today (overdue items are highlighted in red)
- **Events** with their scheduled times
- **Reminders** with their alert times

Click any item to see its full details in a read-only popup. Click **"View all →"** to jump to the Calendar.

### Active Goals Progress

Displays your goals with:
- Progress percentage and progress bar
- Completed vs. total task count

Click a goal to see its full details.

### Productivity Stats (Last 7 Days)

Four metrics updated in real time:
- **Completed Tasks** — number of tasks you finished this week
- **Completion Rate** — percentage of your assigned tasks completed
- **Avg. Daily Focus** — average focus time per day (in minutes)
- **Focus Streak** — consecutive days with at least one focus session

### Focus Session (Quick Start)

The only interactive element on the Dashboard. Start a focus session right here without leaving the page. See [Focus Sessions](#8-focus-sessions) for details.

---

## 4. Plans

Plans are the core of F-Plan. A plan is a project divided into **stages**, and each stage contains **tasks**.

### Creating a Plan

1. Click **"+ New Plan"** on the Plans page (or from any page via the global action).
2. Fill in:
   - **Title** (required)
   - **Intent** — a short sentence describing the plan's purpose
   - **Description** — any additional context
   - **Due date** — optional deadline
3. Choose a **start mode**:
   - **Blank plan** — start with no stages
   - **Suggested stages** (default) — starts with: Initiating, Planning, Executing, Controlling & Monitoring, Closing
   - **Custom stages** — define up to 6 stages of your own
4. Optionally check **"Save as draft"** to keep it in draft status.
5. Click **Create**.

### Browsing Plans

- **Search** — filter plans by title
- **Active / Hidden toggle** — switch between your active plans and archived ones
- **List / Grid view** — choose your preferred layout

Each plan card shows:
- Title, description, stage count, task count
- Status badge (Active, Draft, or Archived)
- Due date
- Pin icon

### Plan Actions (Context Menu)

Click the **⋯** menu on any plan card:
- **Open** — view the plan's detail page
- **Rename** — change the plan title
- **Pin / Unpin** — pinned plans appear in the sidebar for quick access
- **Link Goal** — connect a goal to this plan
- **Hide** — archive the plan (moves it to the Hidden tab)
- **Delete** — permanently remove the plan (requires confirmation)

### Plan Detail Page

Open a plan to see all its stages and tasks.

**View modes** (top toolbar):
- **Boards** — Kanban-style columns, one per group
- **List** — expandable sections per group
- **Grid** — compact card-based layout

**Group by** (dropdown):
- **Stages** — default, one column per stage
- **Progress** — groups: Not Started, In Progress, Completed
- **Priority** — groups: Urgent, Important, Medium, Low
- **Due Date** — groups: Overdue, Today, This Week, Next Week, This Month, Later, No Due Date

**Other actions:**
- **Search tasks** — filter tasks within the plan
- **Add Stage** — create a new stage (when grouped by stages)
- **Link Goal** — link a goal to this plan
- Linked goal names appear as pills below the toolbar

---

## 5. Tasks

### Creating a Task

1. From within a plan's detail page, click **"+ Add task"** under any stage.
2. Fill in:
   - **Task name** (required)
   - **Stage** — which stage this task belongs to
   - **Progress** — Not Started, In Progress, or Completed
   - **Priority** — Urgent, Important, Medium, or Low
   - **Start date** and **Due date**
   - **Repeat** — Do not repeat, Daily, Weekly, Monthly, Yearly, or Customized
   - **Assigned to** — select a workspace member (defaults to you)
   - **Description** — freeform notes
   - **Checklists** — add up to 10 sub-items
   - **Labels** — assign color-coded labels (defaults: Marketing, Admin, Design, Learning) or create custom ones

### Completing a Task

- Click the **checkbox** next to a task to mark it complete.
- Completing a task automatically checks all its checklist items.
- Toggling individual checklist items updates the task's status automatically:
  - All items checked → **Completed**
  - Some items checked → **In Progress**
  - No items checked → **Not Started**

This behavior is consistent across both the **Plan Detail** and **Tasks** views.

### Plan Completion Prompt

When **all tasks** in a plan are completed, a banner appears:

> 🎉 All tasks are completed! Would you like to mark this plan as complete?

You can **Complete Plan** or **Dismiss** the prompt. Completed plans remain visible in the Plans list with a "completed" status badge and can be **reopened** at any time.

### Goal Completion Prompt

When a goal reaches **100% progress** (all linked tasks completed), a prompt appears on the goal card:

> 🎉 All tasks done! → **Mark Complete**

Marking a goal as complete dims its card and shows a ✅ badge. You can **reopen** a completed goal at any time. Goals are never auto-completed — you decide when a goal is truly achieved.

### Tasks View (Cross-Plan)

The **Tasks** tab aggregates tasks from all your active plans in one place.

**Filters:**
- **Search** — by title or label name
- **Group by** — Due Date, Plan, Status, or Priority
- **Status** — All, Active, Completed
- **Due** — All, Today, Overdue, Upcoming
- **Priority** — All, Urgent, Important, Medium, Low
- **Plan** — All or a specific plan

Click a task to expand it inline for quick editing (title, due date, priority, description, checklist items).

---

## 6. Goals

Goals are high-level objectives that span across plans. Their progress is **automatically calculated** based on completed tasks in linked plans.

### Creating a Goal

1. Click **"+ New Goal"** on the Goals page.
2. Fill in:
   - **Title** (required)
   - **Description** — what you're trying to achieve
   - **Target date** — optional deadline
   - **Tags** — up to 10 colored tags for categorization (6 color options: Neutral, Blue, Green, Orange, Red, Purple)
   - **Link to Plans** — select which plans contribute to this goal's progress

### How Progress Works

Goal progress = **(completed tasks ÷ total tasks) × 100%** across all linked plans.

You don't set progress manually — it updates automatically as you complete tasks in linked plans. When progress reaches 100%, you'll be prompted to mark the goal as complete.

### Browsing Goals

- **Search** — filter by title or description
- **Due date filters** — All, No due date, This month, Next month, Overdue
- **Tag filter** — multi-select to show only goals with specific tags

Each goal card shows the title, description, progress bar with percentage, linked plan names, due date, and tags.

---

## 7. Calendar

The Calendar shows all your tasks (by due date), goals (by target date), events, and reminders in one unified view.

### Views

- **Month** — grid with day cells; up to 3 items per cell, click "+N more" to see the rest
- **Week** — all-day section for tasks/goals + 24-hour time grid for events/reminders
- **Day** — detailed timeline with positioned event blocks and reminder markers

Navigate with **‹ Previous**, **Today**, and **Next ›** buttons.

### Color Legend

- **Tasks** — shown by their due date
- **Goals** — shown by their target date
- **Events** — time-blocked entries
- **Reminders** — time markers (🔔)

### Creating Events & Reminders

Click any **empty area** on the calendar → a chooser appears asking: **Event** or **Reminder?**

**Events include:**
- Title (required)
- Start and end date/time (required)
- Location
- Notes
- Repeat rule (None, Daily, Every 2 days, Weekly, Every 2 weeks, Monthly, Every 2 months, Yearly, Every 2 years)

**Reminders include:**
- Title (required)
- Date & time (required)
- Notes
- Repeat rule (same options as events)

Click an existing event or reminder to edit or delete it.

### Recurring Items

Events and reminders can repeat on a schedule. The calendar automatically expands recurring items across the visible date range so you see every occurrence.

---

## 8. Focus Sessions

Focus sessions help you track deep-work time. There are no forced Pomodoro cycles, break timers, or notifications — just a simple timer you control.

### Starting a Session

1. On the **Dashboard**, click **"Start Focus Session"**.
2. Choose a **duration** (15, 20, 25, 30, 45, or 60 minutes, or enter a custom time).
3. Optionally link the session to a **Plan**, **Goal**, or **Task** for context.
4. Click **Start**.

### During a Session

- A live countdown timer is displayed with glowing digits.
- If you exceed the planned time, it switches to "Overtime" mode and keeps counting.
- Click **"End Session"** when you're done.

### Rules

- Sessions **under 5 minutes** are automatically discarded.
- Maximum session length is capped at **240 minutes (4 hours)**.
- There is **no pause** — if you end early and it's under 5 min, it's discarded.

### Focus Log

The **Focus** tab shows your complete session history:

**Summary stats:**
- Total Sessions
- Total Focus Time
- Daily Average
- Focus Streak (consecutive days)

**Session list:**
- Grouped by date
- Each entry shows: time range, duration, and context (e.g., "Plan: Website Redesign" or "Free focus")
- Loads 50 sessions at a time with a "Load more" button

---

## 9. Workspaces & Collaboration

Workspaces let you separate different areas of work and collaborate with others.

### Creating a Workspace

1. Click the **workspace switcher** in the header.
2. Select **"Create new workspace"**.
3. Enter a name and click **Create**.

### Switching Workspaces

Use the **workspace switcher** dropdown in the header to switch between your workspaces.

### Inviting Members

1. Open **Settings** (sidebar footer) → **Members** tab.
2. Enter the person's email address.
3. Choose a role: **Member** or **Admin**.
4. Click **Send Invite**.

An invitation email is sent, and a pending invitation appears in the list. You can also **copy the invite link** to share manually.

### Roles & Permissions

| Action | Owner | Admin | Member |
|--------|:-----:|:-----:|:------:|
| Rename workspace | ✅ | ✅ | ❌ |
| Invite members | ✅ | ✅ | ❌ |
| Revoke invitations | ✅ | ✅ | ❌ |
| Change member roles | ✅ | ❌ | ❌ |
| Remove members | ✅ | ✅* | ❌ |
| Transfer ownership | ✅ | ❌ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ |

*Admins can only remove regular members, not other admins or the owner.

### Transferring Ownership

The workspace owner can transfer ownership to another member:
1. Settings → Members tab → click **Transfer Ownership** next to the target member.
2. Confirm the action. **You will be downgraded to Admin.**

### Deleting a Workspace

Only the owner can delete a workspace, and you **cannot delete your last workspace**. All plans, tasks, goals, events, and sessions within it will be permanently removed.

---

## 10. Profile & Account

Access your profile via the **Profile** tab or clicking your avatar in the header.

### Display Name & Avatar

- Click your **avatar** to upload and crop a new profile picture.
- Hover over your **name** to edit it inline.

### Email

You can change your email. A confirmation link will be sent to the new address. The change takes effect once confirmed.

### Password

Enter a new password (minimum 8 characters) and confirm it to update.

### Export Data

Click **"Export Data"** to download a JSON file containing everything in your current workspace:
- Plans with all stages and tasks
- Goals
- Events
- Reminders
- Focus sessions

### Delete Account

1. Click **"Delete Account"**.
2. Type **DELETE** to confirm.
3. Your account and all data will be permanently removed.

> ⚠️ If you own a workspace with other members, you must **transfer ownership** first.

---

## 11. Tips & Best Practices

### Organize with the Plan → Stage → Task hierarchy
Break large projects into stages, then fill each stage with concrete tasks. This gives you a clear roadmap from start to finish.

### Pin your most important plans
Pinned plans appear in the sidebar for one-click access. Keep your top 2–3 active projects pinned.

### Link goals to plans
When a goal is linked to plans, its progress updates automatically as you complete tasks. No manual tracking needed.

### Use the Tasks view for daily work
The cross-plan Tasks tab lets you filter by "Today" or "Overdue" across all projects — a perfect daily to-do list.

### Schedule focus sessions with context
Linking a focus session to a specific plan, goal, or task helps you see where your time actually goes when reviewing the Focus Log.

### Use labels and priorities consistently
Color-coded labels and four priority levels (Urgent, Important, Medium, Low) let you quickly scan and triage work across plans.

### Review the Dashboard daily
The Today's Schedule card and Productivity Stats give you a quick pulse on what's due and how you've been performing.

### Use checklists for multi-step tasks
Break complex tasks into up to 10 checklist items. Checking them off automatically updates the task's progress status.

### Archive instead of delete
Use **Hide** to archive plans you've completed or paused. They're preserved in the Hidden tab and can be restored anytime. Alternatively, when all tasks are done, use the **completion prompt** to mark a plan as completed — it stays visible but shows its status clearly.

### Export regularly
Use the **Export Data** feature in Profile to back up your workspace data as JSON.

---

*Built with ❤️ by the F-Plan team.*
