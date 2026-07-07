import { NextResponse } from "next/server";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

// Only extract articles from the domains our feeds actually link to,
// so this endpoint can't be used as an open proxy.
const ALLOWED_HOSTS = [
  "npr.org",
  "bbc.co.uk",
  "bbc.com",
  "theguardian.com",
  "pbs.org",
];

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
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`Upstream responded ${res.status}`);

    const html = await res.text();
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
    return NextResponse.json({ error: "Could not load article" }, { status: 502 });
  }
}
