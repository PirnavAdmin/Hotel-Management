const ACTION_SELECTOR = "button, [role=\"button\"]";
const EXISTING_LOADING_INDICATOR = ".app-loading-spinner, .takeaway-spinner, .auth-spinner, .animate-spin, .spin, [data-loading-indicator], [class*='spinner'], [class*='spin'], [class*='loader'], svg[style*='animation']";

function hasExistingLoadingIndicator(button, injectedSpinner = null) {
  return Array.from(button.querySelectorAll(EXISTING_LOADING_INDICATOR))
    .some((indicator) => indicator !== injectedSpinner);
}

function makeSpinner() {
  const spinner = document.createElement("span");
  spinner.className = "app-loading-spinner app-button-loading-spinner";
  spinner.setAttribute("aria-hidden", "true");
  return spinner;
}

export function installButtonLoading() {
  if (typeof document === "undefined" || document.__buttonLoadingInstalled) return;
  document.__buttonLoadingInstalled = true;

  let currentButton = null;
  let clearActionTimer = null;
  const states = new WeakMap();

  const setLoading = (button, loading) => {
    if (!button?.isConnected) return;
    let state = states.get(button);

    if (loading) {
      if (!state) {
        state = {
          count: 0,
          wasDisabled: Boolean(button.disabled),
          wasBusy: button.getAttribute("aria-busy"),
          spinner: null,
          pendingSpinner: null,
          spinnerObserver: null,
        };
        states.set(button, state);
        state.pendingSpinner = window.requestAnimationFrame(() => {
          state.pendingSpinner = null;
          if (!button.isConnected || states.get(button) !== state || state.count === 0) return;
          if (!hasExistingLoadingIndicator(button)) {
            state.spinner = makeSpinner();
            // React may commit its own conditional loading icon just after the
            // request event. Remove our fallback as soon as that happens.
            state.spinnerObserver = new MutationObserver(() => {
              if (state.spinner && hasExistingLoadingIndicator(button, state.spinner)) {
                state.spinner.remove();
                state.spinner = null;
                state.spinnerObserver?.disconnect();
                state.spinnerObserver = null;
              }
            });
            state.spinnerObserver.observe(button, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ["class", "style", "data-loading-indicator"],
            });
            button.insertBefore(state.spinner, button.firstChild);
          }
        });
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
      }
      state.count += 1;
      return;
    }

    if (!state) return;
    state.count = Math.max(0, state.count - 1);
    if (state.count > 0) return;

    if (state.pendingSpinner !== null) {
      window.cancelAnimationFrame(state.pendingSpinner);
      state.pendingSpinner = null;
    }
    state.spinnerObserver?.disconnect();
    state.spinnerObserver = null;
    state.spinner?.remove();
    button.disabled = state.wasDisabled;
    if (state.wasBusy === null) button.removeAttribute("aria-busy");
    else button.setAttribute("aria-busy", state.wasBusy);
    states.delete(button);
    if (currentButton === button) clearCurrentButton();
  };

  function clearCurrentButton() {
    if (clearActionTimer) window.clearTimeout(clearActionTimer);
    clearActionTimer = window.setTimeout(() => {
      currentButton = null;
      clearActionTimer = null;
    }, 0);
  }

  const captureAction = (event) => {
    const candidate = event.submitter || event.target?.closest?.(ACTION_SELECTOR);
    if (!candidate || candidate.disabled || !candidate.isConnected) return;
    currentButton = candidate;
    if (clearActionTimer) window.clearTimeout(clearActionTimer);
    clearActionTimer = null;
  };

  document.addEventListener("click", captureAction, true);
  document.addEventListener("submit", captureAction, true);
  window.addEventListener("api-request-start", (event) => {
    if (!currentButton) return;
    if (clearActionTimer) window.clearTimeout(clearActionTimer);
    clearActionTimer = null;
    event.detail.button = currentButton;
    setLoading(currentButton, true);
  });
  window.addEventListener("api-request-end", (event) => {
    const button = event.detail?.button;
    if (button) setLoading(button, false);
  });
}

