# CONTEXT

The "memory doc": durable context for this project. Read this first when
resuming work.

## What this is

**The Daily Signal** — a calm, dementia-friendly news reader Paul is building
for his father **Mike** (who is also greeted by name in Paul's other app,
Memory Lane). It pulls a fixed set of RSS section feeds every 4 hours,
extracts clean article text server-side, and presents one story at a time
with big type, one action per screen, and always an obvious way back.

## Stack

- Next.js 14 (app router, JSX not TS), React 18, Tailwind (utility classes only).
- `rss-parser` for feeds; `@mozilla/readability` + `jsdom` for article extraction.
- Inline styles referencing CSS custom properties (`--rr-*` in `app/globals.css`).
- Fonts: Spline Sans (UI + headlines) via Google Fonts.
- Installable PWA: `app/manifest.js` + icons in `public/`.

## Architecture

- `app/page.jsx` — `force-dynamic` server component; renders live on every
  request. Freshness comes from a 4-hour in-memory cache in `getHeadlines()`,
  not from ISR (see DECISIONS.md for why).
- `lib/feeds.js` — `FEEDS`: one row per (source, topic); the topic IS the
  story's category chip. Up to `PER_FEED` stories per row, merged newest-first,
  deduped, older-than-`MAX_AGE_MS` dropped, then hard-capped at `TOTAL_CAP`.
  Holds the 4-hour in-memory cache.
- `lib/categories.js` — category → accent color map (single source of truth).
- `lib/sources.js` — source name → local icon path (`public/sources/*.png`).
- `app/api/article/route.js` — on-demand readability extraction, domain
  allowlisted to the feed sources, with a boilerplate filter (PBS donation
  appeals etc.). Responses cached 1 day.
- `components/ReadingRoom.jsx` — the whole UI, from the Claude Design handoff
  ("One at a Time", direction 1b). Original handoff preserved at
  `handoff/ReadingRoom.OneAtATime.jsx`; first text-only mock at
  `archive/reading-room.mock.jsx`.

## Product rules (intentional, don't "fix")

- **No outbound links anywhere.** Story URLs are used server-side only.
- Stateless: does not remember which stories were read.
- Calm tone: no error jargon, no infinite feed (finite list + end card),
  no login for Mike to trip over.
- Read-aloud uses local SpeechSynthesis with a best-voice picker — kept
  deliberately (premium TTS considered and deferred).

## Mike

Greeted by name (`READER_NAME` in `components/ReadingRoom.jsx`). Interests:
technology, current events, Coca-Cola. Current topic mix: NPR (Science,
World News, US News, Arts), PBS (Science, Arts), BBC (Technology),
Guardian (Nature/wildlife, Culture).

## Deploy

- GitHub: `oxtailbadger/the-daily-signal`, branch `main`.
- Vercel auto-deploys on push to `main` (same pattern as memory-lane-game).
- Local dev: `npm run dev` on :3001 (launch config lives in the ROOT
  `/Users/pstanton/.claude/launch.json`, entry `reading-room`).
