import { useEffect } from 'react';

/**
 * Dismiss handler for Escape key — shared by all modals.
 * WCAG 2.1 SC 1.4.13: Escape must dismiss popups/dialogs.
 *
 * @param isOpen  Whether the modal/dialog is currently visible.
 * @param onClose Callback to close the modal.
 */
export function useEscapeKey(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
}
