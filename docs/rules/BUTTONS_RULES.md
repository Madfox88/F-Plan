# BUTTONS_RULES.md
## F-Plan — Button Rules (Authoritative)

This document defines the exact visual style, animation behavior, and implementation rules for buttons in F-Plan.

All buttons must follow the **glass-orb** design language.

If something is not defined here, it does not exist.

---

## 1. Design Language

Buttons in F-Plan use a **glassmorphism** base with **glowing orb** accents.

The visual identity is:
- Translucent glass background with backdrop blur
- Thin glass border
- Two colored pseudo-element orbs (violet + rose) that drift on hover
- Premium, soft, neon-frosted feel

---

## 2. CSS Class

The canonical class is `.glass-orb-btn`.

All primary action buttons MUST use this class.

```html
<button class="glass-orb-btn">
  <span>Button Label</span>
</button>
```

### 2.1 The `<span>` Wrapper Is Mandatory

Button text MUST be wrapped in a `<span>`.

The span carries `position: relative; z-index: 2` to render above the orbs.

Without the span, text will render behind the pseudo-element blur.

---

## 3. Glass Foundation

The button surface uses the app's glass design tokens from `theme.css`.

| Property | Token | Fallback |
|---|---|---|
| Background | `var(--glass-bg)` | `rgba(28,28,32,0.62)` dark / `rgba(255,255,255,0.38)` light |
| Border | `var(--glass-border)` | `rgba(255,255,255,0.18)` dark / `rgba(255,255,255,0.55)` light |
| Backdrop blur | `var(--glass-blur)` | `22px` dark / `24px` light |
| Border radius | `var(--radius-sm)` | `12px` |
| Hover background | `var(--glass-bg-heavy)` | `rgba(32,32,36,0.72)` dark / `rgba(255,255,255,0.48)` light |

### 3.1 Required Properties

```css
position: relative;
overflow: hidden;
backdrop-filter: blur(var(--glass-blur, 22px));
-webkit-backdrop-filter: blur(var(--glass-blur, 22px));
```

- `position: relative` — anchor for pseudo-element orbs
- `overflow: hidden` — clip orbs to button bounds
- Both prefixed and unprefixed backdrop-filter — Safari compatibility

---

## 4. Glowing Orbs

Two pseudo-elements (`::before` and `::after`) create the glow effect.

### 4.1 Orb Specifications

| Orb | Pseudo | Size | Color (Dark) | Color (Light) | Blur |
|---|---|---|---|---|---|
| Violet | `::before` | 32×32px | `rgba(139, 92, 246, 0.5)` | `rgba(192, 132, 252, 0.45)` | `12px` |
| Rose | `::after` | 50×50px | `rgba(251, 113, 133, 0.35)` | `rgba(232, 121, 249, 0.3)` | `14px` |

### 4.2 Orb Placement

Orbs are pinned to fixed positions using `top` + `right`.

- Violet orb: `top: 2px; right: 4px` (top-right corner)
- Rose orb: `top: 6px; right: 22px` (slightly left of violet)

These positions MUST NOT change on hover. Motion comes from `transform` only.

---

## 5. Animation Rules (Critical)

### 5.1 NEVER Animate Positional Properties

❌ **Forbidden on hover:**
```css
right: 36px;    /* NO */
bottom: -20px;  /* NO */
left: 10px;     /* NO */
top: 5px;       /* NO */
```

✅ **Required — use transform instead:**
```css
transform: translate(-30px, 14px) scale(1.3);
```

Animating `top`/`right`/`bottom`/`left` causes layout recalculation on every frame, leading to jitter and flicker.

### 5.2 ALWAYS Disable Pointer Events on Pseudo-Elements

```css
.glass-orb-btn::before,
.glass-orb-btn::after {
  pointer-events: none;
}
```

Without this, the orb intercepts the cursor during hover, creating a feedback loop:

```
hover → orb moves under cursor → hover lost → orb resets → hover again → flicker
```

### 5.3 ALWAYS Define Stable Base Transforms

Every pseudo-element MUST have an explicit resting transform:

```css
transform: translate(0, 0) scale(1);
opacity: 1;
```

This gives the transition engine a clean origin to animate from.

### 5.4 ALWAYS Use `will-change: transform`

```css
will-change: transform, opacity;
```

