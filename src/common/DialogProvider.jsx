import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Trash2, X } from "lucide-react";
import { DialogContext } from "./DialogContext";
import "./DialogProvider.css";

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);
  const confirmButtonRef = useRef(null);

  const openDialog = useCallback((type, message, options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        type,
        message,
        title: options.title || (type === "confirm" ? "Are you sure?" : "Notice"),
        confirmText: options.confirmText || (type === "confirm" ? "Yes, Continue" : "OK"),
        cancelText: options.cancelText || "Cancel",
        showCancel: options.showCancel !== undefined ? options.showCancel : true,
      });
    });
  }, []);

  const showAlert = useCallback(
    (message, options) => openDialog("alert", message, options),
    [openDialog],
  );
  const confirmDialog = useCallback(
    (message, options) => openDialog("confirm", message, options),
    [openDialog],
  );

  const closeDialog = useCallback((result) => {
    setDialog(null);
    resolverRef.current?.(result);
    resolverRef.current = null;
  }, []);

  useEffect(() => {
    if (!dialog) return undefined;
    confirmButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeDialog(false);
      } else if (event.key === "Enter") {
        closeDialog(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialog, closeDialog]);

  return (
    <DialogContext.Provider value={{ showAlert, confirmDialog }}>
      {children}
      {dialog && (
        <div
          className="app-dialog-backdrop"
          onClick={() => closeDialog(false)}
        >
          <section
            className={`app-dialog app-dialog--${dialog.type}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="app-dialog-title"
            aria-describedby="app-dialog-message"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="app-dialog__close"
              onClick={() => closeDialog(false)}
              aria-label="Close dialog"
            >
              <X size={16} />
            </button>
            <div className="app-dialog__icon" aria-hidden="true">
              {dialog.type === "confirm" ? (
                <Trash2 size={24} />
              ) : (
                <AlertCircle size={24} />
              )}
            </div>
            <h2 id="app-dialog-title" className="app-dialog__title">
              {dialog.title}
            </h2>
            <p id="app-dialog-message" className="app-dialog__message">
              {dialog.message}
            </p>
            <div className="app-dialog__actions">
              <button
                ref={confirmButtonRef}
                className="app-dialog__button app-dialog__button--confirm"
                onClick={() => closeDialog(true)}
              >
                {dialog.confirmText}
              </button>
              {dialog.showCancel && (
                <button
                  className="app-dialog__button app-dialog__button--cancel"
                  onClick={() => closeDialog(false)}
                >
                  {dialog.cancelText}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </DialogContext.Provider>
  );
}
