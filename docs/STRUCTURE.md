# F-Plan – Source of Truth (Authoritative)

This document is the single source of truth for F-Plan.

**Implementation rule:** No structural or behavioral change is allowed unless this document is updated first.

**AI rule:** Any AI implementing features must follow this document exactly and must not improvise new concepts, fields, tables, screens, roles, or workflows.

---

## 0. Product identity

### 0.1 App purpose
F-Plan is a professional planning app to manage structured work from start to finish.

It helps users:
- Organize work into **Plans**
- Execute work through **Stages** and **Tasks**
- Track outcomes via **Goals**
- View progress and consistency via a **read-only Dashboard**

The app is intentionally:
- Not a note-taking app
- Not a whiteboard
- Not a free-form database workspace
- Not a “do-everything” project OS

### 0.2 Core philosophy
- Clear hierarchy
- Predictable behavior
- Separation between execution (Plans, Stages, Tasks) and outcomes (Goals)
- Dashboards are read-only intelligence, not control centers

### 0.3 Terminology (locked)
Use these exact terms everywhere:
- **Workspace**
- **Plan**
- **Stage** (never “bucket” or “pool”)
- **Task**
- **Goal**

---

## 1. App structure (system-level)

### 1.1 Object hierarchy (locked)
- Workspace → Plan → Stage → Task
- Goals exist alongside the hierarchy.
- Goals do not replace Plans.

### 1.2 Workspaces
Workspaces are the top-level containers.
- A workspace contains multiple plans.
- A workspace has shared users (owner + members).
- The **active workspace** determines what data the user sees.

**Current approach (development pragmatism):** The project has used Supabase auth and RLS previously, but RLS/auth complexity has blocked progress. The immediate priority is building a stable product foundation. Any choice to simplify auth/RLS must not change the data model or the user-facing behavior defined below.

### 1.3 Plans (primary object)
A Plan is the primary unit of work.

Examples:
- Launch a new poster collection
- Marketing campaign
- Website redesign
- Build F-Plan v1

Rules:
- A plan always belongs to a workspace.
- Plans have lifecycle state: **active** or **archived**.
- Plans are archived by default, not deleted.

### 1.4 Stages
Stages represent workflow phases inside a plan.

Rules:
- Stages are ordered.
- Every task inside a plan belongs to exactly one stage.
- Stages represent lifecycle phases, not priority or meaning.
- Each plan must have **at least one** stage at all times.
- Users can rename, reorder, and delete stages (but cannot delete the last remaining stage).

**Default stage set (locked):**
1. Initiating
2. Planning
3. Executing
4. Controlling and Monitoring
5. Closing

### 1.5 Tasks
Tasks are the atomic units of work.

Rules:
- A task belongs to exactly one workspace.
- A task may be unplanned (workspace-only) OR planned (inside a plan + stage).
- Tasks move between stages to represent progress.
- Tasks drive execution.

#### 1.5.1 Unplanned tasks (Inbox)
Unplanned tasks are allowed.

Rules:
- Belong to a workspace.
- Do not belong to a plan or stage yet.
- Appear in Today’s Schedule and inbox-style views.
- Do not contribute to goal progress.
- Expected to be assigned to a plan and stage eventually.

#### 1.5.2 Task required fields (locked)
A task must have:
- Name
- Description
- Date (scheduled date)
- Due date
- Priority

Constraints (locked):
- Tasks cannot exist without a due date.
- Tasks cannot exist without priority.
- Tasks cannot exist without goal links.

Completion (locked):
- A task is completed only when explicitly marked completed.

Auto-move (open/behavioral note):
- If the system later introduces a “Done” behavior, it must not violate the default stage set or change completion semantics.

### 1.6 Goals
Goals represent outcomes and success criteria.

Rules:
- Goals do not replace Plans.
- Goals do not own tasks directly.
- Goals may be linked to one or more plans.
- Plans may exist without goals.
- Goals may exist without plans.
- Goal progress is derived, never manually set.

Goal state:
- Goals may be marked completed or archived without deleting history.

#### 1.6.1 Goal progress calculation (locked direction)
Progress is **weighted by tasks in that goal**.

