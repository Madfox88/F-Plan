# Popup System — Reference Standard

> Based on the **Link Goal popup** (`LinkGoalFromPlanModal`), the approved reference implementation for all popups in F-Plan.

---

## 1. Overall Intent

The Link Goal popup allows the user to associate one or more goals with the current plan. It presents the full list of workspace goals and exposes a toggle action (Link / Unlink) on each row.

A popup is used instead of page navigation because the action is a **lightweight, reversible relationship change** — the user is not creating new data, not filling out a form, and not leaving their current context. The popup overlays the plan detail view, keeps the user oriented, and dismisses cleanly when finished.

---

## 2. Layout Anatomy

### Three-zone structure

The popup is divided into exactly three vertical zones: **header**, **body**, and **footer**. There is no sidebar, no tabs, and no secondary navigation.

### Header

- **Left:** `<h2>` title — plain text, no icon, no subtitle.
- **Right:** Close button — an `×` SVG rendered as a borderless, background-less button.
- **Layout:** `display: flex; align-items: center; justify-content: space-between`.
- **Padding:** `24px` on all sides.
- **Border:** A single `1px solid var(--glass-border)` bottom edge separates the header from the body.
- **Title style:** `18px`, weight `600`, color `var(--text-primary)`.

### Body

- **Padding:** `16px 24px` — slightly narrower vertical padding than the header to keep the content zone compact.
- **Max height:** `360px` with `overflow-y: auto` — the list scrolls internally; the popup itself does not grow unbounded.
- **Content:** A `<ul>` with no list decoration. Each `<li>` is a self-contained row (see §2.1 below).
- **Empty state:** Centered text in `var(--text-secondary)` at `var(--font-size-base)`: *"No goals available to link."*
- **Loading state:** Centered text in `var(--text-secondary)`: *"Loading goals..."*
- **Error state:** Uses the shared `.error-message` style (tinted red background, red border, red text).

### Footer

- **Contains:** A single `btn-primary` button labeled **"Done"**.
- **No secondary button.** There is no Cancel alongside Done — the user has already made their changes in real time; Done is purely a close action.
- **Alignment:** The button inherits default flow positioning (not explicitly right-aligned via flexbox in the footer itself; it relies on the `.btn-primary` inline sizing).
- **Padding:** Inherits from the `.modal-content` parent gap (`var(--space-lg)` = `24px`).

### Width

- Max width: `520px`.
- Responsive: `width: 90%` ensures it does not touch viewport edges on small screens.

---

### 2.1 List Row Anatomy

Each goal row (`.link-goal-item`) contains two horizontally arranged regions:

| Region | Contents | Layout |
|---|---|---|
| **Info (left)** | Title (primary) + optional description (secondary) stacked vertically | `flex-direction: column`, `gap: 2px`, `min-width: 0` (enables truncation) |
| **Action (right)** | A single toggle button: "Link" or "Unlink" | `flex-shrink: 0` (never compresses) |

**Row styling:**
- `padding: 10px 12px`
- `border: 1px solid var(--glass-border)` with `border-radius: var(--radius-sm)` (12px)
- `background: var(--glass-bg)` — the same translucent glass fill used throughout the system
- On hover: only `border-color` intensifies to `var(--glass-border-heavy)`; background does not change

**Title:** `var(--font-size-base)` (14px), weight `var(--font-weight-medium)` (500), `var(--text-primary)`. Single line, truncated with ellipsis.

**Description:** `var(--font-size-xs)` (12px), `var(--text-tertiary)`. Single line, truncated with ellipsis. Only rendered when present.

