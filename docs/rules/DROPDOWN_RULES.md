# Dropdown & Menu Rules — F-Plan Design System

> Variant B (locked 2026-02-12): Glass panels with text-shadow halo,
> separator lines, and violet accent tint on active items.

---

## 1. Design Language

Every flyout — option list, context menu, workspace switcher — is a
**frosted-glass panel** that floats above the page. Readability comes from
three layers working together:

1. **Heavy blur + opaque-ish background** — pushes the background pattern
   far enough away that text remains crisp.
2. **Text-shadow halo** — a soft glow behind each label that separates
   glyphs from any residual pattern bleed.
3. **Separator lines** — thin borders between items that give the eye
   anchors without adding visual weight.

---

## 2. Token Reference

All dropdown-specific tokens live in `src/styles/theme.css`.

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `--dropdown-text-halo` | `0 0 8px rgba(255,255,255,0.5)` | `0 0 8px rgba(10,10,18,0.6)` | `text-shadow` on every option label |
| `--dropdown-separator` | `rgba(0,0,0,0.05)` | `rgba(255,255,255,0.08)` | `border-bottom` between options |
| `--dropdown-hover-bg` | `rgba(0,0,0,0.04)` | `var(--glass-bg-heavy)` | Background on hover |
| `--dropdown-active-bg` | `rgba(139,92,246,0.08)` | `rgba(139,92,246,0.15)` | Violet tint on active/selected item |
| `--dropdown-active-border` | `rgba(139,92,246,0.06)` | `rgba(139,92,246,0.1)` | Separator color under active item |

Existing glass tokens reused by menus:

| Token | Used for |
|-------|----------|
| `--glass-bg` | Dark menu panel background |
| `--glass-bg-heavy` | Light menu panel background, dark hover |
| `--glass-border-heavy` | Menu panel border |
| `--glass-blur-heavy` | `backdrop-filter: blur(…)` on menu panel |
| `--shadow-lg` | Menu panel box-shadow |

---

## 3. Menu Panel (Container) Rules

```css
/* Base — shared by all flyout menus */
.dropdown-menu,
.grouping-selector-menu,
.plan-menu-dropdown,
.plan-header-menu-dropdown,
.workspace-dropdown {
  border: 1px solid var(--glass-border-heavy);
  border-radius: var(--radius-sm);           /* 12px */
  backdrop-filter: blur(var(--glass-blur-heavy));
  -webkit-backdrop-filter: blur(var(--glass-blur-heavy));
  box-shadow: var(--shadow-lg);
}
```

### Background per theme

| Theme | Menu bg |
|-------|---------|
| Light (`:root`) | `var(--glass-bg-heavy)` — `rgba(255,255,255,0.48)` |
| Dark (`[data-theme="dark"]`) | `var(--glass-bg)` — `rgba(28,28,32,0.62)` |

---

## 4. Option / Item Rules

Every clickable row inside a menu panel must have:

| Property | Value | Why |
|----------|-------|-----|
| `text-shadow` | `var(--dropdown-text-halo)` | Readability over glass |
| `border-bottom` | `1px solid var(--dropdown-separator)` | Visual anchors between rows |
| `transition` | `background var(--transition-fast)` | Smooth hover, no `all` (avoids halo/color flicker) |
| `:last-child` | `border-bottom: none` | Clean bottom edge |

### States

| State | Background | Extra |
|-------|-----------|-------|
| Default | `transparent` | — |
| Hover | `var(--dropdown-hover-bg)` | — |
| Active / Selected | `var(--dropdown-active-bg)` | `border-bottom-color: var(--dropdown-active-border)` |
| Danger hover | `rgba(255,71,87,0.1)` (light) / `rgba(255,71,87,0.15)` (dark) | Keep existing danger color |

---

## 5. Animation Rules

Context menus (PlanCardMenu, PlanHeaderMenu) use a slide-in animation:

```css
@keyframes slideIn {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
animation: slideIn var(--transition-normal) ease-out;
```

Option-list dropdowns (`dropdown-menu`, `grouping-selector-menu`) appear
instantly — no animation needed since they're anchored to a trigger.

---

## 6. Anti-Flicker Checklist

Mirrors BUTTONS_RULES.md §5:

- [ ] `transition` targets **only `background`** — never `all`
- [ ] No `box-shadow` changes on hover
- [ ] No `transform` shifts on hover (except workspace-item `:active`)
- [ ] Text-shadow is constant — does not change on hover

---

## 7. Dropdown Class Inventory

| CSS System | Class prefix | Files |
|------------|-------------|-------|
| **Shared dropdown** | `.dropdown`, `.dropdown-trigger`, `.dropdown-menu`, `.dropdown-option` | TaskCreateModal, Dashboard, FocusSessionModal |
| **Grouping selector** | `.grouping-selector-*` | PlanDetail |
| **Plan card menu** | `.plan-menu-dropdown`, `.menu-item` | PlanCardMenu |
| **Plan header menu** | `.plan-header-menu-dropdown`, `.menu-item` | PlanHeaderMenu |
| **Workspace switcher** | `.workspace-dropdown`, `.workspace-item` | WorkspaceSwitcher |
| **Native `<select>`** | styled via `theme.css` | Tasks (filters) |

---

## 8. When to Use Which

| Pattern | Component |
|---------|-----------|
| **Option list** (`.dropdown-*`) | Any single-select picker inside a form: plan, stage, status, priority, assignee, duration, context |
| **Context menu** (`.plan-menu-dropdown` etc.) | "⋯" overflow menus with action verbs (Archive, Delete, Rename) |
| **Workspace switcher** (`.workspace-dropdown`) | Top-level workspace selection |
| **Native `<select>`** | Toolbar filter controls where a lightweight native widget suffices |

---

## 9. New Dropdown Checklist

When adding a new dropdown anywhere in the app:

1. Use the canonical `.dropdown` / `.dropdown-trigger` / `.dropdown-menu` /
   `.dropdown-option` classes (defined in `TaskCreateModal.css`).
2. If it's a context menu, model after `PlanCardMenu.css`.
3. Ensure every option has `text-shadow: var(--dropdown-text-halo)` and
   `border-bottom: 1px solid var(--dropdown-separator)`.
4. Set `:last-child { border-bottom: none; }`.
5. Use `var(--dropdown-hover-bg)` for hover, `var(--dropdown-active-bg)`
   for selected state.
6. Add `backdrop-filter: blur(var(--glass-blur-heavy))` to the panel.
7. Run the anti-flicker checklist (§6).