Definition:
- If a goal has N linked tasks, each completed task contributes **1/N**.
- Goal progress = (completed linked tasks) / (total linked tasks).

Plan success rule (locked direction):
- Plans contain goals, goals contain tasks.
- When tasks are completed, goals progress.
- When all goals are completed, the plan is considered succeeded.

Behavioral clarifications:
- If tasks are added after initial linking, the weight recalculates (N changes), and progress updates accordingly.
- If a plan linked to a goal is archived, it should not break historical goal calculations, but active productivity metrics exclude archived plans by default.

---

## 2. Views (projections of the same data)

Views are client-side representations. They do not change the underlying data model.

### 2.1 Plans Index (Plans tab)
Entry point for plans.

Rules:
- Sidebar includes a “Plans” item.
- Plans tab shows all **active** plans for the active workspace.
- Provides:
  - Title: “Plans”
  - “+ New Plan” button
  - Search input (filters by plan title, client-side)
  - View toggle: List / Grid (client-side)
- No sorting categories (no recent/pinned/recommended).
- Empty state text:
  - “No plans yet. Create one to get started.”

### 2.2 Plan Detail View (structural entry contract)
**Locked:** After creating a plan, the app redirects into the Plan Detail View and shows **Board view by default**.

When entering a plan:
- Load “everything included in the plan” (plan, stages, tasks, goals, links).

Edge cases:
- Plan with zero tasks:
  - Plan still exists as long as it has one goal under stages (as stated).
- Plan archived:
  - Still visible in Plans tab but marked completed/archived.
- No workspace access:
  - No access.

### 2.3 Board View (inside a plan)
- Primary axis: stages
- Tasks grouped by stage
- Dragging a task changes stage

### 2.4 List View (inside a plan)
- Primary axis: tasks
- Stages appear as a column or filter
- Filterable by stage, due date, completion status, priority

---

## 3. Dashboard (read-only intelligence)

### 3.1 Dashboard philosophy (locked)
Dashboard is read-only.
It answers:
- What needs attention today?
- Am I making progress?
- How consistent am I?

Aggregates across:
- All active plans
- All stages
- All tasks

Dashboard does not replace plan-level work.

### 3.2 Dashboard cards (locked)
#### 3.2.1 Today’s Schedule
- Shows tasks due today
- Excludes completed tasks
- Aggregates across all active plans
- Allows quick creation of unplanned tasks

#### 3.2.2 Goal Progress
- Displays progress toward goals
- Derived from linked plans and completed tasks

#### 3.2.3 Productivity Stats
Read-only metrics:
- Completed tasks
- Average daily focus
- Focus streak
- Completion rate

Defaults:
- Stats over last 7 days
- Only tasks from active plans included
- Archived plans excluded by default

**Note:** Exact formulas are to be implemented later, but must not contradict these definitions.

---

## 4. UX and UI design system (Liquid Glass)

### 4.1 Design goals
- “Apple aesthetics” / liquid glass feel
- Minimalist layout
- Tile/card-based surfaces
- Consistent surfaces for cards, modals, dropdowns, inputs
- Light/dark mode toggle
- Background image per theme with readability overlay

### 4.2 One source of truth (locked)
- All theme tokens live in: `src/styles/theme.css`
- Components must use CSS variables from theme.css.
- No component-level hardcoded colors unless absolutely necessary.

### 4.3 Backgrounds (locked behavior)
- App uses a theme-specific background image:
  - Light background image
  - Dark background image
- Background is always behind everything.
- A readability overlay is applied via CSS variable `--bg-overlay`.

### 4.4 Glass surface recipe (exact numbers)
These are the glass variables currently defined in `src/styles/theme.css`.

#### Light theme glass tokens
- `--glass-bg: rgba(255, 255, 255, 0.38)`
- `--glass-border: rgba(255, 255, 255, 0.55)`
- `--glass-highlight: rgba(255, 255, 255, 0.45)`
- `--glass-shadow: rgba(0, 0, 0, 0.10)`
- `--glass-blur: 24px`
- `--glass-bg-heavy: rgba(255, 255, 255, 0.48)`
- `--glass-border-heavy: rgba(255, 255, 255, 0.60)`
- `--glass-blur-heavy: 32px`
- `--bg-overlay: rgba(255, 255, 255, 0.28)`

