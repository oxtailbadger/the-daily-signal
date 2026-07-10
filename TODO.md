# TODO

## Now
- [ ] Connect repo to Vercel (import `oxtailbadger/the-daily-signal` in the
      Vercel dashboard; auto-deploy on push to `main`).
- [ ] Test on Mike's actual device after deploy: home-screen install, text
      size, and the "Read this to me" button (voice quality varies by device).

## Later / ideas
- [ ] Nicer read-aloud voice (server-side TTS) + highlight the sentence
      being read (`useReadAloud` in components/ReadingRoom.jsx keeps a stable
      { speak, stop, speakingId } API for this swap).
- [ ] Revisit topic mix with Mike (add Food/Books? drop anything?) —
      one row per feed in `lib/feeds.js`.
- [ ] Per-source empty state if a whole feed goes quiet.
- [ ] Distressing-content handling (v0 open question): bias the feed toward
      gentler sections and/or filter alarming items — Paul's content call.

## Engineering backlog (from the 2026-07-10 readability/reliability review)
- [ ] **B1. Split `components/ReadingRoom.jsx` (~590 lines).** Extract
      `useReadAloud`, `ListenButton`, `StoryPhoto`, `SourceTag`, `CategoryChip`
      into their own files so the main component is easier to follow. The
      single-file style came from the design handoff; this is a pure refactor.
- [ ] **B2. Add ESLint + a few unit tests** on the pure logic: `categorize`
      (removed — now section-based, so test the dedupe/age/cap pipeline in
      `lib/feeds.js`) and `hostAllowed` in `app/api/article/route.js`. Gives a
      junior a safety net when editing feeds.
- [ ] **B3. De-dupe in-flight feed refreshes.** If two requests arrive while
      the `lib/feeds.js` cache is stale, both do the full fetch. Harmless for
      one user; hold an in-flight promise to collapse them if traffic grows.

## Done
- [x] All five handoff TODOs (category map, palette tokens, voice, orientation,
      data refresh) — see DECISIONS.md.
- [x] PWA: manifest + icons (beacon on paper, `public/icon-*.png`).
- [x] Greet Mike by name.
- [x] Strip PBS donation boilerplate from articles.
- [x] Cap the feed to 10 stories; read-aloud queues if tapped while loading.
- [x] Dementia-design v0 pass: Aa/Aa text-size toggle (persisted), tap
      feedback on all buttons, WCAG 4.5:1 contrast for green/clay tokens,
      chip/masthead type bumped 12→14px.
- [x] Reliability/readability review (2026-07-10): article route hardened
      (8s fetch timeout under the platform limit, `maxDuration`, content-type
      guard, 5 MB HTML cap, error logging, explicit Node runtime); removed the
      unused Newsreader font; wrote README.md; refreshed CONTEXT/DECISIONS;
      moved the old mock to `archive/`; extracted shared button styles.
