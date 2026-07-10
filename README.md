# The Daily Signal

A calm, dementia-friendly news reader. It gathers a small, fixed set of RSS
feeds, pulls the clean article text for each story, and shows them **one at a
time** with big type, one clear action per screen, and always an obvious way
back. Built for a single reader (or a small household), installable as a
phone/tablet app.

> New to this repo? Read this file, then [`CONTEXT.md`](CONTEXT.md) for the
> durable background and [`DECISIONS.md`](DECISIONS.md) for *why* things are
> the way they are. Current work and the backlog live in [`TODO.md`](TODO.md).

## Run it locally

```bash
npm install
npm run dev
```

Then open <http://localhost:3001>. That's all — there are **no environment
variables or API keys** to set. (The port is 3001; see `package.json`.)

Other scripts: `npm run build` (production build) and `npm start` (serve the
build).

## How it works (the 60-second tour)

1. **`app/page.jsx`** runs on the server, calls `getHeadlines()`, and hands the
   list of stories to the UI. It is `force-dynamic`, so it renders fresh on
   every visit.
2. **`lib/feeds.js`** fetches the RSS feeds, keeps the newest handful, drops
   duplicates and anything too old, and caps the list. It caches the result in
   memory for **4 hours** so the feeds aren't re-fetched on every visit.
3. **`components/ReadingRoom.jsx`** is the entire UI: the home list, the
   slide-up reading view, read-aloud, and the text-size toggle.
4. When the reader taps a story, the UI calls **`app/api/article/route.js`**,
   which downloads that one article and extracts just the readable text.

## Where to change things

| I want to…                        | Edit…                                    |
| --------------------------------- | ---------------------------------------- |
| Add/remove a news feed or topic   | `FEEDS` in `lib/feeds.js`                |
| Change how many stories show      | `TOTAL_CAP` / `PER_FEED` in `lib/feeds.js` |
| Change the refresh interval       | `CACHE_MS` in `lib/feeds.js`             |
| Drop stories older than N days    | `MAX_AGE_MS` in `lib/feeds.js`           |
| Give a topic a color              | `CATEGORY_COLORS` in `lib/categories.js` |
| Add a source's logo               | `lib/sources.js` + a PNG in `public/sources/` |
| Change who's greeted by name      | `READER_NAME` in `components/ReadingRoom.jsx` |
| Adjust colors / fonts             | CSS variables in `app/globals.css`       |
| Hide article boilerplate/junk     | `BOILERPLATE` in `app/api/article/route.js` |

## Deploy

Hosted on Vercel, auto-deploying on every push to `main`. Import the GitHub
repo once in the Vercel dashboard; no configuration is required (Next.js is
auto-detected, and there are no env vars).

## Deliberate design choices

These are intentional — please don't "fix" them without checking `DECISIONS.md`:

- **No outbound links** anywhere in the UI. Article URLs are used server-side only.
- **No login, no accounts, no tracking** of what's been read.
- **A finite list with an end card** — no infinite scroll or engagement hooks.
- **Read-aloud uses the device's built-in voice** (kept simple on purpose).

## Tech

Next.js 14 (App Router, plain JSX), React 18, Tailwind (utility classes only),
`rss-parser`, and `@mozilla/readability` + `jsdom` for article extraction.
