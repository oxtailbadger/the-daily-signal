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
 *   [TODO:DATA-REFRESH]   resolved upstream — app/page.jsx is force-dynamic and
 *                         lib/feeds.js caches the feeds in memory for 4h.
 *
 * This component just renders the `stories` it is given (see the story shape
 * in lib/feeds.js) and fetches full article bodies from /api/article on tap.
 */

import { useEffect, useRef, useState } from "react";
import { colorFor } from "../lib/categories";
import { iconFor } from "../lib/sources";

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
};

// Shared button styling — spread into a button's inline style so each one
// only spells out what's distinctive (color, size, radius), not the native
// chrome reset. Keeps the many inline button styles below readable.
const resetButton = { background: "transparent", border: "none", cursor: "pointer" };

// The tappable story card on the home screen (verbose enough to name).
const storyCardStyle = {
  ...resetButton,
  display: "block",
  width: "100%",
  textAlign: "left",
  background: "var(--rr-paper-card)",
  border: "1px solid var(--rr-rule)",
  borderRadius: 20,
  overflow: "hidden",
  boxShadow: "0 2px 8px rgba(35,48,43,0.06)",
  padding: 0,
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
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: palette.chipText,
        background: color,
        padding: "6px 13px",
        borderRadius: 999,
      }}
    >
      {category}
    </span>
  );
}

/** Source attribution: the news site's icon + name (e.g. NPR, BBC). */
function SourceTag({ source }) {
  const icon = iconFor(source);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: fonts.ui,
        fontSize: 14,
        fontWeight: 600,
        color: palette.inkSoft,
      }}
    >
      {icon && (
        <img
          src={icon}
          alt=""
          width={20}
          height={20}
          style={{ borderRadius: 4, display: "block", flex: "none" }}
        />
      )}
      {source}
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

