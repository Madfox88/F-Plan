GOALS_UI_CONTRACT.md (Authoritative)

This document defines exactly what the Goals UI in F-Plan is allowed to show and do.
It is authoritative.

Goals represent outcomes, not containers, not projects, and not task lists.
The UI must never blur this distinction.

1. Purpose of the Goals UI

The Goals tab exists to answer one question:

Why am I doing this work?

It provides outcome-level clarity across plans and tasks without becoming a planning or execution surface.

The Goals UI is interpretive, not operational.

2. What the Goals UI IS

The Goals UI is allowed to:

Display goals as first-class entities

Show progress derived from linked plans and their tasks

Show which plans contribute to a goal

Show high-level execution signals (on track / stalled / at risk)

Allow navigation to plans, not editing of plans

3. What the Goals UI IS NOT

The Goals UI must NOT:

Create or manage tasks

Reorder plans or stages

Act as a dashboard with analytics or charts

Replace the Plans or Tasks tabs

Allow manual progress input

Become a second planning layer

If a user wants to do work, they leave the Goals tab.

4. Allowed UI Elements

4.1 Goals Index

Each goal card may display:

Goal title

Optional description

Progress indicator (derived)

Number of linked plans

High-level status (derived only)

No task lists are shown here.

4.2 Goal Detail View

A Goal Detail view may display:

Goal title and description

Progress bar (derived from linked tasks)

List of linked plans

For each linked plan:

Plan title

Completion percentage

Task count (total / completed)

No stages or individual tasks are shown.

5. Progress Rules (UI-Level)

Progress is always computed

Progress is never editable

Progress updates reactively when tasks change

If no plans are linked, progress is shown as 0% with a neutral state.

6. Navigation Rules

Allowed navigation:

Goal → Plan Detail

Goal → Plans tab (filtered by linked plans)

Disallowed navigation:

Goal → Task modal

Goal → Stage view

7. Empty & Edge States

No goals exist:

Calm empty state explaining what goals are

Goal exists but has no linked plans:

Display goal with 0% progress and guidance text

No CTAs that create tasks or plans.

8. Visual Constraints

Must use existing liquid-glass design system

No new colors, shadows, or typography

Goals should feel lighter than Plans visually

9. Enforcement Rule

If the Goals UI:

Allows editing tasks

Allows manual progress input

Shows detailed task lists

Competes with Plans or Tasks

Then the implementation is incorrect.

This document is the UI contract for Goals in F-Plan.