**Toggle button:**
- Unlinked state: `var(--glass-bg)` background, `var(--glass-border)` border, `var(--text-primary)` text. Reads **"Link"**.
- Linked state: `var(--color-active)` (#0071e3) border and text color. Background remains glass. Reads **"Unlink"**.
- Linked + hover: border and text shift to `var(--color-error)` (#ff3b30) — a subtle warning that this action will remove the link.
- Disabled (while updating): `opacity: 0.6`, `cursor: not-allowed`, text reads **"..."**.
- Sizing: `padding: 6px 14px`, `border-radius: var(--radius-sm)`, `font-size: var(--font-size-sm)` (13px).

---

## 3. Visual Hierarchy

**First read:** The title "Link Goals" in the header. It is the largest text element and the only bold heading.

**Second read:** The list of goal titles. Each row's `.link-goal-title` uses `var(--text-primary)` at medium weight — readable but not competing with the header.

**Third read:** The toggle buttons on the right edge of each row. They are small, subdued glass-style buttons. The only color accent is `var(--color-active)` on already-linked items, which creates a calm signal without demanding attention.

**How emphasis is created:**
- Typography weight and size alone separate the header from body text. No background fills, no dividers between rows, no icons in the header.
- The glass borders on each row create containment without visual weight. Rows are individually bounded but do not look like "cards" — the border is translucent, not opaque.
- Spacing (`var(--space-sm)` = 8px gap between rows) provides breathing room without creating a sparse layout.
- The description line, when present, is tertiary-colored and extra-small — visible on inspection but does not compete with the title.

---

## 4. Glass + Backdrop Behavior

### Overlay

- `position: fixed`, covers the full viewport.
- `background: var(--bg-overlay)` — light theme: `rgba(255, 255, 255, 0.28)`, dark theme: `rgba(0, 0, 0, 0.32)`.
- `backdrop-filter: blur(4px)` — a subtle frosted effect on the content behind the popup. Not heavy enough to obscure the page, just enough to create depth separation.
- `z-index: 2000` — above all other UI layers.

### Popup panel

- `background: var(--glass-bg)` — the same translucent fill used for toolbar buttons and cards. The popup does not use a heavier or more opaque background than other surfaces.
- `border: 1px solid var(--glass-border)` — the standard glass edge.
- `border-radius: 20px` — `var(--radius-lg)`. Rounded enough to feel soft, distinct from the 12px radius of elements inside it.
- `box-shadow: var(--glass-shadow), 0 20px 25px -5px rgba(0, 0, 0, 0.3)` — a compound shadow: the standard glass shadow plus a deeper drop shadow that lifts the panel off the page.
- `backdrop-filter: var(--glass-blur)` (24px) — the panel itself is frosted, meaning the blurred page content is faintly visible through it.

### Focus perception

The combination of overlay blur + panel shadow creates a clear foreground/background separation. The page behind is visible but muted — it feels "still there" rather than hidden, which reduces the sense of disruption.

---

## 5. Interaction Rules

### Opening

The popup opens when the user clicks the **"Link Goal"** button in the plan detail toolbar. The button is a standard glass-styled toolbar button (`var(--glass-bg)` background, `var(--glass-border)` border, 44px height).

### Closing — explicit

- **Done button** in the footer: closes the popup via `onClose`.
- **Close (×) button** in the header: closes via `onClose`.
- **Overlay click:** Clicking the backdrop overlay fires `onClose`. The popup panel uses `stopPropagation` to prevent clicks inside it from triggering this.

### Closing — implicit

There is no auto-close behavior. The popup remains open until the user explicitly dismisses it. This is intentional: the popup supports multiple toggle actions in sequence (link goal A, unlink goal B, link goal C, then Done), so premature closure would interrupt the workflow.

### Keyboard

- No explicit focus trapping is implemented.
- No `Escape` key handler is explicitly bound (browser default behavior applies if the overlay handles it).
- No `Enter` key handler on the Done button beyond native `<button>` behavior.

### Real-time updates

Each Link/Unlink toggle takes effect immediately via an API call. There is no "save" step. The `onChanged` callback fires after each toggle, allowing the parent view to update its display (e.g., the linked goal pills in the toolbar). The Done button is purely a close action, not a confirmation.

---

## 6. Tone and Restraint

### Why it feels calm

- **No icons in the header.** The title is plain text. There is no link icon, no goal icon, no decorative element.
- **No status badges on rows.** Goals are listed by title and optional description only. Progress bars, completion percentages, dates, and tags — all of which exist on goal cards elsewhere — are deliberately excluded.
- **No confirmation dialogs.** Linking and unlinking happen with a single click. There is no "Are you sure?" step. The action is low-risk and reversible, so friction is inappropriate.
- **No success toasts or animations.** After a toggle, the button text changes and the linked state updates. There is no green checkmark, no slide animation, no celebratory feedback.
- **No color fills.** The only color in the entire popup is the blue `var(--color-active)` accent on linked items and the red `var(--color-error)` hover hint on unlink. Everything else is glass transparency, white/black text, and translucent borders.
- **No action count.** The popup does not display "3 goals linked" or similar aggregate feedback. The state is visible in each row's button label.

### What it avoids

- Heavy modal chrome (thick title bars, colored headers, icon clusters)
- Primary/danger button styling on destructive actions — unlinking uses a color-only hint, not a red filled button
- Multi-step flows — there is no "select then confirm" pattern
- Explanatory text — there is no description paragraph explaining what linking means

---

## 7. Reusability Signals

### Clearly reusable as a system

These aspects are structural and apply to any popup in F-Plan:

| Aspect | Implementation |
|---|---|
| **Overlay** | `.modal-overlay` — fixed, full-viewport, `var(--bg-overlay)` background, `backdrop-filter: blur(4px)`, click-to-close |
| **Panel** | `.modal-content` — `var(--glass-bg)` background, `var(--glass-border)` border, `border-radius: 20px`, compound shadow, `backdrop-filter: var(--glass-blur)`, slide-up entrance animation, `width: 90%` with a max-width |
| **Header** | `.modal-header` — flex row, space-between, `24px` padding, bottom border, `<h2>` title (18px/600), `×` close button |
| **Close button** | `.close-button` — borderless, background-less, `var(--text-secondary)` color, hover to `var(--text-primary)`, 24×24 SVG |
| **Footer** | `.modal-footer` — contains the terminal action button(s) |
| **Entrance animation** | `slideUp` keyframes — `translateY(20px)` to `translateY(0)` with opacity fade, 300ms ease-out |
| **List row pattern** | Glass-bordered row with left info column and right action button, hover border intensification |

### Contextual to linking goals specifically

These aspects are specific to this popup's purpose and would differ in other popups:

- The title text ("Link Goals")
- The list data source (goals from the workspace)
- The two-state toggle button (Link / Unlink) with active/error color semantics
- The absence of a secondary footer button (no Cancel — appropriate here because changes are real-time, but a form popup would need Cancel/Submit)
- The `max-width: 520px` (other popups may be narrower or wider depending on content)
- The `max-height: 360px` scrollable body (form popups may not need a fixed body height)
- The real-time mutation pattern (toggle → API call → state update → `onChanged`)

---

## Token Reference

For convenience, the exact design tokens used by the Link Goal popup:

| Token | Light Value | Dark Value | Usage |
|---|---|---|---|
| `--glass-bg` | `rgba(255,255,255,0.38)` | `rgba(28,28,32,0.62)` | Panel background, row background, button background |
| `--glass-border` | `rgba(255,255,255,0.55)` | `rgba(255,255,255,0.18)` | Panel border, row border, button border, header divider |
| `--glass-border-heavy` | `rgba(255,255,255,0.60)` | `rgba(255,255,255,0.22)` | Row hover border, button hover border |
| `--glass-bg-heavy` | `rgba(255,255,255,0.48)` | `rgba(32,32,36,0.72)` | Button hover background |
| `--glass-blur` | `24px` | `22px` | Panel backdrop-filter |
| `--glass-shadow` | `rgba(0,0,0,0.10)` | `rgba(0,0,0,0.35)` | Part of compound panel shadow |
| `--bg-overlay` | `rgba(255,255,255,0.28)` | `rgba(0,0,0,0.32)` | Overlay background |
| `--color-active` | `#0071e3` | `#0071e3` | Linked-state border + text |
| `--color-error` | `#ff3b30` | `#ff3b30` | Unlink hover hint |
| `--text-primary` | `#000000` | `#ffffff` | Title, row title, button text |
| `--text-secondary` | `rgba(0,0,0,0.60)` | `rgba(255,255,255,0.60)` | Close button, empty/loading text |
| `--text-tertiary` | `rgba(0,0,0,0.40)` | `rgba(255,255,255,0.40)` | Row description |
| `--radius-sm` | `12px` | `12px` | Row corners, button corners |
| `--radius-lg` | `20px` | `20px` | Panel corners |
| `--transition-fast` | `150ms ease-out` | `150ms ease-out` | All hover/state transitions |
| `--space-sm` | `8px` | `8px` | Row list gap |
| `--space-lg` | `24px` | `24px` | Empty/loading padding |
| `--font-size-xs` | `12px` | `12px` | Row description |
| `--font-size-sm` | `13px` | `13px` | Toggle button text |
| `--font-size-base` | `14px` | `14px` | Row title, empty/loading text |