// state: "idle" | "pending" (queued while the article loads) | "speaking"
function ListenButton({ state, onClick }) {
  const label =
    state === "speaking" ? "Stop reading" :
    state === "pending" ? "Starting when ready…" :
    "Read this to me";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={state === "speaking"}
      style={{
        ...resetButton,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: fonts.ui,
        fontSize: 15,
        fontWeight: 600,
        color: palette.green,
        background: palette.greenSoft,
        padding: "11px 17px",
        borderRadius: 999,
        opacity: state === "pending" ? 0.75 : 1,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 12 }}>
        {state === "speaking" ? "■" : "▶"}
      </span>
      {label}
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
  const [largeText, setLargeTextState] = useState(false);
  const [pendingSpeak, setPendingSpeak] = useState(false); // asked to read before text was ready
  const { speakingId, speak, stop } = useReadAloud();
  const scrollRef = useRef(null);

  // Text-size preference survives app relaunches.
  useEffect(() => {
    try { setLargeTextState(localStorage.getItem("ds-large-text") === "1"); } catch {}
  }, []);
  const setLargeText = (v) => {
    setLargeTextState(v);
    try { localStorage.setItem("ds-large-text", v ? "1" : "0"); } catch {}
  };

  const story = stories.find((s) => s.id === openId) || null;
  const now = new Date();

  const openStory = async (s) => {
    stop();
    setPendingSpeak(false);
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

  const backToList = () => { stop(); setPendingSpeak(false); setPhase("list"); setOpenId(null); };
  const finishReading = () => { stop(); setPendingSpeak(false); setPhase("done"); };

  const articleSpeech = () =>
    story ? story.headline + ". " + ((paragraphs || []).join(" ")) : "";

  // Tap handler for "Read this to me": speak now if the article is ready,
  // otherwise remember the request and start as soon as it loads.
  const handleListen = () => {
    if (speakingId === story.id) return stop();       // currently reading → stop
    if (pendingSpeak) return setPendingSpeak(false);  // waiting → cancel
    if (loading || !paragraphs) return setPendingSpeak(true); // not ready → queue
    speak(story.id, articleSpeech());
  };

  // Once the article finishes loading, honor a queued read-aloud request.
  // If it failed to load, drop the request rather than read just the title.
  useEffect(() => {
    if (!pendingSpeak) return;
    if (error) { setPendingSpeak(false); return; }
    if (!loading && paragraphs && story) {
      speak(story.id, articleSpeech());
      setPendingSpeak(false);
    }
  }, [pendingSpeak, loading, paragraphs, error]); // eslint-disable-line react-hooks/exhaustive-deps

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
            ...resetButton,
            fontFamily: fonts.ui, fontSize: 14, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase", color: palette.green,
            padding: 0, display: "inline-flex", alignItems: "center", gap: 7,
          }}
        >
          {/* lattice-mast mark, matches the app icon */}
          <svg viewBox="88 40 336 400" width="17" height="20" aria-hidden="true">
            <g stroke="var(--rr-green)" strokeWidth="20" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 226 416 L 250 128 M 286 416 L 262 128" />
              <path d="M 233 348 L 281 310 M 231 310 L 279 348" />
              <path d="M 239 276 L 275 244 M 237 244 L 273 276" />
              <path d="M 244 212 L 270 186 M 242 186 L 268 212" />
              <path d="M 196 416 L 316 416" />
            </g>
            <circle cx="256" cy="112" r="18" fill="var(--rr-clay)" />
            <g stroke="var(--rr-clay)" strokeWidth="18" fill="none" strokeLinecap="round">
              <path d="M 196 92 A 64 64 0 0 1 196 132" transform="rotate(180 196 112)" />
              <path d="M 316 92 A 64 64 0 0 1 316 132" />
              <path d="M 158 72 A 108 108 0 0 1 158 152" transform="rotate(180 158 112)" />
              <path d="M 354 72 A 108 108 0 0 1 354 152" />
            </g>
          </svg>
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
                  style={storyCardStyle}
                >
                  <StoryPhoto src={s.image} category={s.category} color={color} height={150} />
                  <div style={{ padding: "18px 20px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px 12px" }}>
                      <CategoryChip category={s.category} color={color} />
                      <SourceTag source={s.source} />
                    </div>
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px 12px" }}>
                    <CategoryChip category={story.category} color={colorFor(story.category)} />
                    <SourceTag source={story.source} />
                  </div>
                  {/* Text-size toggle — bigger type on demand */}
                  <div style={{ display: "flex", gap: 6 }}>
                    {[
                      { big: false, label: "Aa", size: 15 },
                      { big: true, label: "Aa", size: 20 },
                    ].map((opt) => (
                      <button
                        key={String(opt.big)}
                        type="button"
                        onClick={() => setLargeText(opt.big)}
                        aria-pressed={largeText === opt.big}
                        aria-label={opt.big ? "Use larger text" : "Use regular text"}
                        style={{
                          fontFamily: fonts.ui, fontSize: opt.size, fontWeight: 700,
                          color: largeText === opt.big ? palette.green : palette.inkSoft,
                          background: largeText === opt.big ? palette.greenSoft : "transparent",
                          border: `1px solid ${largeText === opt.big ? palette.green : palette.rule}`,
                          cursor: "pointer", borderRadius: 12,
                          minWidth: 48, minHeight: 44, padding: "6px 12px",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <h2 style={{ fontFamily: fonts.head, fontSize: largeText ? 34 : 30, fontWeight: 700, color: palette.ink, lineHeight: 1.22, margin: "16px 0 0" }}>
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

                {!error && (
                  <div style={{ marginTop: 20 }}>
                    <ListenButton
                      state={
                        speakingId === story.id ? "speaking" : pendingSpeak ? "pending" : "idle"
                      }
                      onClick={handleListen}
                    />
                  </div>
                )}

                {loading && (
                  <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 14 }} aria-hidden="true">
                    {[100, 94, 97, 62].map((w, i) => (
                      <div key={i} style={{ height: 16, width: `${w}%`, borderRadius: 6, background: palette.rule, opacity: 0.7 }} />
                    ))}
                  </div>
                )}

                {!loading && error && (
                  <p style={{ marginTop: 24, fontSize: largeText ? 25 : 21, color: palette.inkBody, lineHeight: 1.6 }}>
                    This story didn’t load. Head back and try again in a little while.
                  </p>
                )}

                {!loading && !error && paragraphs && (
                  <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 22 }}>
                    {paragraphs.map((p, i) => (
                      <p key={i} style={{ margin: 0, fontFamily: fonts.head, fontSize: largeText ? 25 : 21, color: palette.inkBody, lineHeight: 1.72 }}>
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
                  ...resetButton,
                  flex: "none", fontFamily: fonts.ui, fontSize: 16, fontWeight: 600,
                  color: palette.inkSoft, background: palette.backBtn,
                  padding: "16px 18px", borderRadius: 14,
                }}
              >
                ‹ Back
              </button>
              <button
                type="button"
                onClick={finishReading}
                style={{
                  ...resetButton,
                  flex: 1, fontFamily: fonts.head, fontSize: 18, fontWeight: 700,
                  color: "#fff", background: palette.green,
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
                ...resetButton,
                marginTop: 32, fontFamily: fonts.head, fontSize: 19, fontWeight: 700,
                color: palette.ink, background: "#fff",
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
