// Single source of truth for categories and their accent colors.
// A story's category comes directly from the section feed it arrived on
// (see FEEDS in lib/feeds.js), so this list should cover every `topic` used
// there. Colors are CSS tokens from globals.css. Anything unlisted falls
// back to blue.
export const CATEGORY_COLORS = {
  Science: "var(--rr-blue)",
  "World News": "var(--rr-blue)",
  "US News": "var(--rr-blue)",
  Technology: "var(--rr-blue)",
  Arts: "var(--rr-clay)",
  Culture: "var(--rr-clay)",
  Nature: "var(--rr-green)",
};

export function colorFor(categoryName) {
  return CATEGORY_COLORS[categoryName] || "var(--rr-blue)";
}
