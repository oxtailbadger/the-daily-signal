import { useState } from "react";

/**
 * NOTES FOR CLAUDE CODE FOLLOW-UP
 * --------------------------------
 * 1. STORIES.body is placeholder text. Replace with a real fetch-and-extract
 *    call to a backend endpoint (e.g. /api/article?url=...) that runs the
 *    source HTML through a readability-style parser (@mozilla/readability)
 *    and returns clean article text. Fetch on demand when a headline is
 *    tapped — no need to store full article bodies.
 * 2. The "Aa" / "Aa" text-size toggle (see `largeText` state) is fully wired
 *    and functional in this mock — keep this pattern when the real content
 *    is dropped in.
 * 3. The loading skeleton (`<Skeleton />`) is real and functional; it's
 *    currently shown on a fixed timeout (see `openStory`). Swap that timeout
 *    for the actual fetch's pending state.
 * 4. STORIES is easy to extend — add more objects here for now, and once
 *    the real RSS cron job is in place, this array should be replaced by
 *    whatever the /api/headlines (or equivalent) endpoint returns.
 * 5. TODO: add a per-source empty/error state for when article extraction
 *    fails (some sites block readability parsing) — something calm like
 *    "This story didn't load. Try again." rather than a broken layout.
 */

const palette = {
  paper: "#ECEAE2",
  paperDeep: "#E2DFD3",
  ink: "#24312C",
  inkSoft: "#5B6560",
  rule: "#D3CDBC",
  accent: "#4F6D5D",
  accentSoft: "#DCE3DA",
};

const fonts = {
  display: "'Fraunces', serif",
  body: "'Source Serif 4', serif",
  ui: "'Public Sans', sans-serif",
};

const STORIES = [
  {
    id: 1,
    source: "NPR",
    time: "2h ago",
    headline: "City opens first new public garden in a decade",
    dek: "The four-acre site includes raised beds for a community growing program.",
    body: [
      "The city's parks department opened its newest public garden this week, the first addition to the park system in ten years.",
      "The four-acre site sits on what was previously an unused lot near the eastern edge of downtown. It includes raised beds set aside for a community growing program, along with shaded seating areas and a small pond.",
      "Officials said the garden was designed with input from nearby residents over the past two years, and that a second phase, adding a small greenhouse, is expected to begin next spring.",
    ],
  },
  {
    id: 2,
    source: "BBC",
    time: "4h ago",
    headline: "Study points to steady rise in evening walking groups",
    dek: "Researchers say the informal groups have grown in towns and cities alike.",
    body: [
      "A new study tracking community activity has found a steady increase in the number of informal evening walking groups over the past three years.",
      "Researchers say the groups, often organized informally among neighbors, have become common in both small towns and larger cities, typically meeting two or three times a week.",
      "The study's authors suggest the rise may be linked to renewed interest in low-cost, low-barrier ways to stay active and connected with neighbors.",
    ],
  },
  {
    id: 3,
    source: "The Guardian",
    time: "6h ago",
    headline: "Local bakery marks fifty years with the same recipe",
    dek: "The family-run shop says it has changed little since it opened.",
    body: [
      "A family-run bakery is marking fifty years in business this month, and says it has kept the same bread recipe since the day it opened.",
      "The current owner, who took over from his parents a decade ago, said customers often tell him the smell alone brings back childhood memories.",
      "To mark the anniversary, the bakery is offering a loaf at the original 1976 price for one day only.",
    ],
  },
  {
    id: 4,
    source: "PBS",
    time: "8h ago",
    headline: "Museum reopens after two years of restoration work",
    dek: "The renovated wing focuses on regional history exhibits.",
    body: [
      "The regional history museum reopened its main wing this week after a two-year restoration project.",
      "The renovated space includes new lighting designed to protect older photographs and documents, along with several exhibits that had been in storage for over a decade.",
      "Museum staff said early visitor turnout has exceeded their expectations for opening week.",
    ],
  },
];

