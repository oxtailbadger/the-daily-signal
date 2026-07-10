# DECISIONS

Running log of choices and their reasons. Newest last.

- **Refresh: in-memory 4h cache + force-dynamic (replaced ISR, 2026-07-07)** —
  originally used `export const revalidate = 14400` (on-demand ISR). On a
  low-traffic single-user app that felt stale for days: ISR serves the
  *previous* snapshot on the triggering visit and never refreshes without
  traffic. Now the page is `force-dynamic` and `getHeadlines()` holds a
  module-level cache (`CACHE_MS = 4h`): every visit renders live, serving
  cached feeds until 4h elapse, then blocking for a fresh fetch so the
  visitor sees current news immediately — no traffic dependence, no
  stale-snapshot lag. Trade-off: no CDN HTML caching and occasional refetch
  on serverless cold starts, both negligible for one household. A refresh
  failure falls back to the last good list.
- **TOTAL_CAP = 10 stories (2026-07-10)** — for a dementia-friendly, easy-to-
  consume feed and to avoid doom-scrolling, the list is hard-capped at the 10
  newest stories across all feeds (after dedupe + age filter), even if a feed
  contributed more than one. `PER_FEED` stays 2 as the per-feed candidate pool.
  Capping before the og:image fallback also means we only fetch images for
  shown stories.
- **Read-aloud honors taps made while the article is still loading** — tapping
  "Read this to me" before the body arrives no longer reads just the headline
  and stops. It queues (button shows "Starting when ready…") and auto-starts
  with the full article once loaded; a load error drops the request. See
  `pendingSpeak` in components/ReadingRoom.jsx.
- **MAX_AGE_MS = 3 days** — a feed's 2nd-newest item can genuinely be days
  old (slow sections like PBS Science); with `PER_FEED = 2` those stragglers
  surfaced as "stale." Items older than 3 days are dropped (undated items
  kept). A slow section may show 1 item rather than a stale one.
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
- **Card images: og:image fallback at feed-refresh time** — NPR's section
  feeds carry no image metadata at all (PBS/BBC/Guardian do), so stories
  arriving without an image get their article page's og:image fetched
  server-side during the 4-hour revalidation (parallel, 6s timeout,
  fails soft to the tinted category block).
- **Dementia-design v0 pass (pre-Mike)** — per published guidance (JMIR
  review, Smashing, AbilityNet): restored the text-size toggle from the
  original mock (persisted in localStorage as `ds-large-text`), added a
  global button :active pressed state, darkened green (#4C795F→#426853)
  and clay (#94704E→#836244) so all small-text pairings clear WCAG 4.5:1,
  and bumped chip/masthead type 12→14px. Deliberately did NOT add settings,
  personalization, or reading history — co-design those with Mike.
- **Source attribution on cards (2026-07-10)** — each card shows the topic
  chip plus the originating site's icon + name (NPR/BBC/Guardian/PBS). Icons
  are the sites' real favicons, downloaded once to `public/sources/*.png`
  (via Google's favicon service) so there's no runtime external dependency;
  `lib/sources.js` maps source name → local icon path. Add a row + PNG there
  for a new source.
- **Handoff JSX committed, zip not** — `handoff/ReadingRoom.OneAtATime.jsx`
  kept for provenance; the zip and extract folder are gitignored.
