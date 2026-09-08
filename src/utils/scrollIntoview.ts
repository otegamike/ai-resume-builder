export default function scrollToId(id: string, opts: ScrollIntoViewOptions = { behavior: "smooth", block: "start" }) {
  const element = document.getElementById(id);
  element?.scrollIntoView(opts);
}

export function delayedScrollIntoView(
  id: string,
  delayMs = 250,
  opts: ScrollIntoViewOptions = { behavior: "smooth", block: "start" }
): () => void {
  if (typeof document === "undefined") return () => {};
  let t: ReturnType<typeof setTimeout> | null = null;
  let raf: number | null = null;

  const run = () => {
    const el = document.getElementById(id);
    if (!el) return;
    const container = el.closest("[data-scroll-container]") as HTMLElement | null;
    const stepsWrapper = document.querySelector("[data-steps-wrapper]") as HTMLElement | null;
    const scrollContainer = container ?? stepsWrapper;
    if (scrollContainer && scrollContainer !== el && scrollContainer.contains(el)) {
      const top = el.offsetTop - 8;
      scrollContainer.scrollTo({ top, behavior: (opts.behavior as ScrollBehavior) ?? "smooth" });
    } else {
      el.scrollIntoView(opts);
    }
  };

  raf = requestAnimationFrame(() => {
    raf = requestAnimationFrame(() => {
      t = setTimeout(run, delayMs);
    });
  });

  return () => {
    if (raf !== null) cancelAnimationFrame(raf);
    if (t !== null) clearTimeout(t);
  };
}

export function delayedScrollIntoViewIn(
  container: HTMLElement | null,
  targetId: string,
  delayMs = 250,
  opts: ScrollIntoViewOptions = { behavior: "smooth", block: "start" } as ScrollIntoViewOptions
): () => void {
  if (typeof document === "undefined") return () => {};
  let t: ReturnType<typeof setTimeout> | null = null;
  let raf: number | null = null;

  const run = () => {
    const scope = container ?? document;
    const el = (scope instanceof HTMLElement ? scope.querySelector(`#${CSS.escape(targetId)}`) : document.getElementById(targetId)) as HTMLElement | null;
    if (!el) return;
    const scrollContainer = container && container.contains(el) ? container : null;
    if (scrollContainer) {
      const top = el.offsetTop - 8;
      scrollContainer.scrollTo({ top, behavior: (opts.behavior as ScrollBehavior) ?? "smooth" });
    } else {
      el.scrollIntoView(opts);
    }
  };

  raf = requestAnimationFrame(() => {
    raf = requestAnimationFrame(() => {
      t = setTimeout(run, delayMs);
    });
  });

  return () => {
    if (raf !== null) cancelAnimationFrame(raf);
    if (t !== null) clearTimeout(t);
  };
}

export const scrollIntoView = (containerId: string, tabId: string) => {
  const container = document.getElementById(containerId);
  const tab = document.getElementById(tabId);

  if (container && tab) {
    const targetScrollPos = tab.offsetLeft - container.offsetLeft;

    container.scrollTo({
      left: targetScrollPos,
      behavior: 'smooth'
    });
  }
};