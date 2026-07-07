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

function cleanSnippet(text) {
  if (!text) return "";
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 180 ? t.slice(0, 177) + "…" : t;
}

export async function getHeadlines() {
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

  const stories = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .filter((s) => s.headline && s.url)
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

  return stories;
}
