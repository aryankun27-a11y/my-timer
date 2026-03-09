import { useState, useEffect, useRef, useCallback } from "react";

const BLOCKS = [
  { mins: 10, label: "10m", desc: "quick" },
  { mins: 25, label: "25m", desc: "pomodoro" },
  { mins: 45, label: "45m", desc: "deep" },
  { mins: 60, label: "60m", desc: "flow" },
];

function getToday() { return new Date().toDateString(); }

function loadData() {
  try {
    const raw = localStorage.getItem("timer_v2");
    if (!raw) return { sessions: [], dailyGoal: 4 };
    return JSON.parse(raw);
  } catch { return { sessions: [], dailyGoal: 4 }; }
}

function saveData(data) {
  try { localStorage.setItem("timer_v2", JSON.stringify(data)); } catch {}
}

function getTodaySessions(sessions) {
  return sessions.filter(s => s.date === getToday());
}

function playClick() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = ctx.sampleRate * 0.04;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = "bandpass"; filter.frequency.value = 1800;
    const gain = ctx.createGain(); gain.gain.setValueAtTime(0.4, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    noise.start(); noise.stop(ctx.currentTime + 0.04);
    setTimeout(() => ctx.close(), 200);
  } catch {}
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const delay = i * 0.18;
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + delay);
      g.gain.linearRampToValueAtTime(0.35, ctx.currentTime + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.9);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 1);
    });
    setTimeout(() => ctx.close(), 2000);
  } catch {}
}

// Hamburger icon
function MenuIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
      <rect y="0" width="18" height="1.5" rx="1" fill="#555" />
      <rect y="6" width="18" height="1.5" rx="1" fill="#555" />
      <rect y="12" width="18" height="1.5" rx="1" fill="#555" />
    </svg>
  );
}

// Side panel
function SidePanel({ open, onClose, dailyGoal, setDailyGoal, todaySessions, totalSessions }) {
  const [inputVal, setInputVal] = useState(String(dailyGoal));
  const doneSessions = todaySessions.length;
  const pct = Math.min(doneSessions / dailyGoal, 1);

  useEffect(() => { setInputVal(String(dailyGoal)); }, [dailyGoal]);

  const handleGoalChange = (val) => {
    setInputVal(val);
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= 20) setDailyGoal(n);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div onClick={onClose} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10,
          transition: "opacity 0.2s",
        }} />
      )}

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, left: 0, height: "100%",
        width: "260px",
        background: "#111",
        borderRight: "1px solid #1a1a1a",
        zIndex: 20,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease",
        display: "flex", flexDirection: "column",
        padding: "32px 24px",
        gap: "32px",
        fontFamily: "'DM Mono', monospace",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "10px", color: "#555", letterSpacing: "0.25em" }}>SETTINGS</span>
          <button onClick={onClose} style={{
            fontSize: "16px", color: "#333", lineHeight: 1,
            padding: "2px 6px",
            transition: "color 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.color = "#888"}
            onMouseLeave={e => e.currentTarget.style.color = "#333"}
          >×</button>
        </div>

        {/* Daily goal */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <span style={{ fontSize: "9px", color: "#333", letterSpacing: "0.2em" }}>DAILY GOAL</span>

          {/* Goal selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => handleGoalChange(String(Math.max(1, dailyGoal - 1)))}
              style={{ width: "28px", height: "28px", border: "1px solid #222", borderRadius: "2px", color: "#555", fontSize: "16px", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#d4d4d4"; e.currentTarget.style.borderColor = "#444"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#555"; e.currentTarget.style.borderColor = "#222"; }}
            >−</button>
            <span style={{ fontSize: "24px", fontWeight: 300, color: "#d4d4d4", minWidth: "32px", textAlign: "center", letterSpacing: "0.02em" }}>
              {dailyGoal}
            </span>
            <button
              onClick={() => handleGoalChange(String(Math.min(20, dailyGoal + 1)))}
              style={{ width: "28px", height: "28px", border: "1px solid #222", borderRadius: "2px", color: "#555", fontSize: "16px", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#d4d4d4"; e.currentTarget.style.borderColor = "#444"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#555"; e.currentTarget.style.borderColor = "#222"; }}
            >+</button>
            <span style={{ fontSize: "9px", color: "#2a2a2a", letterSpacing: "0.15em" }}>sessions</span>
          </div>

          {/* Today's progress */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "9px", color: "#2a2a2a", letterSpacing: "0.15em" }}>TODAY'S PROGRESS</span>
              <span style={{ fontSize: "9px", color: "#3a3a3a", letterSpacing: "0.1em" }}>{doneSessions}/{dailyGoal}</span>
            </div>
            {/* Dots */}
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
              {Array.from({ length: dailyGoal }).map((_, i) => (
                <div key={i} style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: i < doneSessions ? "#d4d4d4" : "#1e1e1e",
                  transition: "background 0.3s",
                }} />
              ))}
            </div>
            {/* Progress bar */}
            <div style={{ height: "2px", background: "#1a1a1a", borderRadius: "1px" }}>
              <div style={{
                height: "100%", borderRadius: "1px",
                width: `${pct * 100}%`,
                background: pct >= 1 ? "#5a9a5a" : "#d4d4d4",
                transition: "width 0.4s ease, background 0.3s",
              }} />
            </div>
            {pct >= 1 && (
              <span style={{ fontSize: "9px", color: "#5a9a5a", letterSpacing: "0.15em" }}>GOAL REACHED ✓</span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "#161616" }} />

        {/* Today's sessions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1, overflowY: "auto" }}>
          <span style={{ fontSize: "9px", color: "#333", letterSpacing: "0.2em" }}>TODAY'S SESSIONS</span>
          {todaySessions.length === 0 ? (
            <span style={{ fontSize: "10px", color: "#222", letterSpacing: "0.1em" }}>none yet</span>
          ) : (
            todaySessions.slice().reverse().map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #141414" }}>
                <span style={{ fontSize: "10px", color: "#444", letterSpacing: "0.05em" }}>{s.desc} · {s.duration}m</span>
                <span style={{ fontSize: "9px", color: "#262626" }}>{s.time}</span>
              </div>
            ))
          )}
        </div>

        {/* Total */}
        <div style={{ fontSize: "9px", color: "#222", letterSpacing: "0.15em" }}>
          {totalSessions} total session{totalSessions !== 1 ? "s" : ""} logged
        </div>
      </div>
    </>
  );
}

