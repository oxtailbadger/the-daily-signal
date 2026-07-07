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

## Done
- [x] All five handoff TODOs (category map, palette tokens, voice, orientation,
      data refresh) — see DECISIONS.md.
- [x] PWA: manifest + icons (beacon on paper, `public/icon-*.png`).
- [x] Greet Mike by name.
- [x] Strip PBS donation boilerplate from articles.
- [x] Dementia-design v0 pass: Aa/Aa text-size toggle (persisted), tap
      feedback on all buttons, WCAG 4.5:1 contrast for green/clay tokens,
      chip/masthead type bumped 12→14px.
