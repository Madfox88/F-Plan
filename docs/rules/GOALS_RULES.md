F-Plan – Goals Rules (Authoritative)

This document defines the conceptual rules, lifecycle, and constraints for Goals in F-Plan.

It is the single source of truth for how Goals behave.
No UI, backend logic, or AI implementation may deviate from this document unless it is explicitly updated.

⸻

1. Purpose of Goals

Goals exist to answer “why am I doing this work?”

They represent desired outcomes, not work containers, not tasks, and not timelines.

Goals provide meaning and direction to Plans, without interfering with execution.

Goals do not replace Plans or Tasks. They sit above them conceptually.

⸻

2. Core Philosophy
	•	Goals are outcome-oriented, not action-oriented
	•	Goals never own tasks directly
	•	Goals never control execution
	•	Goals never lie about progress

Goals are deliberately restrained to avoid becoming a second planning system.

⸻

3. Goal Lifecycle (Locked)

A Goal may exist in exactly one of the following states:

3.1 Active
	•	Goal is currently relevant
	•	Accepts linked plans
	•	Progress is calculated and displayed
	•	Shown by default in the Goals tab

3.2 Paused
	•	Goal still matters, but is not actively pursued
	•	Accepts linked plans
	•	Progress continues to be calculated but is visually deemphasized
	•	No emotional pressure implied by lack of progress

3.3 Completed
	•	Goal has been achieved
	•	Progress is locked at 100%
	•	No new plans may be linked
	•	Existing plan links are preserved for historical accuracy
	•	Goal is read-only

3.4 Archived
	•	Goal is no longer relevant
	•	Hidden from default views
	•	Read-only
	•	Preserved only for historical reference

There are no other states.

The system explicitly forbids:
	•	Failed
	•	Cancelled
	•	Abandoned
	•	Overdue

Goals are not judged. They are contextualized.

⸻

4. Linking Rules (Goal ↔ Plan)

4.1 Relationship Model
	•	A Goal may link to multiple Plans
	•	A Plan may link to multiple Goals
	•	The relationship is managed via the plan_goals join table

4.2 Linking Authority
	•	Linking and unlinking is always initiated from the Goal context
	•	Plans do not auto-link themselves to goals
	•	No automatic or AI-suggested linking is allowed

4.3 Unlinking Behavior
	•	Unlinking a plan:
	•	Does not delete any data
	•	Immediately recalculates goal progress
	•	Requires no confirmation beyond the user action

4.4 Zero-Link Rule
	•	A Goal may exist with zero linked plans
	•	Such goals show progress as 0%
	•	This allows aspirational or preparatory goals to exist without forced structure

⸻

5. Progress Calculation (Non-Negotiable)

5.1 Source of Truth

Goal progress is always derived.

It is calculated as:

Completed tasks across all linked plans
÷
Total tasks across all linked plans

5.2 Rules
	•	Progress is never manually editable
	•	No sliders
	•	No overrides
	•	No confidence estimates
	•	No forecasting

If progress is 3%, the system shows 3%.
If progress is 0%, the system shows 0%.

The app does not perform emotional smoothing.

⸻

6. Scope Boundaries

Goals:
	•	Do NOT own tasks
	•	Do NOT define stages
	•	Do NOT define deadlines
	•	Do NOT enforce priority
	•	Do NOT control task order

Goals influence meaning, not mechanics.

⸻

7. Goals Tab Responsibilities

The Goals tab exists to:
	•	Show all goals and their current state
	•	Show linked plans per goal
	•	Show derived progress
	•	Allow linking and unlinking of plans
	•	Allow lifecycle state changes

It is not an execution surface.

⸻

8. Explicit Non-Features

Goals explicitly do NOT include:
	•	Task lists
	•	Task checkboxes
	•	Drag-and-drop
	•	Charts or analytics
	•	Timelines or roadmaps
	•	Due dates
	•	Priority levels
	•	Dashboards
	•	Notifications
	•	Automation

Any implementation adding these is incorrect.

⸻

9. Relationship to Other Tabs
	•	Plans answer: What am I working on?
	•	Tasks answer: What do I need to do now?
	•	Goals answer: Why does this work matter?

Each tab serves a distinct cognitive mode.

⸻

10. Enforcement Rule

Any implementation that:
	•	Adds goal-owned tasks
	•	Allows manual progress edits
	•	Introduces goal priorities or deadlines
	•	Turns Goals into a planning container

Is invalid.

This document is authoritative.

Design clarity is a feature.