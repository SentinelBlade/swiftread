import { useState, useEffect, useRef, useCallback } from "react";

// ── Theme definitions ─────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    label: "Dark", icon: "◑",
    vars: {
      "--bg": "#0e0e0f", "--surface": "#161618", "--surface2": "#1e1e21",
      "--border": "rgba(255,255,255,0.07)", "--text": "#e8e6e1",
      "--text-dim": "#888880", "--accent": "#e85d3a", "--accent2": "#f0a050",
      "--accent-bg": "rgba(232,93,58,0.12)", "--progress": "#e85d3a",
    },
  },
  light: {
    label: "Light", icon: "○",
    vars: {
      "--bg": "#f5f4f0", "--surface": "#ffffff", "--surface2": "#eceae4",
      "--border": "rgba(0,0,0,0.09)", "--text": "#1a1a18",
      "--text-dim": "#7a7870", "--accent": "#c0392b", "--accent2": "#d35400",
      "--accent-bg": "rgba(192,57,43,0.08)", "--progress": "#c0392b",
    },
  },
  deutan: {
    label: "Deutan / Protan", icon: "◈",
    vars: {
      "--bg": "#0e0e0f", "--surface": "#161618", "--surface2": "#1e1e21",
      "--border": "rgba(255,255,255,0.07)", "--text": "#e8e6e1",
      "--text-dim": "#888880", "--accent": "#4a9eff", "--accent2": "#ffd166",
      "--accent-bg": "rgba(74,158,255,0.12)", "--progress": "#4a9eff",
    },
  },
  tritan: {
    label: "Tritan", icon: "◇",
    vars: {
      "--bg": "#0e0e0f", "--surface": "#161618", "--surface2": "#1e1e21",
      "--border": "rgba(255,255,255,0.07)", "--text": "#e8e6e1",
      "--text-dim": "#888880", "--accent": "#e040fb", "--accent2": "#ff6e40",
      "--accent-bg": "rgba(224,64,251,0.12)", "--progress": "#e040fb",
    },
  },
  mono: {
    label: "High contrast", icon: "◉",
    vars: {
      "--bg": "#000000", "--surface": "#111111", "--surface2": "#1a1a1a",
      "--border": "rgba(255,255,255,0.18)", "--text": "#ffffff",
      "--text-dim": "#aaaaaa", "--accent": "#ffffff", "--accent2": "#cccccc",
      "--accent-bg": "rgba(255,255,255,0.08)", "--progress": "#ffffff",
    },
  },
};

function getORPIndex(word) {
  const len = word.replace(/[^a-zA-Z]/g, "").length;
  if (len <= 1) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  return 3;
}

function getWordDelay(word, baseDelay) {
  const len = word.replace(/[^a-zA-Z]/g, "").length;
  const hasPunct = /[.,!?;:—]/.test(word);
  let m = 1;
  if (len > 10) m = 1.6;
  else if (len > 7) m = 1.3;
  else if (len > 4) m = 1.1;
  if (hasPunct) m *= 1.5;
  return Math.round(baseDelay * m);
}

function tokenise(text, chunkSize = 1) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (chunkSize === 1) return words.map(w => [w]);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize)
    chunks.push(words.slice(i, i + chunkSize));
  return chunks;
}

function ORPWord({ chunk, isMono }) {
  if (!chunk || chunk.length === 0) return null;
  if (chunk.length > 1)
    return <span style={{ letterSpacing: "0.04em" }}>{chunk.join(" ")}</span>;
  const word = chunk[0];
  const idx = getORPIndex(word);
  return (
    <span>
      <span style={{ color: "var(--text-dim)" }}>{word.slice(0, idx)}</span>
      <span style={{ color: "var(--accent)", fontWeight: 700, textDecoration: isMono ? "underline" : "none", textUnderlineOffset: "4px" }}>
        {word[idx] || ""}
      </span>
      <span style={{ color: "var(--text-dim)" }}>{word.slice(idx + 1)}</span>
    </span>
  );
}

const SAMPLE = `The ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming increasingly valuable in our economy. As a consequence, the few who cultivate this skill, and then make it the core of their working life, will thrive. The shallow work that increasingly dominates the time and attention of knowledge workers is not work that requires sustained concentration. It is work that, almost by definition, is easy to replicate. The deep work hypothesis states that the ability to focus without distraction on a cognitively demanding task is a skill of great value. Efforts to deepen your focus will struggle if you don't simultaneously wean yourself from a dependence on distraction. Much in the same way that athletes must take care of their bodies outside of training sessions, you'll struggle to achieve the deepest levels of concentration if you spend the rest of your time fleeing the slightest hint of boredom.`;

const WPM_PRESETS = [100, 200, 300, 400, 500, 600];

