import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Viewport-positioned tooltip shown only when the supplied text is clipped. */
export function TruncatedTooltip({ children, className, style, label, ...props }) {
  const targetRef = useRef(null);
  const tooltipRef = useRef(null);
  const hideTimerRef = useRef(null);
  const touchTimerRef = useRef(null);
  const exitTimerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const fullText = String(label ?? (typeof children === "string" ? children : ""));

  const hide = useCallback(() => {
    window.clearTimeout(hideTimerRef.current);
    setTooltip((current) => current ? { ...current, exiting: true } : null);
    window.clearTimeout(exitTimerRef.current);
    exitTimerRef.current = window.setTimeout(() => setTooltip(null), 130);
  }, []);

  const showIfTruncated = useCallback((isTouch = false) => {
    const target = targetRef.current;
    if (!target || !fullText || target.scrollWidth <= target.clientWidth + 1) return;
    window.clearTimeout(hideTimerRef.current);
    window.clearTimeout(exitTimerRef.current);
    const rect = target.getBoundingClientRect();
    setTooltip({ rect, text: fullText });
    if (isTouch) {
      window.clearTimeout(touchTimerRef.current);
      touchTimerRef.current = window.setTimeout(hide, 3500);
    }
  }, [fullText, hide]);

  useLayoutEffect(() => {
    if (!tooltip || !tooltipRef.current) return;
    const tipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 12;
    const gap = 8;
    const preferredLeft = tooltip.rect.right + gap;
    const left = preferredLeft + tipRect.width <= window.innerWidth - padding
      ? preferredLeft
      : Math.max(padding, tooltip.rect.left - tipRect.width - gap);
    const top = Math.max(padding, Math.min(
      tooltip.rect.top + tooltip.rect.height / 2 - tipRect.height / 2,
      window.innerHeight - tipRect.height - padding,
    ));
    tooltipRef.current.style.left = `${left}px`;
    tooltipRef.current.style.top = `${top}px`;
    tooltipRef.current.style.visibility = "visible";
  }, [tooltip]);

  useEffect(() => {
    const trigger = targetRef.current?.closest("button, a, [role='button']") || targetRef.current?.parentElement;
    const onFocusIn = (event) => {
      if (event.target === trigger) showIfTruncated(false);
    };
    const onFocusOut = (event) => {
      if (event.target === trigger && !trigger?.contains(event.relatedTarget)) hide();
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    if (!tooltip) {
      return () => {
        document.removeEventListener("focusin", onFocusIn);
        document.removeEventListener("focusout", onFocusOut);
      };
    }
    const onPointerDown = (event) => {
      if (targetRef.current?.contains(event.target) || tooltipRef.current?.contains(event.target)) return;
      hide();
    };
    const onKeyDown = (event) => event.key === "Escape" && hide();
    const onResize = () => hide();
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [tooltip, hide, showIfTruncated]);

  useEffect(() => () => {
    window.clearTimeout(hideTimerRef.current);
    window.clearTimeout(touchTimerRef.current);
    window.clearTimeout(exitTimerRef.current);
  }, []);

  const scheduleHide = () => {
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(hide, 140);
  };

  return (
    <>
      <span
        {...props}
        ref={targetRef}
        className={className}
        style={style}
        aria-label={fullText || undefined}
        onMouseEnter={() => showIfTruncated(false)}
        onMouseLeave={scheduleHide}
        onFocus={() => showIfTruncated(false)}
        onBlur={scheduleHide}
        onTouchStart={() => showIfTruncated(true)}
      >
        {children}
      </span>
      {tooltip && createPortal(
        <span
          ref={tooltipRef}
          role="tooltip"
          onMouseEnter={() => {
            window.clearTimeout(hideTimerRef.current);
            window.clearTimeout(exitTimerRef.current);
            setTooltip((current) => current ? { ...current, exiting: false } : current);
          }}
          onMouseLeave={scheduleHide}
          style={{
            position: "fixed", left: 0, top: 0, zIndex: 2147483000, visibility: "hidden",
            width: "max-content", maxWidth: "min(300px, calc(100vw - 24px))",
            maxHeight: "calc(100dvh - 24px)", overflow: "auto", padding: "0.45rem 0.65rem",
            border: "1px solid var(--border-subtle)", borderRadius: "8px",
            background: "var(--bg-secondary)", color: "var(--text-main)",
            boxShadow: "var(--shadow-md, 0 8px 24px rgba(0,0,0,.22))", fontSize: "0.78rem",
            lineHeight: 1.4, whiteSpace: "normal", overflowWrap: "anywhere", pointerEvents: "auto",
            animation: tooltip.exiting ? "truncatedTooltipFadeOut 120ms ease-in both" : "truncatedTooltipFadeIn 140ms ease-out both",
          }}
        >
          {tooltip.text}
          <style>{"@keyframes truncatedTooltipFadeIn{from{opacity:0}to{opacity:1}}@keyframes truncatedTooltipFadeOut{from{opacity:1}to{opacity:0}}"}</style>
        </span>,
        document.body,
      )}
    </>
  );
}