function Chrome({ children, size }) {
  return (
    <span
      style={{
        fontFamily: fonts.ui,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: palette.inkSoft,
        fontSize: size || 12,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3 mt-8" aria-hidden="true">
      {[100, 92, 96, 60].map((w, i) => (
        <div
          key={i}
          style={{
            height: 14,
            width: `${w}%`,
            borderRadius: 6,
            background: palette.paperDeep,
            animation: "pulse 1.4s ease-in-out infinite",
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function ReadingRoom() {
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [largeText, setLargeText] = useState(false);

  const openStory = (id) => {
    setOpenId(id);
    setLoading(true);
    setTimeout(() => setLoading(false), 650);
  };

  const story = STORIES.find((s) => s.id === openId);

  return (
    <div
      style={{ background: palette.paper, minHeight: "100vh", fontFamily: fonts.body }}
      className="relative w-full overflow-hidden"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Source+Serif+4:wght@400;600&family=Public+Sans:wght@400;500;600&display=swap');
        @keyframes pulse { 0%, 100% { opacity: 0.5 } 50% { opacity: 1 } }
        button:focus-visible, a:focus-visible { outline: 2px solid ${palette.accent}; outline-offset: 3px; }
      `}</style>

      {/* Headline list */}
      <div className="max-w-xl mx-auto px-6 py-10 sm:py-14">
        <h1
          style={{ fontFamily: fonts.display, color: palette.ink, fontSize: 30, fontWeight: 600 }}
          className="mb-1"
        >
          Today's Stories
        </h1>
        <p style={{ color: palette.inkSoft, fontFamily: fonts.ui, fontSize: 14 }} className="mb-8">
          Updated every 4 hours
        </p>

        <div>
          {STORIES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => openStory(s.id)}
              className="w-full text-left py-6 block"
              style={{
                borderTop: i === 0 ? `1px solid ${palette.rule}` : "none",
                borderBottom: `1px solid ${palette.rule}`,
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <div className="mb-2">
                <Chrome>{s.source} · {s.time}</Chrome>
              </div>
              <div
                style={{
                  fontFamily: fonts.display,
                  color: palette.ink,
                  fontSize: 22,
                  fontWeight: 600,
                  lineHeight: 1.3,
                }}
                className="mb-2"
              >
                {s.headline}
              </div>
              <div style={{ color: palette.inkSoft, fontSize: 16, lineHeight: 1.5 }}>
                {s.dek}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Full-page reading overlay */}
      <div
        className="fixed inset-0"
        style={{
          background: palette.paper,
          transform: openId ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)",
          boxShadow: openId ? "0 -8px 30px rgba(36,49,44,0.18)" : "none",
          zIndex: 50,
          overflowY: "auto",
        }}
      >
        {story && (
          <div className="max-w-xl mx-auto px-6 py-8 sm:py-10">
            <div className="flex items-center justify-between mb-10">
              <button
                onClick={() => setOpenId(null)}
                style={{ fontFamily: fonts.ui, color: palette.accent, fontSize: 15, fontWeight: 600 }}
                className="flex items-center gap-1"
              >
                ← Back to headlines
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLargeText(false)}
                  style={{
                    fontFamily: fonts.ui,
                    fontSize: 13,
                    fontWeight: 600,
                    color: !largeText ? palette.ink : palette.inkSoft,
                    background: !largeText ? palette.accentSoft : "transparent",
                    padding: "6px 10px",
                    borderRadius: 8,
                  }}
                >
                  Aa
                </button>
                <button
                  onClick={() => setLargeText(true)}
                  style={{
                    fontFamily: fonts.ui,
                    fontSize: 17,
                    fontWeight: 600,
                    color: largeText ? palette.ink : palette.inkSoft,
                    background: largeText ? palette.accentSoft : "transparent",
                    padding: "6px 10px",
                    borderRadius: 8,
                  }}
                >
                  Aa
                </button>
              </div>
            </div>

            <Chrome size={13}>{story.source} · {story.time}</Chrome>

            <h2
              style={{
                fontFamily: fonts.display,
                color: palette.ink,
                fontSize: largeText ? 34 : 28,
                fontWeight: 600,
                lineHeight: 1.25,
              }}
              className="mt-3 mb-8"
            >
              {story.headline}
            </h2>

            {loading ? (
              <Skeleton />
            ) : (
              <div
                style={{
                  color: palette.ink,
                  fontSize: largeText ? 21 : 18,
                  lineHeight: 1.75,
                }}
                className="flex flex-col gap-5"
              >
                {story.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