function detectSystemTheme() {
  if (typeof window === "undefined") return "dark";
  if (window.matchMedia("(forced-colors: active)").matches) return "mono";
  if (window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
}

export default function SpeedReader() {
  const [themeKey, setThemeKey]     = useState(detectSystemTheme);
  const [text, setText]             = useState(SAMPLE);
  const [inputText, setInputText]   = useState("");
  const [screen, setScreen]         = useState("reader"); // reader | import | stats
  const [wpm, setWpm]               = useState(300);
  const [chunkSize, setChunkSize]   = useState(1);
  const [chunks, setChunks]         = useState([]);
  const [index, setIndex]           = useState(0);
  const [playing, setPlaying]       = useState(false);
  const [finished, setFinished]     = useState(false);
  const [sessionWpm, setSessionWpm] = useState([]);
  const [startTime, setStartTime]   = useState(null);
  const [wordsRead, setWordsRead]   = useState(0);
  // touch state for swipe gestures
  const touchStartY = useRef(null);
  const touchStartX = useRef(null);

  const timerRef  = useRef(null);
  const indexRef  = useRef(0);
  const chunksRef = useRef([]);

  const theme   = THEMES[themeKey];
  const isMono  = themeKey === "mono";
  const isLight = themeKey === "light";

  // Apply CSS vars to document root so they cascade everywhere
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.vars["--bg"]);
  }, [themeKey]);

  useEffect(() => {
    const c = tokenise(text, chunkSize);
    setChunks(c); chunksRef.current = c;
    setIndex(0); indexRef.current = 0;
    setPlaying(false); setFinished(false);
    clearTimeout(timerRef.current);
  }, [text, chunkSize]);

  const tick = useCallback(() => {
    const cur = indexRef.current;
    const total = chunksRef.current.length;
    if (cur >= total - 1) { setPlaying(false); setFinished(true); setIndex(total - 1); return; }
    const next = cur + 1;
    indexRef.current = next; setIndex(next);
    setWordsRead(w => w + chunksRef.current[next].length);
    const chunk = chunksRef.current[next];
    const base = Math.round(60000 / wpm);
    const longest = chunk.reduce((a, b) =>
      b.replace(/[^a-zA-Z]/g, "").length > a.replace(/[^a-zA-Z]/g, "").length ? b : a, chunk[0]);
    timerRef.current = setTimeout(tick, getWordDelay(longest, base));
  }, [wpm]);

  useEffect(() => {
    if (playing) {
      if (!startTime) setStartTime(Date.now());
      timerRef.current = setTimeout(tick, Math.round(60000 / wpm));
    } else {
      clearTimeout(timerRef.current);
      if (startTime && wordsRead > 0) {
        const elapsed = (Date.now() - startTime) / 60000;
        const measured = Math.round(wordsRead / elapsed);
        if (measured > 0 && measured < 2000)
          setSessionWpm(prev => [...prev.slice(-9), measured]);
        setStartTime(null); setWordsRead(0);
      }
    }
    return () => clearTimeout(timerRef.current);
  }, [playing, tick, wpm]);

  const restart = () => {
    clearTimeout(timerRef.current);
    indexRef.current = 0; setIndex(0); setFinished(false); setPlaying(true);
  };

  const skip = (delta) => {
    const next = Math.max(0, Math.min(chunksRef.current.length - 1, indexRef.current + delta));
    clearTimeout(timerRef.current);
    indexRef.current = next; setIndex(next);
    if (playing) timerRef.current = setTimeout(tick, Math.round(60000 / wpm));
  };

  // ── Keyboard controls (desktop) ───────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
      if (e.code === "Space")      { e.preventDefault(); setPlaying(p => !p); }
      if (e.code === "ArrowRight") skip(10);
      if (e.code === "ArrowLeft")  skip(-10);
      if (e.code === "ArrowUp")    setWpm(w => Math.min(800, w + 25));
      if (e.code === "ArrowDown")  setWpm(w => Math.max(60, w - 25));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  // ── Touch / swipe gestures (mobile) ──────────────────────────────────────
  // Tap the word stage   → play / pause
  // Swipe up on stage    → speed +25 WPM
  // Swipe down on stage  → speed −25 WPM
  // Swipe left on stage  → skip forward 10
  // Swipe right on stage → skip back 10
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const THRESHOLD = 30;

    if (Math.abs(dy) < THRESHOLD && Math.abs(dx) < THRESHOLD) {
      // Tap — toggle play/pause
      if (finished) { restart(); return; }
      setPlaying(p => !p);
    } else if (Math.abs(dy) > Math.abs(dx)) {
      // Vertical swipe — adjust speed
      if (dy > THRESHOLD) setWpm(w => Math.min(800, w + 25)); // swipe up = faster
      else                setWpm(w => Math.max(60, w - 25));  // swipe down = slower
    } else {
      // Horizontal swipe — skip
      if (dx > THRESHOLD) skip(10);  // swipe left = forward
      else                skip(-10); // swipe right = back
    }
    touchStartY.current = null;
    touchStartX.current = null;
  };

  const handleImport = () => {
    const t = inputText.trim();
    if (t.length > 20) { setText(t); setInputText(""); setScreen("reader"); }
  };

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => { setText(ev.target.result); setScreen("reader"); };
    r.readAsText(file);
  };

  const progress  = chunks.length > 1 ? index / (chunks.length - 1) : 0;
  const curChunk  = chunks[index] || [];
  const avgWpm    = sessionWpm.length
    ? Math.round(sessionWpm.reduce((a, b) => a + b, 0) / sessionWpm.length) : wpm;

  // ── Shared button styles ──────────────────────────────────────────────────
  const btnBase = {
    background: "var(--surface2)", border: "1px solid var(--border)",
    color: "var(--text)", borderRadius: 8, padding: "10px 18px",
    fontFamily: "inherit", fontSize: 13, cursor: "pointer",
    letterSpacing: "0.04em", WebkitTapHighlightColor: "transparent",
    minHeight: 44, // 44px min touch target (Apple HIG)
  };
  const btnPrimary = { ...btnBase, background: "var(--accent)", borderColor: "var(--accent)", color: isLight ? "#fff" : "#000", fontWeight: 600 };
  const btnGhost   = { ...btnBase, background: "transparent", border: "none", color: "var(--text-dim)", padding: "10px 12px" };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", fontFamily: "'DM Mono','Fira Mono','Courier New',monospace", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
        .progress-track { height: 3px; background: var(--border); cursor: pointer; flex-shrink: 0; }
        .progress-fill  { height: 100%; background: var(--progress); border-radius: 2px; transition: width 0.1s linear; }
        .word-stage     { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; position: relative; touch-action: none; }
        .word-display   { font-size: clamp(36px, 10vw, 72px); font-weight: 300; line-height: 1; text-align: center; user-select: none; }
        .stat-box       { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; }
        .stat-box .lbl  { font-size: 10px; color: var(--text-dim); letter-spacing: 0.07em; text-transform: uppercase; margin-bottom: 4px; }
        .stat-box .val  { font-size: 20px; font-weight: 300; }
        .stat-box .val span { font-size: 11px; color: var(--text-dim); margin-left: 2px; }
        .finished-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.88); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
        textarea { width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-family: inherit; font-size: 14px; padding: 14px; resize: none; outline: none; line-height: 1.6; }
        textarea:focus { border-color: var(--accent); }
        input[type=file] { display: none; }
        .theme-btn { background: none; border: none; color: var(--text-dim); font-size: 16px; padding: 8px 10px; cursor: pointer; border-radius: 6px; min-height: 44px; min-width: 44px; }
        .theme-btn.active { color: var(--accent); }
        .nav-tab { background: none; border: none; color: var(--text-dim); font-family: inherit; font-size: 12px; padding: 8px 14px; border-radius: 8px; cursor: pointer; min-height: 44px; letter-spacing: 0.04em; }
        .nav-tab.active { background: var(--surface2); color: var(--text); }
        .swipe-hint { font-size: 10px; color: var(--text-dim); text-align: center; letter-spacing: 0.06em; padding: 6px 0 2px; opacity: 0.7; }
      `}</style>

      {/* ── Top nav ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--surface)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--accent)", letterSpacing: "0.1em" }}>◆ SWIFTREAD</span>
        <div style={{ display: "flex", gap: 2 }}>
          {["reader","import","stats"].map(s => (
            <button key={s} className={`nav-tab ${screen === s ? "active" : ""}`} onClick={() => setScreen(s)}>
              {s}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          {Object.entries(THEMES).map(([key, t]) => (
            <button key={key} className={`theme-btn ${themeKey === key ? "active" : ""}`} onClick={() => setThemeKey(key)} title={t.label} aria-label={t.label}>
              {t.icon}
            </button>
          ))}
        </div>
      </div>

      {/* ── Import screen ── */}
      {screen === "import" && (
        <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 12, color: "var(--text-dim)", letterSpacing: "0.06em" }}>PASTE TEXT</p>
          <textarea rows={8} placeholder="Paste any text here…" value={inputText} onChange={e => setInputText(e.target.value)} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={btnPrimary} onClick={handleImport}>Load text →</button>
            <label style={{ ...btnBase, cursor: "pointer", display: "flex", alignItems: "center" }}>
              Upload .txt
              <input type="file" accept=".txt,.md" onChange={handleFile} />
            </label>
            <button style={btnGhost} onClick={() => { setText(SAMPLE); setScreen("reader"); }}>
              Load sample
            </button>
          </div>
        </div>
      )}

      {/* ── Stats screen ── */}
      {screen === "stats" && (
        <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              ["Speed", wpm, "wpm"],
              ["Avg", sessionWpm.length ? avgWpm : "—", sessionWpm.length ? "wpm" : ""],
              ["Progress", Math.round(progress * 100), "%"],
            ].map(([lbl, val, unit]) => (
              <div key={lbl} className="stat-box">
                <div className="lbl">{lbl}</div>
                <div className="val">{val}<span>{unit}</span></div>
              </div>
            ))}
          </div>
          {sessionWpm.length > 0 && (
            <>
              <p style={{ fontSize: 12, color: "var(--text-dim)", letterSpacing: "0.06em" }}>SESSION HISTORY</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {sessionWpm.map((w, i) => (
                  <span key={i} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", fontSize: 13, color: w > avgWpm ? "var(--accent2)" : "var(--text-dim)" }}>
                    {w} wpm
                  </span>
                ))}
              </div>
            </>
          )}
          {sessionWpm.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 20, textAlign: "center" }}>
              No sessions yet — hit play to start reading.
            </p>
          )}
        </div>
      )}

      {/* ── Reader screen ── */}
      {screen === "reader" && (
        <>
          {/* progress bar */}
          <div className="progress-track" onClick={e => {
            const r = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - r.left) / r.width;
            const next = Math.round(pct * (chunks.length - 1));
            clearTimeout(timerRef.current);
            indexRef.current = next; setIndex(next);
          }}>
            <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>

          {/* word stage — tap to play/pause, swipe to control */}
          <div
            className="word-stage"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {finished ? (
              <div className="finished-overlay">
                <div style={{ fontSize: 40, color: "var(--accent)" }}>✓</div>
                <p style={{ fontSize: 18, color: "var(--text)" }}>Done!</p>
                <p style={{ fontSize: 13, color: "var(--text-dim)" }}>Avg: {avgWpm} WPM</p>
                <button style={btnPrimary} onClick={restart}>Read again</button>
              </div>
            ) : (
              <div className="word-display" style={{ opacity: playing || index > 0 ? 1 : 0.3 }}>
                {curChunk.length > 0
                  ? <ORPWord chunk={curChunk} isMono={isMono} />
                  : <span style={{ fontSize: 16, color: "var(--text-dim)" }}>Tap to start</span>
                }
              </div>
            )}
          </div>

          {/* swipe hint */}
          <p className="swipe-hint">TAP TO PLAY · SWIPE ↑↓ SPEED · SWIPE ←→ SKIP</p>

          {/* position info */}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.06em", paddingBottom: 4 }}>
            <span>{index + 1} / {chunks.length}</span>
            <span>·</span>
            <span>{Math.max(0, Math.ceil((chunks.length - index) * (60 / wpm)))}s left</span>
          </div>

          {/* bottom controls */}
          <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>

            {/* row 1: transport + WPM */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button style={btnGhost} onClick={() => skip(-10)} aria-label="Back 10">⟨⟨</button>
              <button style={{ ...btnPrimary, flex: 1 }} onClick={() => { if (finished) { restart(); return; } setPlaying(p => !p); }}>
                {playing ? "⏸ Pause" : finished ? "↺ Again" : "▶ Play"}
              </button>
              <button style={btnGhost} onClick={() => skip(10)} aria-label="Forward 10">⟩⟩</button>

              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 999, padding: "4px 8px 4px 12px", minHeight: 44 }}>
                <button onClick={() => setWpm(w => Math.max(60, w - 25))} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} aria-label="Slower">−</button>
                <span style={{ fontSize: 13, minWidth: 64, textAlign: "center" }}>{wpm} <span style={{ fontSize: 10, color: "var(--text-dim)" }}>WPM</span></span>
                <button onClick={() => setWpm(w => Math.min(800, w + 25))} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} aria-label="Faster">+</button>
              </div>
            </div>

            {/* row 2: WPM presets + chunk size */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap" }}>
                {WPM_PRESETS.map(p => (
                  <button key={p} onClick={() => setWpm(p)} style={{
                    ...btnBase, padding: "6px 10px", fontSize: 12, minHeight: 36,
                    background: wpm === p ? "var(--accent)" : undefined,
                    borderColor: wpm === p ? "var(--accent)" : undefined,
                    color: wpm === p ? (isLight ? "#fff" : "#000") : undefined,
                  }}>{p}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {[1, 2, 3].map(n => (
                  <button key={n} onClick={() => setChunkSize(n)} style={{
                    ...btnBase, padding: "6px 10px", fontSize: 12, minHeight: 36,
                    background: chunkSize === n ? "var(--accent-bg)" : undefined,
                    borderColor: chunkSize === n ? "var(--accent)" : undefined,
                    color: chunkSize === n ? "var(--accent)" : undefined,
                  }}>{n}w</button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
