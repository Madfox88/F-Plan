GOALS_LINKING_FLOW.md (Authoritative)

This document defines the only allowed interaction model for linking Goals and Plans.

It is authoritative.

1. Core Principle

Goals do not own tasks.
Goals do not contain plans.

Goals reference plans to explain why they exist.

2. Data Relationship

Goals ↔ Plans is many-to-many

Implemented via plan_goals join table

No direct Goal → Task relationship

3. Where Linking Happens

Linking is allowed in exactly two places:

Goal Detail View

Plan Detail View

No other surface may create or modify links.

4. Linking from Goal → Plan

Flow:

User opens a Goal Detail view

Clicks "Link Plan"

Modal opens listing existing plans only

User selects one or more plans

Confirms

Result:

Rows inserted into plan_goals

Goal progress updates automatically

5. Linking from Plan → Goal

Flow:

User opens Plan Detail

Opens Goal association control

Selects existing goal(s)

Confirms

No goal creation is allowed here.

6. Unlinking Rules

Unlinking is allowed from either side

Unlinking does NOT delete goals or plans

Progress updates immediately

7. Constraints

The linking flow must NOT:

Create new plans

Create new goals implicitly

Auto-link plans to goals

Suggest goals based on content

8. Visual Rules

Linking UI is minimal and reversible

No drag-and-drop

No complex selectors

9. Failure States

If a linked plan is archived:

It no longer contributes to progress

If all plans are unlinked:

Goal remains with 0% progress

10. Enforcement Rule

If any implementation:

Links tasks directly to goals

Allows manual progress editing

Auto-creates goals or plans

Hides the link relationship

Then the implementation is invalid.

This document defines the complete and final linking model for Goals in F-Plan.

