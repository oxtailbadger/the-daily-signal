"use client";

/**
 * ReadingRoom — "One at a Time" (Direction 1b)
 * Dementia-friendly reading room, from the Claude Design handoff.
 *
 * Handoff TODO status:
 *   [TODO:CATEGORY-MAP]   resolved — lib/categories.js is the single source of truth.
 *   [TODO:PALETTE-TOKENS] resolved — colors are CSS vars (--rr-*) in globals.css.
 *   [TODO:VOICE]          improved — picks the best local SpeechSynthesis voice;
 *                         premium TTS + sentence highlighting still future work.
 *   [TODO:ORIENTATION]    resolved — masthead is a Home button; bottom bar is a
 *                         fixed flex row outside the scroll area.
 *   [TODO:DATA-REFRESH]   resolved upstream — app/page.jsx revalidates every 4h.
 */

import { useEffect, useRef, useState } from "react";
import { colorFor } from "../lib/categories";

// Who the app greets on the home screen.
const READER_NAME = "Mike";

const palette = {
  paper: "var(--rr-paper)",
  paperCard: "var(--rr-paper-card)",
  ink: "var(--rr-ink)",
  inkSoft: "var(--rr-ink-soft)",
  inkBody: "var(--rr-ink-body)",
  rule: "var(--rr-rule)",
  green: "var(--rr-green)",
  greenSoft: "var(--rr-green-soft)",
  chipText: "var(--rr-chip-text)",
  backBtn: "var(--rr-back-btn)",
};

const fonts = {
  head: "'Spline Sans', system-ui, sans-serif",
  ui: "'Spline Sans', system-ui, sans-serif",
  mast: "'Newsreader', Georgia, serif",
};

/* ── Helpers ────────────────────────────────────────────────────────────── */
function greetingFor(date = new Date()) {
  const h = date.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function longDate(date = new Date()) {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/* [TODO:VOICE] Improved: prefer an enhanced/natural local English voice over
   the default robotic one. Keep the { speakingId, speak, stop } API — a future
   premium TTS swap replaces only this hook's internals. */
function pickVoice() {
  try {
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
    return (
      voices.find((v) => /premium|enhanced|natural|neural|siri/i.test(v.name)) ||
      voices.find((v) => v.name === "Samantha") ||
      voices.find((v) => v.default) ||
      voices[0] ||
      null
    );
  } catch {
    return null;
  }
}

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
      const voice = pickVoice();
      if (voice) u.voice = voice;
      u.rate = 0.92;
      u.onend = () => setSpeakingId(null);
      window.speechSynthesis.speak(u);
      setSpeakingId(id);
    } catch {}
  };
  // Voice lists load async in some browsers; warm them up.
  useEffect(() => {
    try { window.speechSynthesis.getVoices(); } catch {}
    return () => stop();
  }, []);
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
    return (
      <div
        style={{
          ...style,
          objectFit: undefined,
          background: `linear-gradient(135deg, color-mix(in srgb, ${color} 13%, transparent), color-mix(in srgb, ${color} 6%, transparent))`,
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
        {/* [TODO:ORIENTATION] masthead always returns Home. */}
        <button
          type="button"
          onClick={backToList}
          aria-label="Go to today's stories"
          style={{
            fontFamily: fonts.ui, fontSize: 12, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase", color: palette.green,
            background: "transparent", border: "none", cursor: "pointer", padding: 0,
          }}
        >
          The Daily Signal
        </button>
        <h1 style={{ fontFamily: fonts.head, fontSize: 30, fontWeight: 700, color: palette.ink, lineHeight: 1.15, margin: "12px 0 0" }}>
          {greetingFor(now)}, {READER_NAME}.
        </h1>
        <div style={{ fontSize: 18, color: palette.inkSoft, marginTop: 8 }}>{longDate(now)}</div>

        <p
          style={{
            fontSize: 17, color: palette.inkBody, lineHeight: 1.5,
            background: palette.greenSoft, borderRadius: 14, padding: "16px 18px", margin: "16px 0 0",
          }}
        >
          Tap a story to read it. Explore the news on your time.
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
                  color: palette.inkSoft, background: palette.backBtn, border: "none", cursor: "pointer",
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
