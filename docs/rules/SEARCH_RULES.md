# Search — Design & Functionality Rules

> Canonical reference for all search/filter toolbars across the app.
> Every new tab or view that adds a search feature **must** follow these rules.

---

## Trigger Button

| Property | Value |
|---|---|
| **Icon** | Magnifying glass (`search.svg`) |
| **Size** | 32 × 32 px |
| **Background** | `var(--glass-bg)` |
| **Border** | `1px solid var(--glass-border)` |
| **Border radius** | `var(--radius-sm)` (8px) |
| **Hover** | `background: var(--glass-bg-heavy)` — no glow, no scale |
| **Active state** | `background: var(--primary-color)` with `opacity: 0.15` tint |
| **Tooltip** | Required — `"Search <entity>"` (e.g. "Search goals", "Search plans") |
| **Visibility** | Hidden when the list has zero items — no point searching nothing |
| **Position** | Left side of the toolbar row, before filter pills |

---

## Search Input

| Property | Value |
|---|---|
| **Appears on** | Click of the trigger button (toggle) |
| **Animation** | Slide-in from left, 200ms ease |
| **Placeholder** | `"Search <entity>..."` (e.g. "Search goals...") |
| **Background** | `var(--glass-bg)` |
| **Border** | `1px solid var(--glass-border)` → `var(--primary-color)` on focus |
| **Border radius** | `var(--radius-sm)` (8px) |
| **Font** | `var(--font-size-base)`, weight 400, `var(--text-primary)` |
| **Padding** | `8px 12px` |
| **Width** | `100%` of available toolbar space (flex: 1) |
| **Clear behavior** | Pressing Escape or clicking the trigger again clears the term and hides the input |
| **Debounce** | None — filter on every keystroke (lists are client-side) |

---

## Filter Scope

| Rule | Detail |
|---|---|
| **What it searches** | Entity **title** only (not description, not tags, not metadata) |
| **Case sensitivity** | Case-insensitive (`toLowerCase()` comparison) |
| **Tab awareness** | Filters within the currently active tab only (e.g. Active goals, Completed plans) |
| **Empty result** | Show centered empty state: `"No results for '<term>'"` — same styling as the tab's standard empty state |

---

## Additional Filters (Optional)

If the view has extra filter controls (e.g. status dropdown, tag filter), they follow these rules:

| Property | Value |
|---|---|
| **Position** | Right of the search input, same row |
| **Appearance** | Standard dropdown per `DROPDOWN_RULES.md` |
| **Interaction with search** | Filters stack — search term AND dropdown filter both apply simultaneously |
| **Reset** | Closing the search bar resets the search term but does NOT reset dropdown filters |

---

## Shared Component

All search toolbars should use the same reusable component pattern:

```tsx
<SearchToggle
  entity="goals"              // used for tooltip + placeholder
  searchTerm={searchTerm}
  onSearchChange={setSearchTerm}
  visible={items.length > 0}  // hidden when no data
/>
```

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `entity` | `string` | Yes | Entity name for labels ("goals", "plans", "tasks") |
| `searchTerm` | `string` | Yes | Controlled input value |
| `onSearchChange` | `(term: string) => void` | Yes | Callback on input change |
| `visible` | `boolean` | Yes | Whether to render the trigger at all |
| `children` | `ReactNode` | No | Additional filter controls (dropdowns) rendered inline |

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| **Click trigger** | Toggle search input open/closed |
| **Escape** (while input focused) | Clear term + close input |
| **Escape** (while input empty) | Close input |

---

## Do NOT

- ❌ Add glow or gradient effects to the search input
- ❌ Use a modal or overlay for search — always inline in the toolbar
- ❌ Search across multiple entity types (each view searches its own)
- ❌ Show the search trigger when there are zero items to search
- ❌ Persist search term across tab switches — always reset on tab change
- ❌ Use a different icon — always the magnifying glass
- ❌ Add a submit/search button — filtering is live on keystroke
