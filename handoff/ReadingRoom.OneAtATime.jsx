"use client";

/**
 * ReadingRoom — "One at a Time" (Direction 1b)
 * =============================================
 * Dementia-friendly reading room. Approved design direction 1b.
 *
 * Audience: person with early-stage dementia, reading independently.
 * Principles: biggest legible type, one action per screen, obvious big buttons,
 * always an obvious way back, calm low-stimulation feel, a warm greeting, and a
 * gentle "you finished" confirmation.
 *
 * Drop-in replacement for the existing <Reader />. Same contract:
 *   - receives `stories` (array; see shape below)
 *   - fetches full article body from `/api/article?url=...`
 * Stateless by design: it does NOT remember which stories were read.
 *
 * Fonts required (load globally in the app, e.g. next/font or a <link>):
 *   Spline Sans (UI + headlines), Newsreader (masthead wordmark).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TODOs for Claude Code:
 *
 *  [TODO:CATEGORY-MAP] Category → accent color is auto-mapped from a FIXED
 *      category list you will define. Fill CATEGORY_COLORS below and make it the
 *      single source of truth. Stories only need `category`; color is derived.
 *
 *  [TODO:PALETTE-TOKENS] Move the `palette` object into CSS custom properties
 *      (e.g. --rr-blue / --rr-green / --rr-clay / --rr-paper / --rr-ink) or your
 *      design-system theme, and reference vars instead of hard-coded hex here.
 *
 *  [TODO:VOICE] Read-aloud currently uses the browser's SpeechSynthesis (robotic).
 *      Swap for a nicer TTS voice (and ideally highlight the sentence being read).
 *      See `useReadAloud` — replace the internals, keep the { speak, stop, speakingId } API.
 *
 *  [TODO:ORIENTATION] Confirm the two "ways out": (1) the big bottom Back button,
 *      and (2) tapping the masthead should always return Home. Wire the masthead
 *      tap + verify the back control stays reachable (sticky) on long articles.
 *
 *  [TODO:DATA-REFRESH] Stories load every 4 hours (data layer). This component
 *      just renders whatever `stories` it's given; add revalidation upstream.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Story shape:
 *   {
 *     id: string,
 *     category: string,        // maps to an accent via CATEGORY_COLORS
 *     source: string,
 *     headline: string,
 *     dek?: string,
 *     image?: string,          // front-page card photo; falls back gracefully
 *     url: string,             // fetched for the full body
 *     publishedAt?: string,    // ISO (optional)
 *   }
 */

import { useEffect, useRef, useState } from "react";

/* ── Theme ──────────────────────────────────────────────────────────────── */
// [TODO:PALETTE-TOKENS] promote these to CSS variables / design tokens.
const palette = {
  paper: "#F1EEE6",
  paperCard: "#FFFFFF",
  ink: "#23302B",
  inkSoft: "#5C665F",
  inkBody: "#2B3833",
  rule: "#E4DED2",
  // calming accents — shared chroma/lightness, varied hue (blue / green / clay)
  blue: "#43647E",
  green: "#4C795F",
  clay: "#94704E",
  greenSoft: "#E7EFE9",
  chipText: "#FFFFFF",
};

const fonts = {
  head: "'Spline Sans', system-ui, sans-serif",
  ui: "'Spline Sans', system-ui, sans-serif",
  mast: "'Newsreader', Georgia, serif",
};

// [TODO:CATEGORY-MAP] Authoritative category → accent mapping.
// Keys should be your fixed category list. Anything unlisted falls back to `blue`.
const CATEGORY_COLORS = {
  Gardens: palette.green,
  Nature: palette.green,
  Music: palette.blue,
  Weather: palette.blue,
  Food: palette.clay,
  History: palette.clay,
};
const colorFor = (category) => CATEGORY_COLORS[category] || palette.blue;

/* ── Helpers ────────────────────────────────────────────────────────────── */
function greetingFor(date = new Date()) {
  const h = date.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function longDate(date = new Date()) {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/* [TODO:VOICE] Replace SpeechSynthesis internals with a better TTS voice.
   Keep this hook's return API: { speakingId, speak(id, text), stop() }. */
function useReadAloud() {
  const [speakingId, setSpeakingId] = useState(null);
  const stop = () => {
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch {}
    setSpeakingId(null);
  };
  const speak = (id, text) => {
    if (speakingId === id) return stop();
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.92;
      u.onend = () => setSpeakingId(null);
      window.speechSynthesis.speak(u);
      setSpeakingId(id);
    } catch {}
  };
  useEffect(() => () => stop(), []); // stop on unmount
  return { speakingId, speak, stop };
}

/* ── Small pieces ───────────────────────────────────────────────────────── */
function CategoryChip({ category, color }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: fonts.ui,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: palette.chipText,
        background: color,
        padding: "5px 11px",
        borderRadius: 999,
      }}
    >
      {category}
    </span>
  );
}

