# F‑Plan – Design System (Authoritative)

This document defines the complete visual and interaction design system for **F‑Plan**.\
It is authoritative and must be followed exactly.\
No component, screen, or feature may deviate from this system unless this file is explicitly updated.

---

## 1. Design Philosophy

F‑Plan follows a **calm, professional, liquid‑glass aesthetic** inspired by modern Apple system UI.

Design goals:

- Visual calm and focus
- Depth without clutter
- Consistent surfaces and interactions
- No visual noise or novelty effects

F‑Plan is **not** playful, gamified, or decorative. It is a serious productivity tool.

---

## 2. Global Visual Principles

### 2.1 Glass‑First UI

All primary UI surfaces use **glass morphism**. Opaque surfaces are not allowed except for:

- Background images
- System overlays (modals backdrop)
- Rare emphasis states (errors)

Every surface must:

- Be translucent
- Blur content behind it
- Have a subtle border
- Have controlled shadow depth

---

### 2.2 Depth Hierarchy

Depth is communicated through:

- Blur strength
- Opacity
- Shadow softness

Higher‑level surfaces appear **closer**. Lower‑level surfaces appear **further back**.

There are **three depth tiers only**:

1. Light Glass
2. Heavy Glass
3. Overlay Glass

No additional tiers are allowed.

---

## 3. Color System

### 3.1 Theme Modes

F‑Plan supports:

- Light mode
- Dark mode

Themes switch dynamically and affect:

- Background imagery
- Glass opacity
- Border contrast
- Shadow strength

---

### 3.2 Backgrounds

Each theme has a **permanent background image**.

Rules:

- One image for light mode
- One image for dark mode
- Images are static
- Images never scroll
- Images never animate

Backgrounds must:

- Be subtle
- Have no sharp contrast
- Work behind glass surfaces

---

## 4. Glass Recipe (Locked)

These values are the **single source of truth**. They must live in `theme.css`.

### 4.1 Light Theme

```css
--glass-bg: rgba(255, 255, 255, 0.38);
--glass-border: rgba(255, 255, 255, 0.55);
--glass-highlight: rgba(255, 255, 255, 0.45);
--glass-shadow: rgba(0, 0, 0, 0.10);
--glass-blur: 24px;

--glass-bg-heavy: rgba(255, 255, 255, 0.48);
--glass-border-heavy: rgba(255, 255, 255, 0.60);
--glass-blur-heavy: 32px;

--bg-overlay: rgba(255, 255, 255, 0.28);
```

---

### 4.2 Dark Theme

```css
--glass-bg: rgba(20, 20, 22, 0.42);
--glass-border: rgba(255, 255, 255, 0.12);
--glass-highlight: rgba(255, 255, 255, 0.10);
--glass-shadow: rgba(0, 0, 0, 0.45);
--glass-blur: 28px;

--glass-bg-heavy: rgba(18, 18, 20, 0.55);
--glass-border-heavy: rgba(255, 255, 255, 0.14);
--glass-blur-heavy: 36px;

--bg-overlay: rgba(0, 0, 0, 0.40);
```

---

## 5. Surface Types

### 5.1 Cards

Used for:

- Dashboard cards
- Plan cards
- List items

Rules:

- Light glass
- Rounded corners: `14px`
- Padding: `16–20px`
- Hover: subtle brightness increase only

---

### 5.2 Modals

Used for:

- Create Plan
- Settings
- Confirmation dialogs

Rules:

- Heavy glass
- Centered
- Fixed width
- Backdrop uses `--bg-overlay`
- No full‑screen modals

---

### 5.3 Inputs

Used for:

- Text fields
- Search
- Selects

Rules:

- Glass background
- No solid fills
- Border visible at rest
- Focus state increases border contrast
- No glowing effects

---

## 6. Typography

### 6.1 Font

System font stack only:

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", sans-serif;
```

No custom fonts.

---

### 6.2 Hierarchy

- App title: medium weight
- Section titles: semibold
- Body text: regular
- Meta text: smaller size, reduced opacity

No bold paragraphs.

---

## 7. Layout Rules

### 7.1 Spacing

- Base spacing unit: `8px`
- Layout spacing uses multiples of 8

---

### 7.2 Alignment

- Left‑aligned content
- Center only when structurally required
- No justified text

---

## 8. Navigation Components

### 8.1 Sidebar

Rules:

- Glass surface
- Fixed width
- Icon + label
- Active state uses subtle highlight only

---

### 8.2 Top Bar

Rules:

- Fixed height
- Does not resize
- Menus float over content
- Dropdowns never push layout

---

## 9. Motion & Interaction

### 9.1 Transitions

Allowed:

- Opacity
- Transform

Rules:

- Duration: 150–220ms
- Ease: `ease-out`
- No bounce
- No spring physics

---

### 9.2 Hover & Focus

Rules:

- Subtle only
- No scaling
- No color shifts beyond contrast

---

## 10. Explicit Non‑Goals

The design system explicitly forbids:

- Neon colors
- Strong gradients on UI elements
- Glass inside glass inside glass
- Over‑rounded corners
- Drop‑shadow heavy cards
- Animated backgrounds
- Decorative icons

---

## 11. Enforcement Rule

This document is authoritative.

If:

- A component looks different
- A surface is opaque
- A blur is missing

Then the implementation is **wrong**, even if it “looks fine”.

Design consistency is a feature.

