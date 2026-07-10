// Maps a story's `source` name to its locally-hosted icon (in public/sources/).
// Add a row and drop a matching PNG here when introducing a new source.
const SOURCE_ICONS = {
  NPR: "/sources/npr.png",
  BBC: "/sources/bbc.png",
  "The Guardian": "/sources/guardian.png",
  PBS: "/sources/pbs.png",
};

export function iconFor(source) {
  return SOURCE_ICONS[source] || null;
}
