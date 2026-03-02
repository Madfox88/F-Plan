# Date Picker — Design Rules

> Canonical reference for the custom `<DatePicker>` component.
> Source: `src/components/ui/DatePicker.tsx` + `DatePicker.css`

---

## 1. When to Use

| Scenario | Use DatePicker? |
|----------|-----------------|
| Any date input in the app (filters, forms, modals) | ✅ Yes |
| Native `<input type="date">` | ❌ Never — always use the custom component |
| Date-time selection (with hours/minutes) | Extend DatePicker, don't add a separate component |

---

## 2. Component API

```tsx
<DatePicker
  value={string}        // YYYY-MM-DD or ''
  onChange={fn}          // (val: string) => void
  label?: string         // Optional label shown before the trigger
  placeholder?: string   // Placeholder when no date is selected
/>
```

---

## 3. Trigger Button

| Property | Value |
|----------|-------|
| Height | `36px` |
| Background | `var(--glass-bg)` |
| Border | `1px solid var(--glass-border)` |
| Border radius | `var(--radius-sm)` (12 px) |
| Font | `var(--font-size-sm)`, `var(--font-family)` |
| Icon | 16 × 16 calendar SVG, `var(--text-secondary)` |
| Hover | background → `var(--glass-bg-heavy)` |
| Focus-visible | border-color → `var(--color-active)` |
| Placeholder color | `var(--text-tertiary)` |

---

## 4. Dropdown Calendar

| Property | Value |
|----------|-------|
| Width | `264px` |
| Padding | `12px` |
| Background | `var(--glass-bg-heavy)` |
| Backdrop filter | `blur(var(--glass-blur-heavy))` |
| Border | `1px solid var(--glass-border)` |
| Border radius | `var(--radius-md)` (16 px) |
| Shadow | `var(--shadow-md)` |
| Animation | `dpFadeIn` — 150 ms ease-out, translateY(-4 → 0) + opacity |
| Z-index | `200` |

---

## 5. Month Navigation

| Element | Spec |
|---------|------|
| Label | `var(--font-size-sm)`, `var(--font-weight-semibold)`, `var(--text-primary)` |
| Arrow buttons | 28 × 28 px, transparent bg, `var(--radius-sm)` |
| Arrow hover | background → `var(--glass-bg)`, color → `var(--text-primary)` |
| SVG chevrons | 14 × 14 px, stroke-width 2 |

---

## 6. Day Grid

| Element | Spec |
|---------|------|
| Grid | 7 columns, 2 px gap |
| Weekday headers | `var(--font-size-xs)`, `var(--font-weight-medium)`, `var(--text-tertiary)` |
| Day cell | `aspect-ratio: 1`, circular (`border-radius: 50%`), `var(--font-size-sm)` |
| Cell hover | background → `var(--glass-bg)` |
| **Today** | `border: 1px solid var(--color-active)`, `var(--font-weight-semibold)` |
| **Selected** | solid `var(--color-active)` fill, white text, semibold |
| Empty cells | no pointer, no hover |

---

## 7. Footer

| Element | Spec |
|---------|------|
| Separator | `border-top: 1px solid var(--glass-border)`, 8 px margin |
| "Today" button | padding `4px 14px`, `var(--font-size-xs)`, semibold, `var(--color-active)` text, glass-border outline |
| Hover | background → `var(--glass-bg)` |

---

## 8. Behavior

- **Close on click outside** (mousedown listener)
- **Close on Escape** key
- **Selecting a day** closes the dropdown and calls `onChange`
- **"Today" button** sets value to today and closes
- **View syncs** to selected date when `value` prop changes externally
- **No time zone issues** — all values are plain `YYYY-MM-DD` strings; internal `new Date()` calls use `T00:00:00` suffix

---

## 8.5 Modal Integration Rules

When DatePicker is used inside any modal (Create Goal, Create Plan, Task Create, etc.):

- The trigger must visually match modal inputs (`var(--radius-sm)`, same border rhythm).
- Wrapper should be full width in form rows:

```css
.your-modal .dp { width: 100%; }
.your-modal .dp-trigger {
  width: 100%;
  justify-content: flex-start;
}
```

- Use `disabled` state during submit/loading, same as other fields.
- Never fallback to native `input[type="date"]` in modals.
- Follow modal contrast requirements from `docs/rules/MODAL_RULES.md`.

---

## 9. Do-Nots

| ❌ Don't | ✅ Do |
|-----------|-------|
| Use native `<input type="date">` anywhere | Always use `<DatePicker>` |
| Hardcode colors/sizes | Use design-system variables |
| Add inline styles to the component | Keep all styles in `DatePicker.css` |
| Create a second calendar dropdown | Reuse this component with props |
| Use `position: fixed` for the dropdown | Keep `position: absolute` relative to `.dp` |
| Forget `backdrop-filter` on the panel | Both `-webkit-` and unprefixed are required |