This promotes the pseudo-element to its own compositor layer, enabling GPU-accelerated animation with no rendering jitter.

### 5.5 Transition Specific Properties Only

❌ **Forbidden:**
```css
transition: all 500ms;
```

✅ **Required:**
```css
transition: transform 500ms ease, opacity 500ms ease, filter 500ms ease;
```

`transition: all` animates every property including layout-triggering ones. Always list specific properties.

### 5.6 NEVER Use Large Box-Shadow Expansions for Glow

❌ **Forbidden:**
```css
box-shadow: 10px 10px 14px 16px rgba(162, 28, 175, 0.12);
```

✅ **Use scale + opacity instead:**
```css
transform: translate(-30px, 14px) scale(1.3);
opacity: 0.85;
filter: blur(16px);
```

Box-shadow animations are expensive and amplify visual jitter. Achieve glow by scaling the blurred orb up and adjusting opacity.

---

## 6. Hover Behavior

### 6.1 Button Surface

| Property | Resting | Hover (Dark) | Hover (Light) |
|---|---|---|---|
| Background | `var(--glass-bg)` | `var(--glass-bg-heavy)` | `var(--glass-bg-heavy)` |
| Border color | `var(--glass-border)` | `rgba(251, 113, 133, 0.45)` | `rgba(192, 132, 252, 0.5)` |

### 6.2 Violet Orb (`::before`) on Hover

```css
transform: translate(-30px, 14px) scale(1.3);
opacity: 0.85;
filter: blur(16px);
```

Drifts left and down, grows 30%, slightly more diffuse.

### 6.3 Rose Orb (`::after`) on Hover

```css
transform: translate(18px, 0) scale(1.15);
opacity: 0.7;
```

Drifts right, grows 15%, fades slightly.

---

## 7. Sizing Variants

### 7.1 Default

```css
height: 48px;
padding: 10px 20px;
font-size: var(--font-size-sm, 14px);
```

### 7.2 Small (`.glass-orb-btn.sm`)

If a smaller variant is needed:

```css
.glass-orb-btn.sm {
  height: 40px;
  padding: 8px 16px;
  font-size: 13px;
}

.glass-orb-btn.sm::before {
  width: 24px;
  height: 24px;
}

.glass-orb-btn.sm::after {
  width: 38px;
  height: 38px;
  right: 16px;
  top: 4px;
}
```

Orb sizes scale proportionally. Animation transforms stay the same.

---

## 8. Theme Support

The button MUST work in both dark and light themes.

- Dark theme uses the default orb colors (violet `#8b5cf6`, rose `#fb7185`)
- Light theme overrides orb colors via `[data-theme="light"]` selectors to softer purple/fuchsia tones

```css
[data-theme="light"] .glass-orb-btn::before {
  background: rgba(192, 132, 252, 0.45);
}

[data-theme="light"] .glass-orb-btn::after {
  background: rgba(232, 121, 249, 0.3);
}

[data-theme="light"] .glass-orb-btn:hover {
  border-color: rgba(192, 132, 252, 0.5);
}
```

---

## 9. When to Use

| Use `.glass-orb-btn` | Use `.btn-primary` / `.btn-secondary` |
|---|---|
| Primary call-to-action on a card | Form submit/cancel within setup flows |
| Entry points ("Start Focus Session") | Inline secondary actions |
| Feature launchers | Destructive actions (use `.btn-danger`) |

The glass-orb button is for **prominent, inviting actions** — not every button in the app.

Standard `btn-primary` / `btn-secondary` remain valid for form controls and less prominent actions.

---

## 10. Checklist for New Buttons

When creating a new `.glass-orb-btn`:

- [ ] Text wrapped in `<span>`
- [ ] `position: relative` + `overflow: hidden` on button
- [ ] `backdrop-filter` with `-webkit-` prefix
- [ ] `::before` / `::after` have `pointer-events: none`
- [ ] `::before` / `::after` have `will-change: transform, opacity`
- [ ] Base `transform: translate(0, 0) scale(1)` on both pseudo-elements
- [ ] Hover uses only `transform` / `opacity` / `filter` — no positional props
- [ ] Transitions list specific properties — no `transition: all`
- [ ] No `box-shadow` expansion for glow — use `scale` + `opacity`
- [ ] Light theme overrides via `[data-theme="light"]`
- [ ] Tested in both themes with no flicker