#### Dark theme glass tokens
- `--glass-bg: rgba(20, 20, 22, 0.42)`
- `--glass-border: rgba(255, 255, 255, 0.12)`
- `--glass-highlight: rgba(255, 255, 255, 0.10)`
- `--glass-shadow: rgba(0, 0, 0, 0.45)`
- `--glass-blur: 28px`
- `--glass-bg-heavy: rgba(18, 18, 20, 0.55)`
- `--glass-border-heavy: rgba(255, 255, 255, 0.14)`
- `--glass-blur-heavy: 36px`
- `--bg-overlay: rgba(0, 0, 0, 0.40)`

### 4.5 Glass application rules (locked)
Every surface must use a consistent pattern.

#### 4.5.1 Card (standard)
- Background: `var(--glass-bg)`
- Border: `1px solid var(--glass-border)`
- Backdrop blur: `blur(var(--glass-blur))`
- Shadow: `0 12px 30px var(--glass-shadow)`
- Highlight: subtle top-edge highlight using `--glass-highlight`

#### 4.5.2 Card (heavy)
Used for:
- Modals
- Popovers / dropdown menus
- Side sheets

- Background: `var(--glass-bg-heavy)`
- Border: `1px solid var(--glass-border-heavy)`
- Backdrop blur: `blur(var(--glass-blur-heavy))`
- Shadow: stronger depth but still derived from `--glass-shadow`

#### 4.5.3 Inputs
Inputs must not look “solid”.
- Background should be a lighter glass variant (still translucent)
- Border uses glass border
- Focus ring must be soft and theme-consistent

### 4.6 Dropdown and menu behavior (locked)
- Workspace menu and profile menu must not open on top of each other.
- Each menu opens anchored below its icon.
- Menus must open **1mm below the header** (tiny gap).
- Header must not expand when menus open.
- Menus close when:
  - pressing ESC
  - clicking anywhere outside

### 4.7 Avatar / profile image UX (locked intent)
- Avatar is circular.
- The cropper must preserve what the user sees when saving.
- Previous bug: moving the image during crop caused saved image to shift to bottom-right.
- Target behavior: saved avatar matches preview exactly.

---

## 5. Engineering constraints (locked)

### 5.1 No improvisation policy
When implementing any feature, AI must:
- Use existing patterns in the codebase
- Use existing glass/theme tokens
- Avoid introducing new UI paradigms
- Avoid inventing new tables/fields/roles

### 5.2 Output requirements for AI implementation
Every implementation response must include:
- Files created
- Files changed
- What to run to verify
- If something is missing, stop and ask instead of guessing

### 5.3 Git and safety
- Use `.gitignore` to exclude secrets and build artifacts.
- Use `.env.local` for local secrets.
- Commit after each stable milestone.

---

## 6. Decisions explicitly not made (do not implement)

- No templates system until core plan system is stable
- No Microsoft “buckets” terminology
- No sorting categories in Plans Index (recent/pinned/recommended)
- No dashboard as a control center
- No manual goal progress input
- No role-based restrictions beyond basic membership (for now)
- No redesign of UI while implementing core structure

---

## 7. Implementation sequencing (locked direction)

Build foundation first, then expand:
1. Auth + Workspace context (stable active workspace)
2. Plans Index (active plans + create plan entry)
3. Plan creation: inserts plan + default stages, then redirect to Plan Detail View (Board default)
4. Plan Detail View: load plan + stages + tasks + goals
5. Task creation and stage movement
6. Goal linking and goal progress
7. Dashboard aggregation
8. Templates (future)

---

## 8. How to prevent AI style drift (operational rule)

When asking an AI to add UI:
- Provide this document first.
- Then provide a single task prompt.
- Require it to reuse existing CSS variables and existing components.
- Reject any output that introduces new styling tokens outside `theme.css`.

---

**End of authoritative document.**

