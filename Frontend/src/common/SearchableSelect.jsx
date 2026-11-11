import React, { Children, isValidElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import "./SearchableSelect.css";

export default function SearchableSelect({
  options: suppliedOptions,
  children,
  value = "",
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search options…",
  emptyMessage = "No results found",
  allowCustom = false,
  customLabel = "+ Custom",
  onCustom,
  style,
  className,
  title,
  id,
  disabled = false,
  "aria-label": ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState(null);
  const [active, setActive] = useState(-1);
  const rootRef = useRef(null);
  const popoverRef = useRef(null);
  const searchRef = useRef(null);
  const optionRefs = useRef([]);
  const childrenMode = suppliedOptions == null;
  const options = useMemo(() => childrenMode
    ? Children.toArray(children).filter((child) => isValidElement(child) && child.type === "option").map((child) => ({ value: child.props.value ?? child.props.children ?? "", label: child.props.children ?? "", disabled: child.props.disabled }))
    : suppliedOptions, [children, childrenMode, suppliedOptions]);
  const normalizedOptions = useMemo(() => {
    const seen = new Set();
    return options.map((option) => typeof option === "string" ? { label: option, value: option } : option)
      .filter((option) => option && String(option.label ?? option.value ?? "").trim())
      .filter((option) => {
        const key = String(option.value ?? option.label).trim().toLocaleLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [options]);
  const filtered = normalizedOptions.filter((option) => String(option.label ?? option.value).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const selected = normalizedOptions.find((option) => String(option.value) === String(value));
  const count = filtered.length + (allowCustom ? 1 : 0);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false); setQuery(""); setActive(-1); setPosition(null);
    if (restoreFocus) requestAnimationFrame(() => rootRef.current?.querySelector("button")?.focus());
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const maxHeight = Math.min(300, window.innerHeight - 20);
      const below = window.innerHeight - rect.bottom - 8;
      const top = below >= 190 || rect.top < maxHeight + 16 ? rect.bottom + 4 : Math.max(8, rect.top - maxHeight - 4);
      setPosition({ top, left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)), width: rect.width, maxHeight });
    };
    place();
    const outside = (event) => { if (!rootRef.current?.contains(event.target) && !popoverRef.current?.contains(event.target)) close(); };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { document.removeEventListener("pointerdown", outside); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [close, open]);

  useEffect(() => { if (open) searchRef.current?.focus(); }, [open]);
  useEffect(() => { if (active >= 0) optionRefs.current[active]?.focus(); }, [active]);
  const move = (delta) => setActive((current) => (current + delta + count) % count);
  const choose = (option) => { onChange?.(childrenMode ? { target: { value: String(option.value) } } : option.value); close(); };
  const chooseCustom = () => { onCustom?.(); close(); };
  const handleListKey = (event, index) => {
    if (event.key === "ArrowDown") { event.preventDefault(); move(1); }
    if (event.key === "ArrowUp") { event.preventDefault(); if (index === 0) searchRef.current?.focus(); else move(-1); }
    if (event.key === "Escape") { event.preventDefault(); close(true); }
  };

  return <div className="searchable-select" ref={rootRef}>
    <button id={id} className={`searchable-select-trigger ${className || ""}`} style={style} type="button" title={title} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={() => setOpen((current) => !current)} onKeyDown={(event) => { if (event.key === "ArrowDown" && !open) { event.preventDefault(); setOpen(true); } }}>
      <span className={selected || value ? "" : "searchable-select-placeholder"}>{(selected?.label ?? value) || placeholder}</span><ChevronDown size={15} aria-hidden="true" />
    </button>
    {open && position && createPortal(<div className="searchable-select-popover" ref={popoverRef} style={position} role="dialog" aria-label={ariaLabel ? `${ariaLabel} options` : "Select options"}>
      <label className="searchable-select-search"><Search size={14} aria-hidden="true" /><input ref={searchRef} type="search" placeholder={searchPlaceholder} value={query} aria-label={`Search ${ariaLabel || "options"}`} onChange={(event) => { setQuery(event.target.value); setActive(-1); }} onKeyDown={(event) => {
        if (event.key === "ArrowDown" && count) { event.preventDefault(); setActive(0); }
        if (event.key === "ArrowUp" && count) { event.preventDefault(); setActive(count - 1); }
        if (event.key === "Escape") { event.preventDefault(); close(true); }
        if (event.key === "Enter") { event.preventDefault(); if (active >= 0 && active < filtered.length) choose(filtered[active]); else if (active === filtered.length && allowCustom) chooseCustom(); else if (filtered.length === 1) choose(filtered[0]); }
      }} /></label>
      <div className="searchable-select-options" role="listbox" aria-label={ariaLabel}>
        {filtered.map((option, index) => <button key={`${option.value}-${index}`} ref={(node) => { optionRefs.current[index] = node; }} type="button" role="option" aria-selected={String(option.value) === String(value)} disabled={option.disabled} className="searchable-select-option" onKeyDown={(event) => handleListKey(event, index)} onClick={() => choose(option)}>
          <span>{option.label}</span>{String(option.value) === String(value) && <Check size={14} aria-hidden="true" />}
        </button>)}
        {!filtered.length && <div className="searchable-select-empty" role="status">{emptyMessage}</div>}
        {allowCustom && <button ref={(node) => { optionRefs.current[filtered.length] = node; }} type="button" role="option" aria-selected="false" className="searchable-select-option searchable-select-custom" onKeyDown={(event) => handleListKey(event, filtered.length)} onClick={chooseCustom}>{customLabel}</button>}
      </div>
    </div>, document.body)}
  </div>;
}

export { SearchableSelect };
