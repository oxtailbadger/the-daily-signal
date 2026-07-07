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
- [ ] Consider very-large-text option (the old mock had an Aa toggle;
      the new design dropped it — bring back if Mike needs it).
- [ ] Per-source empty state if a whole feed goes quiet.

## Done
- [x] All five handoff TODOs (category map, palette tokens, voice, orientation,
      data refresh) — see DECISIONS.md.
- [x] PWA: manifest + icons (beacon on paper, `public/icon-*.png`).
- [x] Greet Mike by name.
- [x] Strip PBS donation boilerplate from articles.
