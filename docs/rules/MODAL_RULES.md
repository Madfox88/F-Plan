# Modal Rules — F-Plan Design System

> Last updated: 2026-03-02
> All modal overlays must follow these rules for consistent appearance and proper visibility across themes.

---

## 1. Design Philosophy

Every modal in F-Plan uses the **glass morphism design system** with special handling for light theme visibility:

1. **Overlay layer** — dims the background and provides focus
2. **Modal panel** — frosted glass with proper opacity for readability
3. **Animation** — smooth slide-up entrance
4. **Form elements** — consistent glass inputs matching the design system

---

## 2. Authoritative Base

**ALL modals MUST import `ModalBase.css`** as their first stylesheet. Never redefine base classes.

```tsx
import './ModalBase.css';
import './YourModalSpecific.css';  // Optional overrides only
```

### Base Classes

| Class | Purpose |
|-------|---------|
| `.modal-overlay` | Full-screen overlay backdrop |
| `.modal-content` | Main modal panel container |
| `.modal-header` | Header with title and close button |
| `.close-button` | Borderless X button (SVG) |
| `.modal-body` | Scrollable content area (when not using form) |
| `.modal-form` | Form wrapper (replaces modal-body for forms) |
| `.modal-footer` | Button container at bottom |
| `.form-group` | Form field wrapper |
| `.form-label` | Field label |
| `.form-input` | Text/date inputs |
| `.btn-primary` | Primary action button with orb animation |
| `.btn-secondary` | Secondary action button with subtle orbs |
| `.form-error` | Error message banner |

---

## 3. Theme-Specific Visibility Rules

### Light Theme Requirements

Light theme requires **high-contrast surfaces** for the overlay, panel, inputs, and action buttons.

```css
/* Light theme: stronger overlay to dim background */
[data-theme="light"] .modal-overlay {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* Light theme: stronger modal background for better visibility */
[data-theme="light"] .modal-content {
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(0, 0, 0, 0.12);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12), 0 20px 50px rgba(0, 0, 0, 0.18);
}
```

**Why?** Light backgrounds with low opacity create insufficient contrast against light page backgrounds, making text unreadable.

### Dark Theme

Dark theme uses standard glass tokens:

```css
[data-theme="dark"] .modal-overlay {
  background: var(--bg-overlay);
}

[data-theme="dark"] .modal-content {
  background: var(--glass-bg);
}
```

---

## 4. Modal Structure Template

```tsx
import { useEscapeKey } from '../../hooks/useEscapeKey';
import './ModalBase.css';
import './YourModal.css';

interface YourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DataType) => Promise<void>;
}

export const YourModal: React.FC<YourModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formState, setFormState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await onSubmit(formState);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="your-modal modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Modal Title</h2>
          <button className="close-button" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6L18 18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="field-id">Field Label</label>
            <input
              id="field-id"
              type="text"
              value={formState.field}
              onChange={(e) => setFormState({ ...formState, field: e.target.value })}
              placeholder="Enter value"
              disabled={isLoading}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isLoading}>
              <span>Cancel</span>
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              <span>{isLoading ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

---

## 5. Button Animation System

### Primary Button (`.btn-primary`)

- **Background:** `var(--glass-bg)` with violet/rose orb animations
- **Hover:** Orbs drift and scale for visual interest
- **Use for:** Main action (Save, Create, Confirm)

### Secondary Button (`.btn-secondary`)

- **Background:** `transparent` with subtle orbs
- **Hover:** Glass background appears, orbs drift slightly
- **Use for:** Cancel, secondary actions

**Both buttons have theme-specific orb colors defined in ModalBase.css**

### Light Theme Button Visibility (Required)

In light theme, both buttons use near-solid surfaces and stronger borders:

```css
[data-theme="light"] .btn-primary {
  background: #ffffff;
  border: 1.5px solid rgba(139, 92, 246, 0.6);
}

[data-theme="light"] .btn-secondary {
  background: #ffffff;
  border: 1.5px solid rgba(0, 0, 0, 0.18);
}
```

---

## 6. Form Input Guidelines

All form inputs use glass styling with proper focus states:

```css
.form-group input,
.form-group textarea {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  color: var(--text-primary);
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--glass-border-heavy);
  box-shadow: 0 0 0 2px var(--glass-highlight);
}
```

**Disabled state:**
```css
input:disabled,
textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

### Light Theme Input Visibility (Required)

```css
[data-theme="light"] .form-group input:not([type="color"]),
[data-theme="light"] .form-group textarea,
[data-theme="light"] .form-input {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.20);
  color: #000000;
}

[data-theme="light"] .form-group input:not([type="color"]):focus,
[data-theme="light"] .form-group textarea:focus,
[data-theme="light"] .form-input:focus {
  border-color: rgba(139, 92, 246, 0.6);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
}
```

