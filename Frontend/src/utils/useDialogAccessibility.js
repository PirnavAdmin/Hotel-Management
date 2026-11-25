import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    return el.offsetParent !== null || el === document.activeElement;
  });
}

/**
 * Shared accessibility hook for modal dialogs:
 * - Saves previously focused element and restores focus on close.
 * - Moves initial focus inside the dialog on open.
 * - Traps Tab / Shift+Tab navigation inside the dialog.
 * - Dismisses on Escape when closeOnEscape is true.
 */
export function useDialogAccessibility({
  isOpen,
  onClose,
  dialogRef,
  closeOnEscape = true,
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousFocus =
      typeof document !== "undefined" && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const rafId =
      typeof window !== "undefined"
        ? window.requestAnimationFrame(() => {
            const container = dialogRef?.current;
            if (!container) return;
            if (container.contains(document.activeElement)) return;
            const focusable = getFocusableElements(container);
            if (focusable.length > 0) {
              focusable[0].focus({ preventScroll: true });
            } else if (typeof container.focus === "function") {
              container.focus({ preventScroll: true });
            }
          })
        : null;

    const handleKeyDown = (event) => {
      const container = dialogRef?.current;
      if (!container) return;

      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof onCloseRef.current === "function") {
          onCloseRef.current();
        }
        return;
      }

      if (event.key === "Tab") {
        const focusable = getFocusableElements(container);
        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (event.shiftKey) {
          if (active === first || active === container || !container.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else if (active === last || !container.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      if (rafId != null && typeof window !== "undefined") {
        window.cancelAnimationFrame(rafId);
      }
      document.removeEventListener("keydown", handleKeyDown, true);
      if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === "function") {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [isOpen, closeOnEscape, dialogRef]);
}
