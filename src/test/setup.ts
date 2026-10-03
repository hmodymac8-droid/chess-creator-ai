import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom never fetches stylesheets, but React 19 suspends commits until <link rel="stylesheet">
// fires "load". Fire it for every link that is added so routes can paint.
new MutationObserver((records) => {
  for (const r of records)
    for (const n of r.addedNodes)
      if (n instanceof HTMLLinkElement) queueMicrotask(() => n.dispatchEvent(new Event("load")));
}).observe(document, { childList: true, subtree: true });
