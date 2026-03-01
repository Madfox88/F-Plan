# Tab Bar & Filter Bar — Design & Functionality Rules

> Canonical reference for all tab bars and filter pill rows across the app.
> Every new view that adds tabs or filter pills **must** follow these rules.

---

## 1. Completion Tab Bar (Active / Completed / Hidden)

Used for switching between entity states (active, completed, hidden/archived).

### Container — `.completion-tab-bar`

| Property | Value |
|---|---|
| **Height** | `44px` (matches search button) |
| **Background** | `var(--glass-bg)` |
| **Border** | `1px solid var(--glass-border)` |
| **Border radius** | `var(--radius-sm)` (8px) |
| **Padding** | `4px` internal |
| **Gap** | `4px` between buttons |
| **Width** | `fit-content` — never stretches full width |
| **Margin** | Controlled by parent layout gap — **no inline styles** |

### Tab Button — `.completion-tab-btn`

| Property | Value |
|---|---|
| **Height** | `34px` (fits inside 44px container with 4px padding) |
| **Padding** | `0 18px` |
| **Font size** | `var(--font-size-sm)` |
| **Font weight** | `500` |
| **Border radius** | `6px` |
| **Default color** | `var(--text-secondary)` |
| **Hover color** | `var(--text-primary)` |
| **Active state** | `background: var(--accent, #6366f1)`, `color: #fff` |
| **Transition** | `all 0.2s ease` |

### Count Badge — `.completion-tab-badge` (optional)

| Property | Value |
|---|---|
| **Size** | `min-width: 20px`, `height: 20px` |
| **Border radius** | `10px` (pill) |
| **Font** | `11px`, weight `600` |
| **Active** | `background: rgba(255,255,255,0.2)`, `color: #fff` |
| **Inactive** | `background: var(--glass-border)`, `color: var(--text-secondary)` |

### When to show badges

| View | Badges? | Notes |
|---|---|---|
| **Goals** | ✅ Yes | Show count in each tab |
| **Plans** | ❌ No | Too many states (active/completed/hidden) — keep clean |
| **Tasks** | ✅ Yes | Show count per status |

---

## 2. Filter Pill Bar (All / This month / Overdue / Tags)

Used for filtering within a tab — stacks with the completion tab bar, never replaces it.

### Container — `.goals-filters` / view-specific filter row

| Property | Value |
|---|---|
| **Layout** | `display: flex`, `gap: 8px`, `align-items: center` |
| **Position** | In the toolbar row, centered or right-aligned |
| **Wrap** | `flex-wrap: wrap` for responsive |

### Filter Button — `.goals-filter-btn` (or view-specific)

| Property | Value |
|---|---|
| **Height** | `44px` (matches search button and tab bar) |
| **Padding** | `0 16px` |
| **Font size** | `var(--font-size-sm)` |
| **Font weight** | `500` (default), `600` (active) |
| **Background** | `var(--glass-bg)` |
| **Border** | `1px solid var(--glass-border)` |
| **Border radius** | `var(--radius-sm)` (8px) |
| **Default color** | `var(--text-secondary)` |
| **Hover** | `color: var(--text-primary)`, `background: var(--glass-bg-heavy)` |
| **Active state** | `background: var(--glass-bg-heavy)`, `border-color: var(--glass-border-heavy)`, `color: var(--color-active)` |

### Filter Dropdown (Tags) — `.goals-filter-select`

Same dimensions as filter buttons (`44px` height, same bg/border/radius) but with a chevron indicator.

---

## 3. Hierarchy

When a view has both a tab bar and filter pills:

```
┌─ Toolbar Row ──────────────────────────────────────┐
│  [🔍]  [Filter] [Filter] [Filter] [Tags ▾]  [+New] │
├─────────────────────────────────────────────────────┤
│  [Active ●] [Completed ●]                           │
└─────────────────────────────────────────────────────┘
```

- **Toolbar** (search + filters + action button) comes first
- **Tab bar** sits below, left-aligned
- Parent layout gap handles spacing — **never use inline margin styles**

---

## 4. Shared CSS Location

Tab bar styles live in:
- **`src/components/ui/CompletionAnimation.css`** — the `.completion-tab-*` classes
- View-specific filter buttons stay in their view's CSS file

---

## Do NOT

- ❌ Use inline `style={{ margin: ... }}` on tab bars — use parent flex gap
- ❌ Use hardcoded colors — always use CSS variables
- ❌ Use `font-size: 13px` — use `var(--font-size-sm)`
- ❌ Mix tab bar height with a different size than the search button (44px)
- ❌ Use different border-radius between tab bar and filter buttons
- ❌ Use pill-shaped (fully rounded) for filter buttons — always `var(--radius-sm)`
- ❌ Create view-specific tab bar styles — reuse `.completion-tab-bar`
