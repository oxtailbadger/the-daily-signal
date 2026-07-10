import { NextResponse } from "next/server";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

// jsdom needs the Node.js runtime (it won't run on the Edge runtime).
export const runtime = "nodejs";
// Backstop so a slow source can't run past the platform's function limit.
export const maxDuration = 20;

// Only extract articles from the domains our feeds actually link to,
// so this endpoint can't be used as an open proxy.
const ALLOWED_HOSTS = [
  "npr.org",
  "bbc.co.uk",
  "bbc.com",
  "theguardian.com",
  "pbs.org",
];

// Abort the upstream fetch well under the serverless function limit (Vercel
// Hobby kills functions at ~10s) so we return a graceful error, not a 504.
const FETCH_TIMEOUT_MS = 8000;
// Don't hand an unbounded page to jsdom — cap what we read into memory.
const MAX_HTML_BYTES = 5_000_000;

function hostAllowed(url) {
  try {
    const host = new URL(url).hostname;
    return ALLOWED_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}

export async function GET(request) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url || !hostAllowed(url)) {
    return NextResponse.json({ error: "Invalid or unsupported URL" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Upstream responded ${res.status}`);

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("html")) {
      throw new Error(`Unexpected content-type: ${contentType || "none"}`);
    }

    // Cap what we parse; a pathologically large page shouldn't exhaust memory.
    const html = (await res.text()).slice(0, MAX_HTML_BYTES);
    const dom = new JSDOM(html, { url });
    const article = new Readability(dom.window.document).parse();
    if (!article || !article.textContent?.trim()) throw new Error("Extraction failed");

    // Lead image fallback for stories whose RSS entry had no picture.
    const ogImage =
      dom.window.document
        .querySelector('meta[property="og:image"], meta[name="twitter:image"]')
        ?.getAttribute("content") || null;

    // Boilerplate that readability extraction picks up but isn't article text
    // (e.g. PBS's donation appeal).
    const BOILERPLATE = [
      /a free press is a cornerstone of a healthy democracy/i,
      /support trusted journalism/i,
      /support pbs news/i,
      /donate now/i,
    ];

    const paragraphs = article.textContent
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 40)
      .filter((p) => !BOILERPLATE.some((re) => re.test(p)));

    if (paragraphs.length === 0) throw new Error("No readable text found");

    return NextResponse.json(
      { title: article.title, byline: article.byline, paragraphs, image: ogImage },
      { headers: { "Cache-Control": "public, s-maxage=86400" } }
    );
  } catch (err) {
    // Log the real cause so failures are debuggable; the client still gets a
    // calm, generic message (handled as the "didn't load" state in the UI).
    console.error(`[article] extraction failed for ${url}:`, err?.message || err);
    return NextResponse.json({ error: "Could not load article" }, { status: 502 });
  }
}