### Date Fields Rule

- Never use native `input[type="date"]` in modals.
- Always use the shared `DatePicker` component.
- Follow [docs/rules/DATE_PICKER_RULES.md](docs/rules/DATE_PICKER_RULES.md).

### Tag Picker Radius Rule

- If a modal uses `TagPicker`, its trigger radius must match modal inputs.
- Use `var(--radius-sm)` (same as `.form-input`).

---

## 7. Modal Sizing Guidelines

| Modal Type | Max Width | Use Case |
|------------|-----------|----------|
| Compact | `420px` | Simple forms (rename, quick settings) |
| Standard | `520px` | Most forms (create goal, task, etc.) |
| Wide | `680px` | Complex forms with multiple columns |
| Full-width | `90%` | Image cropper, calendar picker |

Set via:
```css
.your-modal {
  max-width: 520px;
}
```

---

## 8. Accessibility Requirements

✅ **Must have:**
- `role="dialog"` on `.modal-overlay`
- `aria-modal="true"` on `.modal-overlay`
- `aria-label="Close"` on close button
- Proper `<label>` with `htmlFor` for all inputs
- `useEscapeKey` hook to close on Escape
- Click outside overlay to close
- `e.stopPropagation()` on modal content to prevent accidental close

---

## 9. Animation Rules

Entry animation is defined in ModalBase.css:

```css
@keyframes modalSlideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-content {
  animation: modalSlideUp 300ms ease-out;
}
```

**Never override or remove this animation** — it's part of the design system.

---

## 10. New Modal Checklist

When creating a new modal:

- [ ] Import `ModalBase.css` first
- [ ] Use `.modal-overlay` + `.modal-content` structure
- [ ] Add `.modal-header` with title and close button (X SVG)
- [ ] Use `.modal-form` for forms or `.modal-body` for non-forms
- [ ] Use `.btn-primary` and `.btn-secondary` in `.modal-footer`
- [ ] Add `useEscapeKey(isOpen, onClose)` hook
- [ ] Add `onClick={onClose}` on overlay
- [ ] Add `onClick={(e) => e.stopPropagation()}` on content
- [ ] Return `null` when `!isOpen`
- [ ] Use `role="dialog"` and `aria-modal="true"`
- [ ] Test visibility in both light and dark themes
- [ ] Never override base `.modal-content` background (theme handling is in ModalBase.css)
- [ ] Use `DatePicker` for date fields (never native `input[type="date"]`)
- [ ] Keep `TagPicker` trigger radius equal to modal inputs (`var(--radius-sm)`)

---

## 11. Common Mistakes to Avoid

❌ **DON'T:**
- Override `.modal-content` background — theme-specific styles are already defined
- Use inline styles for panel background
- Reduce overlay opacity below theme-specific minimums
- Forget to import ModalBase.css
- Redefine button animations
- Use native `<button>` styling instead of `.btn-primary`/`.btn-secondary`
- Use native `input[type="date"]` in modal forms

✅ **DO:**
- Trust ModalBase.css for all base styling
- Only add modal-specific overrides in your CSS file
- Test in both themes before committing
- Use standard form elements with `.form-group` wrapper
- Use `DatePicker` for all modal date fields
- Follow the structure template exactly

---

## 12. Existing Modal Inventory

All these modals follow (or should follow) these rules:

| Component | Path | Status |
|-----------|------|--------|
| `TaskCreateModal` | `components/tasks/` | ✅ Compliant |
| `CreateGoalModal` | `components/goals/` | ✅ Fixed (2026-03-02) |
| `GoalDetailModal` | `components/modals/` | ✅ Compliant |
| `GoalReadOnlyModal` | `components/modals/` | ✅ Compliant |
| `LinkGoalFromPlanModal` | `components/modals/` | ✅ Compliant |
| `AddStageModal` | `components/modals/` | ✅ Compliant |
| `CreatePlanModal` | `components/plan/` | ✅ Compliant |
| `RenamePlanModal` | `components/plan/` | ✅ Compliant |
| `WorkspaceSettingsModal` | `components/workspace/` | ✅ Compliant |
| `AvatarCropperModal` | `components/profile/` | ✅ Compliant |
| `FocusSessionModal` | `components/focus/` | ✅ Compliant |

---

## 13. Related Documentation

- `POPUP_SYSTEM.md` — General popup/overlay architecture
- `DROPDOWN_RULES.md` — Dropdown menu styling (different from modals)
- `BUTTONS_RULES.md` — Button styling system
- `docs/DESIGN_SYSTEM.md` — Overall design tokens and glass system

---

**This is the single source of truth for modal styling.** All future modals must follow these rules to ensure consistency and proper visibility across themes.