/** Front-page card photo with a graceful no-image fallback (calm, on-brand). */
function StoryPhoto({ src, category, color, height = 150, radiusTop = true, rounded = false }) {
  const [failed, setFailed] = useState(false);
  const radius = rounded ? 16 : 0;
  const style = {
    height,
    borderTopLeftRadius: radiusTop || rounded ? radius || 0 : 0,
    borderTopRightRadius: radiusTop || rounded ? radius || 0 : 0,
    borderRadius: rounded ? 16 : undefined,
    display: "block",
    width: "100%",
    objectFit: "cover",
  };

  if (!src || failed) {
    // Graceful no-image state: soft tinted block tinted by the story's accent.
    return (
      <div
        style={{
          ...style,
          objectFit: undefined,
          background: `linear-gradient(135deg, ${color}22, ${color}0f)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-hidden="true"
      >
        <span
          style={{
            fontFamily: fonts.ui,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "0.04em",
            color,
            opacity: 0.85,
          }}
        >
          {category}
        </span>
      </div>
    );
  }
  return <img src={src} alt="" style={style} onError={() => setFailed(true)} />;
}

function ListenButton({ active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: fonts.ui,
        fontSize: 15,
        fontWeight: 600,
        color: palette.green,
        background: palette.greenSoft,
        border: "none",
        cursor: "pointer",
        padding: "11px 17px",
        borderRadius: 999,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 12 }}>▶</span>
      {active ? "Stop reading" : "Read this to me"}
    </button>
  );
}

/* ── Component ──────────────────────────────────────────────────────────── */
export default function ReadingRoom({ stories = [] }) {
  const [openId, setOpenId] = useState(null);     // story currently open
  const [phase, setPhase] = useState("list");     // "list" | "reading" | "done"
  const [paragraphs, setParagraphs] = useState(null);
  const [articleImage, setArticleImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const { speakingId, speak, stop } = useReadAloud();
  const scrollRef = useRef(null);

  const story = stories.find((s) => s.id === openId) || null;
  const now = new Date();

  const openStory = async (s) => {
    stop();
    setOpenId(s.id);
    setPhase("reading");
    setLoading(true);
    setError(false);
    setParagraphs(null);
    setArticleImage(s.image || null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    try {
      const res = await fetch(`/api/article?url=${encodeURIComponent(s.url)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setParagraphs(data.paragraphs);
      if (!s.image && data.image) setArticleImage(data.image);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const backToList = () => { stop(); setPhase("list"); setOpenId(null); };
  const finishReading = () => { stop(); setPhase("done"); };

  // Lock body scroll + Escape to leave, while a story is open.
  useEffect(() => {
    if (phase === "list") return;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && backToList();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [phase]);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const overlayTransition = prefersReduced ? "none" : "transform 0.34s cubic-bezier(0.22,1,0.36,1)";

  return (
    <div style={{ background: palette.paper, minHeight: "100vh", fontFamily: fonts.ui }}>
      {/* ── Home: the list of today's stories ─────────────────────────── */}
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "30px 24px 48px" }}>
        {/* [TODO:ORIENTATION] make this masthead a button that always returns Home. */}
        <div
          style={{
            fontFamily: fonts.ui, fontSize: 12, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase", color: palette.green,
          }}
        >
          The Reading Room
        </div>
        <h1 style={{ fontFamily: fonts.head, fontSize: 30, fontWeight: 700, color: palette.ink, lineHeight: 1.15, margin: "12px 0 0" }}>
          {greetingFor(now)}.
        </h1>
        <div style={{ fontSize: 18, color: palette.inkSoft, marginTop: 8 }}>{longDate(now)}</div>

        <p
          style={{
            fontSize: 17, color: palette.inkBody, lineHeight: 1.5,
            background: palette.greenSoft, borderRadius: 14, padding: "16px 18px", margin: "16px 0 0",
          }}
        >
          Tap a story to read it. There is no wrong choice — take your time.
        </p>

        {stories.length === 0 ? (
          <p style={{ color: palette.inkSoft, fontSize: 18, marginTop: 24 }}>
            No stories right now. Check back in a little while.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 22 }}>
            {stories.map((s) => {
              const color = colorFor(s.category);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => openStory(s)}
                  aria-label={`Read: ${s.headline}`}
                  style={{
                    display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                    background: palette.paperCard, border: `1px solid ${palette.rule}`,
                    borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 8px rgba(35,48,43,0.06)",
                    padding: 0,
                  }}
                >
                  <StoryPhoto src={s.image} category={s.category} color={color} height={150} />
                  <div style={{ padding: "18px 20px 22px" }}>
                    <CategoryChip category={s.category} color={color} />
                    <div style={{ fontFamily: fonts.head, fontSize: 24, fontWeight: 600, color: palette.ink, lineHeight: 1.28, marginTop: 14 }}>
                      {s.headline}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* End card — a finite, reassuring stop. */}
            <div
              style={{
                textAlign: "center", padding: "28px 20px", marginTop: 4,
                border: `1px dashed ${palette.rule}`, borderRadius: 20, color: palette.inkSoft,
              }}
            >
              <div style={{ fontFamily: fonts.head, fontSize: 20, fontWeight: 600, color: palette.ink }}>
                That’s all for now.
              </div>
              <div style={{ fontSize: 16, marginTop: 8, lineHeight: 1.5 }}>
                New stories arrive every few hours. Come back whenever you like.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Reading overlay (slides up over the list) ─────────────────── */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 50, background: palette.paper,
          display: "flex", flexDirection: "column",
          transform: phase !== "list" ? "translateY(0)" : "translateY(100%)",
          transition: overlayTransition,
          boxShadow: phase !== "list" ? "0 -8px 30px rgba(35,48,43,0.18)" : "none",
        }}
        aria-hidden={phase === "list"}
      >
        {/* Reading */}
        {story && phase === "reading" && (
          <>
            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto" }}>
              <div style={{ maxWidth: 620, margin: "0 auto", padding: "26px 24px 32px" }}>
                <CategoryChip category={story.category} color={colorFor(story.category)} />
                <h2 style={{ fontFamily: fonts.head, fontSize: 30, fontWeight: 700, color: palette.ink, lineHeight: 1.22, margin: "16px 0 0" }}>
                  {story.headline}
                </h2>

                <div style={{ marginTop: 20 }}>
                  <StoryPhoto
                    src={articleImage}
                    category={story.category}
                    color={colorFor(story.category)}
                    height={200}
                    rounded
                  />
                </div>

                <div style={{ marginTop: 20 }}>
                  <ListenButton
                    active={speakingId === story.id}
                    onClick={() =>
                      speak(story.id, story.headline + ". " + ((paragraphs || []).join(" ")))
                    }
                  />
                </div>

                {loading && (
                  <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 14 }} aria-hidden="true">
                    {[100, 94, 97, 62].map((w, i) => (
                      <div key={i} style={{ height: 16, width: `${w}%`, borderRadius: 6, background: palette.rule, opacity: 0.7 }} />
                    ))}
                  </div>
                )}

                {!loading && error && (
                  <p style={{ marginTop: 24, fontSize: 21, color: palette.inkBody, lineHeight: 1.6 }}>
                    This story didn’t load. Head back and try again in a little while.
                  </p>
                )}

                {!loading && !error && paragraphs && (
                  <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 22 }}>
                    {paragraphs.map((p, i) => (
                      <p key={i} style={{ margin: 0, fontFamily: fonts.head, fontSize: 21, color: palette.inkBody, lineHeight: 1.72 }}>
                        {p}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Persistent action bar — always reachable. */}
            <div
              style={{
                flex: "none", padding: "14px 18px calc(14px + env(safe-area-inset-bottom))",
                background: palette.paper, borderTop: `1px solid ${palette.rule}`,
                display: "flex", gap: 12,
              }}
            >
              <button
                type="button"
                onClick={backToList}
                style={{
                  flex: "none", fontFamily: fonts.ui, fontSize: 16, fontWeight: 600,
                  color: palette.inkSoft, background: "#E9E4D8", border: "none", cursor: "pointer",
                  padding: "16px 18px", borderRadius: 14,
                }}
              >
                ‹ Back
              </button>
              <button
                type="button"
                onClick={finishReading}
                style={{
                  flex: 1, fontFamily: fonts.head, fontSize: 18, fontWeight: 700,
                  color: "#fff", background: palette.green, border: "none", cursor: "pointer",
                  padding: 16, borderRadius: 14,
                }}
              >
                ✓ I’m finished
              </button>
            </div>
          </>
        )}

        {/* Confirmation — a warm, low-stakes "done". */}
        {phase === "done" && (
          <div
            style={{
              flex: 1, background: palette.green, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40,
            }}
          >
            <div
              style={{
                width: 76, height: 76, borderRadius: 999, background: "rgba(255,255,255,0.17)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, color: "#fff",
              }}
              aria-hidden="true"
            >
              ✓
            </div>
            <div style={{ fontFamily: fonts.head, fontSize: 30, fontWeight: 700, color: "#fff", marginTop: 26 }}>
              Nicely done.
            </div>
            <p style={{ fontSize: 19, color: palette.greenSoft, marginTop: 12, lineHeight: 1.5, maxWidth: 300 }}>
              You finished the story. Would you like to read another?
            </p>
            <button
              type="button"
              onClick={backToList}
              style={{
                marginTop: 32, fontFamily: fonts.head, fontSize: 19, fontWeight: 700,
                color: palette.ink, background: "#fff", border: "none", cursor: "pointer",
                padding: "18px 30px", borderRadius: 16,
              }}
            >
              Back to today’s stories
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
