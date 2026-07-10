import Parser from "rss-parser";

// One entry per (source, topic). The topic becomes the story's category chip,
// so use names from CATEGORY_COLORS in lib/categories.js. Add or remove rows
// to change what appears in the app.
export const FEEDS = [
  { source: "NPR", topic: "Science", url: "https://feeds.npr.org/1007/rss.xml" },
  { source: "NPR", topic: "World News", url: "https://feeds.npr.org/1004/rss.xml" },
  { source: "NPR", topic: "US News", url: "https://feeds.npr.org/1003/rss.xml" },
  { source: "NPR", topic: "Arts", url: "https://feeds.npr.org/1008/rss.xml" },
  { source: "PBS", topic: "Science", url: "https://www.pbs.org/newshour/feeds/rss/science" },
  { source: "PBS", topic: "Arts", url: "https://www.pbs.org/newshour/feeds/rss/arts" },
  { source: "BBC", topic: "Technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml" },
  { source: "The Guardian", topic: "Nature", url: "https://www.theguardian.com/environment/wildlife/rss" },
  { source: "The Guardian", topic: "Culture", url: "https://www.theguardian.com/culture/rss" },
];

const PER_FEED = 2; // newest N stories kept from each feed row above
const CACHE_MS = 4 * 60 * 60 * 1000; // serve cached feeds for 4 hours
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000; // drop stories older than 3 days

// In-memory cache. On a warm server instance this serves the same list for
// 4 hours, then the next request blocks for a fresh fetch and sees current
// news — no dependence on prior traffic, no stale-snapshot lag.
let cache = { data: null, at: 0 };

const parser = new Parser({
  timeout: 10000,
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
    ],
  },
});

function extractImage(item) {
  const media = [...(item.mediaContent || []), ...(item.mediaThumbnail || [])]
    .map((m) => m?.$ || {})
    .filter((m) => m.url && !/\.(mp3|mp4|m4a)(\?|$)/i.test(m.url))
    // prefer the largest variant when the feed offers several sizes
    .sort((a, b) => (Number(b.width) || 0) - (Number(a.width) || 0));
  if (media[0]) return media[0].url;
  if (item.enclosure?.url && /image/.test(item.enclosure.type || "")) {
    return item.enclosure.url;
  }
  return null;
}

// Some feeds (notably all the NPR section feeds) carry no image metadata at
// all. For those stories, pull the article page's og:image at feed-refresh
// time. Runs server-side once per revalidation, in parallel, and fails soft.
async function fetchOgImage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 200000);
    const m =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function cleanSnippet(text) {
  if (!text) return "";
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 180 ? t.slice(0, 177) + "…" : t;
}

export async function getHeadlines() {
  const fresh = cache.data && Date.now() - cache.at < CACHE_MS;
  if (fresh) return cache.data;
  try {
    const data = await fetchFreshHeadlines();
    cache = { data, at: Date.now() };
    return data;
  } catch (err) {
    // If a refresh fails, fall back to the last good list rather than an
    // empty page.
    if (cache.data) return cache.data;
    throw err;
  }
}

async function fetchFreshHeadlines() {
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      return parsed.items.slice(0, PER_FEED).map((item) => ({
        id: item.link || item.guid,
        source: feed.source,
        category: feed.topic,
        headline: (item.title || "").trim(),
        dek: cleanSnippet(item.contentSnippet),
        url: item.link,
        publishedAt: item.isoDate || item.pubDate || null,
        image: extractImage(item),
      }));
    })
  );

  const cutoff = Date.now() - MAX_AGE_MS;
  const stories = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .filter((s) => s.headline && s.url)
    // Drop stragglers from slow sections (a feed's 2nd-newest item can be
    // days old). Keep undated items rather than guess them stale.
    .filter((s) => !s.publishedAt || new Date(s.publishedAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

  // The same article can appear on more than one section feed (e.g. NPR
  // World News and US News); keep only its first (newest-sorted) occurrence.
  const seen = new Set();
  const unique = stories.filter((s) => (seen.has(s.id) ? false : seen.add(s.id)));

  await Promise.all(
    unique
      .filter((s) => !s.image)
      .map(async (s) => {
        s.image = await fetchOgImage(s.url);
      })
  );

  return unique;
}
