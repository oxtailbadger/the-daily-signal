# DECISIONS

Running log of choices and their reasons. Newest last.

- **Next.js + ISR over cron** — the 4-hour refresh is `revalidate = 14400` on
  the page; first visitor after expiry triggers the refetch. Simpler and free
  vs. a scheduled job; fine for one household of users.
- **Server-side article extraction** — browsers can't fetch RSS/articles
  cross-origin; `/api/article` runs readability on the source HTML. Endpoint
  is allowlisted to feed domains so it can't be used as an open proxy.
- **Section feeds instead of keyword filtering** — originally a `TOPICS`
  keyword filter guessed categories from headlines; replaced by subscribing
  per-source section feeds (e.g. "Music from NPR but not the Guardian").
  The section is the category — accurate, and per-source relevance control.
- **Guardian "Nature" = the wildlife feed**, not the broader environment feed
  (climate policy is heavier reading). Swap the URL in `lib/feeds.js` if
  broader coverage is wanted.
- **PER_FEED = 2** — 9 feed rows ≈ 18 stories; a finite, calm list.
- **No outbound links** — Paul's explicit requirement; even the error state
  doesn't link to the source.
- **Renamed "The Reading Room" → "The Daily Signal"** (2026-07-06), intro
  copy: "Tap a story to read it. Explore the news on your time."
- **Voice kept local** — SpeechSynthesis with a best-available-voice picker;
  premium/server TTS deferred.
- **PBS donation boilerplate stripped** in the extraction route via regex
  list (`BOILERPLATE`), extend it there if other sources add appeals.
- **Handoff JSX committed, zip not** — `handoff/ReadingRoom.OneAtATime.jsx`
  kept for provenance; the zip and extract folder are gitignored.
