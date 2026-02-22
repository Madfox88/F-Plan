F-Plan – Plan Pinning Behavior (Authoritative)

This document defines the exact behavior, scope, and UI rules for plan pinning in F-Plan.

It is authoritative. No additional pinning behavior, UI, or logic may be added unless this document is updated.

⸻

1. Purpose

Plan pinning exists to provide fast, persistent access to frequently used plans.

Pinning is a navigation aid, not a status, priority, or organizational feature.

⸻

2. Conceptual Definition

A pinned plan is:
	•	Still an ordinary plan
	•	Still listed normally in the Plans view
	•	Made accessible from the sidebar for quick navigation

Pinning does not:
	•	Change plan ordering
	•	Change plan status
	•	Change plan visibility rules
	•	Affect dashboards or analytics

⸻

3. Data Model

3.1 Field

The plans table includes exactly one pin-related field:

Column	Type	Default	Notes
is_pinned	boolean	false	Indicates whether the plan is pinned

No additional fields, tables, or timestamps are allowed.

⸻

4. Scope Rules
	•	Pinning is workspace-scoped
	•	A plan can be pinned or unpinned independently in each workspace
	•	Multiple plans may be pinned simultaneously
	•	There is no pin limit

⸻

5. UI Entry Points

5.1 Plans Index (Primary Control)
	•	Each plan card displays a pin icon
	•	The pin icon:
	•	Is visible on hover
	•	Is filled when pinned
	•	Is outlined when unpinned

Clicking the icon toggles pin/unpin.

⸻

6. Sidebar Representation

6.1 Location

Pinned plans appear in the sidebar:
	•	Directly under the “Plans” item
	•	As a simple vertical list

Example order:

Dashboard
Plans
  • Pinned Plans
    – Q1 Strategy
    – Personal Growth
Goals
Tasks
Calendar


⸻

6.2 Visual Rules

Pinned sidebar items:
	•	Use the same typography as other sidebar items
	•	Do not use icons beyond standard plan indicators
	•	Do not use badges, highlights, or colors

Pinned plans are visible but not emphasized.

⸻

7. Interaction Rules
	•	Clicking a pinned plan:
	•	Navigates directly to that plan
	•	Opens the Plan Detail View (default board view)
	•	Unpinning a plan:
	•	Removes it from the sidebar immediately
	•	Does not affect current navigation state

⸻

8. Ordering Rules
	•	Pinned plans are displayed in creation order
	•	No drag-and-drop reordering
	•	No manual sorting

⸻

9. Explicit Non-Features

Pinning does NOT include:
	•	Pin limits
	•	Auto-pinning
	•	Smart pin suggestions
	•	Dashboard widgets
	•	Separate “Pinned Plans” page
	•	Analytics or usage tracking

⸻

10. Enforcement Rule

If any implementation:
	•	Adds UI beyond what is defined
	•	Changes plan ordering due to pinning
	•	Introduces new pin-related data
	•	Adds visual emphasis to pinned plans

Then the implementation is incorrect.

This document is the single source of truth for plan pinning in F-Plan.