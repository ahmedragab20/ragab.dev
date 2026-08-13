export type FocusElOptions = {
  preventScroll?: boolean;
};

/** Focus an element; set tabindex=-1 when it is not already focusable via tabindex. */
export function focusEl(el: HTMLElement | null | undefined, opts?: FocusElOptions): void {
  if (!el) return;
  if (!el.hasAttribute("tabindex")) {
    el.setAttribute("tabindex", "-1");
  }
  el.focus({ preventScroll: opts?.preventScroll ?? true });
}

/** Announce to screen readers via BaseLayout live regions. */
export function announce(message: string, polite = true): void {
  if (typeof document === "undefined") return;
  const id = polite ? "ragab-a11y-status" : "ragab-a11y-alert";
  const region = document.getElementById(id);
  if (!region) return;
  region.textContent = "";
  window.setTimeout(() => {
    region.textContent = message;
  }, 20);
}