export default function Timer() {
  const [selected, setSelected] = useState(1);
  const [totalSecs, setTotalSecs] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [data, setData] = useState(() => loadData());

  const endTimeRef = useRef(null);
  const rafRef = useRef(null);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = remaining / totalSecs;
  const circumference = 2 * Math.PI * 72;
  const todaySessions = getTodaySessions(data.sessions);

  const stopTimer = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const setDailyGoal = (n) => {
    setData(prev => {
      const next = { ...prev, dailyGoal: n };
      saveData(next);
      return next;
    });
  };

  const logSession = useCallback((block) => {
    setData(prev => {
      const newSession = {
        desc: block.desc,
        duration: block.mins,
        date: getToday(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      const next = { ...prev, sessions: [...prev.sessions, newSession] };
      saveData(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (running) {
      endTimeRef.current = Date.now() + remaining * 1000;
      const tick = () => {
        const left = Math.round((endTimeRef.current - Date.now()) / 1000);
        if (left <= 0) {
          setRemaining(0); setRunning(false); setDone(true);
          playChime();
          logSession(BLOCKS[selected]);
          return;
        }
        setRemaining(left);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [running]);

  useEffect(() => {
    const handler = (e) => {
      if (menuOpen) return;
      if (e.code === "Space") { e.preventDefault(); toggle(); }
      if (e.code === "KeyR") reset();
      if (e.code === "KeyF") setFullscreen(f => !f);
      if (e.code === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [running, done, remaining, menuOpen]);

  const selectBlock = (i) => {
    if (running) return;
    stopTimer();
    const s = BLOCKS[i].mins * 60;
    setSelected(i); setTotalSecs(s); setRemaining(s);
    setRunning(false); setDone(false);
  };

  const reset = () => {
    stopTimer(); setRemaining(totalSecs);
    setRunning(false); setDone(false);
  };

  const toggle = () => {
    if (done) return;
    if (running) { stopTimer(); setRunning(false); }
    else { playClick(); setRunning(true); }
  };

  // Fullscreen
  if (fullscreen) {
    return (
      <div onClick={() => setFullscreen(false)} style={{
        position: "fixed", inset: 0, background: "#0a0a0a",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: "20px", cursor: "pointer", fontFamily: "'DM Mono', monospace",
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400&display=swap');`}</style>
        <div style={{
          fontSize: "clamp(72px, 20vw, 160px)", fontWeight: 300,
          color: done ? "#2a2a2a" : running ? "#e8e8e8" : "#555",
          letterSpacing: "0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums",
          transition: "color 0.4s",
        }}>
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </div>
        <div style={{ fontSize: "11px", letterSpacing: "0.35em", color: done ? "#2a2a2a" : running ? "#3a3a3a" : "#2a2a2a" }}>
          {done ? "DONE" : running ? "FOCUS" : "PAUSED"}
        </div>
        <div style={{ position: "absolute", bottom: "32px", fontSize: "9px", color: "#1e1e1e", letterSpacing: "0.2em" }}>
          CLICK TO EXIT · ESC
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#0f0f0f",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: "36px", fontFamily: "'DM Mono', monospace", color: "#d4d4d4",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { cursor: pointer; border: none; background: none; font-family: inherit; }
      `}</style>

      {/* Hamburger button */}
      <button
        onClick={() => setMenuOpen(true)}
        style={{
          position: "fixed", top: "20px", left: "20px",
          padding: "8px", zIndex: 5,
          opacity: 0.6, transition: "opacity 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = "1"}
        onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}
      >
        <MenuIcon />
      </button>

      {/* Side panel */}
      <SidePanel
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        dailyGoal={data.dailyGoal}
        setDailyGoal={setDailyGoal}
        todaySessions={todaySessions}
        totalSessions={data.sessions.length}
      />

      {/* Goal progress bar at top */}
      <div style={{ width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "9px", color: "#2a2a2a", letterSpacing: "0.2em" }}>TODAY</span>
          <span style={{ fontSize: "9px", color: "#2e2e2e", letterSpacing: "0.1em" }}>
            {todaySessions.length}/{data.dailyGoal}
          </span>
        </div>
        <div style={{ display: "flex", gap: "5px" }}>
          {Array.from({ length: data.dailyGoal }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: "2px", borderRadius: "1px",
              background: i < todaySessions.length ? "#d4d4d4" : "#1a1a1a",
              transition: "background 0.3s",
            }} />
          ))}
        </div>
      </div>

      {/* Ring */}
      <div onClick={toggle} style={{
        position: "relative", width: 180, height: 180,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: done ? "default" : "pointer",
      }}>
        <svg width="180" height="180" style={{ position: "absolute", transform: "rotate(-90deg)" }}>
          <circle cx="90" cy="90" r="72" fill="none" stroke="#1e1e1e" strokeWidth="3" />
          <circle cx="90" cy="90" r="72" fill="none"
            stroke={done ? "#333" : running ? "#d4d4d4" : "#3a3a3a"}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.5s linear, stroke 0.3s" }}
          />
        </svg>
        <div style={{ textAlign: "center", userSelect: "none" }}>
          <div style={{ fontSize: "36px", fontWeight: 300, letterSpacing: "0.04em", color: done ? "#444" : "#d4d4d4", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
          <div style={{ fontSize: "9px", color: "#333", letterSpacing: "0.2em", marginTop: "8px" }}>
            {done ? "DONE" : running ? "FOCUS" : "PAUSED"}
          </div>
        </div>
      </div>

      {/* Time blocks */}
      <div style={{ display: "flex", gap: "10px" }}>
        {BLOCKS.map((b, i) => {
          const active = selected === i;
          return (
            <button key={b.mins} onClick={() => selectBlock(i)} disabled={running}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                padding: "12px 16px", border: "1px solid",
                borderColor: active ? "#d4d4d4" : "#1e1e1e",
                borderRadius: "4px", background: active ? "#1a1a1a" : "transparent",
                color: active ? "#d4d4d4" : "#383838", transition: "all 0.15s",
                cursor: running ? "not-allowed" : "pointer",
                opacity: running && !active ? 0.25 : 1,
              }}
              onMouseEnter={e => { if (!running && !active) e.currentTarget.style.borderColor = "#2e2e2e"; }}
              onMouseLeave={e => { if (!running && !active) e.currentTarget.style.borderColor = "#1e1e1e"; }}
            >
              <span style={{ fontSize: "13px", fontWeight: 400, letterSpacing: "0.05em" }}>{b.label}</span>
              <span style={{ fontSize: "8px", letterSpacing: "0.15em", color: active ? "#555" : "#282828" }}>{b.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        {[
          { label: running ? "pause" : "start", action: toggle, disabled: done },
          { label: "reset", action: reset, disabled: false },
          { label: "focus", action: () => setFullscreen(true), disabled: false },
        ].map(({ label, action, disabled }) => (
          <button key={label} onClick={action} disabled={disabled}
            style={{
              fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase",
              color: disabled ? "#252525" : "#555", padding: "9px 20px",
              border: "1px solid", borderColor: disabled ? "#181818" : "#222",
              borderRadius: "2px", transition: "color 0.15s, border-color 0.15s",
              cursor: disabled ? "default" : "pointer",
            }}
            onMouseEnter={e => { if (!disabled) { e.currentTarget.style.color = "#d4d4d4"; e.currentTarget.style.borderColor = "#444"; } }}
            onMouseLeave={e => { if (!disabled) { e.currentTarget.style.color = "#555"; e.currentTarget.style.borderColor = "#222"; } }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Keyboard hints */}
      <div style={{ display: "flex", gap: "16px" }}>
        {[["spc", "play/pause"], ["r", "reset"], ["f", "focus"]].map(([k, v]) => (
          <span key={k} style={{ fontSize: "9px", color: "#1e1e1e", letterSpacing: "0.1em" }}>
            <span style={{ color: "#2a2a2a", marginRight: "4px" }}>{k}</span>{v}
          </span>
        ))}
      </div>
    </div>
  );
}
