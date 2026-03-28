import { useState, useEffect, useRef, useCallback } from "react";

const PRESETS = [
  { mins: 10, label: "10m", desc: "quick" },
  { mins: 25, label: "25m", desc: "pomodoro" },
  { mins: 45, label: "45m", desc: "deep" },
  { mins: 60, label: "60m", desc: "flow" },
];

function getToday() { return new Date().toDateString(); }

function loadData() {
  try {
    const raw = localStorage.getItem("timer_v3");
    if (!raw) return { sessions: [], dailyGoal: 4, theme: "dark" };
    return JSON.parse(raw);
  } catch { return { sessions: [], dailyGoal: 4, theme: "dark" }; }
}

function saveData(data) {
  try { localStorage.setItem("timer_v3", JSON.stringify(data)); } catch {}
}

function getTodaySessions(sessions) {
  return sessions.filter(s => s.date === getToday());
}

function getTheme(mode) {
  if (mode === "light") return {
    bg: "#f5f5f3", panelBg: "#efefed", panelBorder: "#e0e0de",
    text: "#1a1a1a", textMid: "#666", textDim: "#999", textFaint: "#bbb",
    ringTrack: "#e0e0e0", ringActive: "#1a1a1a", ringIdle: "#aaa",
    blockBorderActive: "#1a1a1a", blockBorderIdle: "#e0e0e0",
    blockBgActive: "#e8e8e6", blockColorActive: "#1a1a1a", blockColorIdle: "#bbb",
    btnColor: "#888", btnBorder: "#ddd", btnColorHover: "#1a1a1a", btnBorderHover: "#aaa",
    dotFilled: "#1a1a1a", dotEmpty: "#e0e0e0",
    progressFill: "#1a1a1a", progressGoal: "#5a9a5a", progressTrack: "#e0e0e0",
    divider: "#e8e8e8", sessionBorder: "#e8e8e8", backdropBg: "rgba(0,0,0,0.2)",
    menuIcon: "#999", toggleBg: "#1a1a1a", toggleKnob: "#f5f5f3",
    goalBarFilled: "#1a1a1a", goalBarEmpty: "#e0e0e0",
    notifGranted: "#5a9a5a", notifDenied: "#c0392b",
  };
  return {
    bg: "#0f0f0f", panelBg: "#111", panelBorder: "#2a2a2a",
    text: "#e8e8e8", textMid: "#888", textDim: "#666", textFaint: "#444",
    ringTrack: "#2a2a2a", ringActive: "#e8e8e8", ringIdle: "#555",
    blockBorderActive: "#e8e8e8", blockBorderIdle: "#2a2a2a",
    blockBgActive: "#1e1e1e", blockColorActive: "#e8e8e8", blockColorIdle: "#666",
    btnColor: "#777", btnBorder: "#2a2a2a", btnColorHover: "#e8e8e8", btnBorderHover: "#666",
    dotFilled: "#e8e8e8", dotEmpty: "#2a2a2a",
    progressFill: "#e8e8e8", progressGoal: "#5a9a5a", progressTrack: "#1e1e1e",
    divider: "#222", sessionBorder: "#1e1e1e", backdropBg: "rgba(0,0,0,0.5)",
    menuIcon: "#777", toggleBg: "#e8e8e8", toggleKnob: "#0f0f0f",
    goalBarFilled: "#e8e8e8", goalBarEmpty: "#2a2a2a",
    notifGranted: "#5a9a5a", notifDenied: "#c0392b",
  };
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

function sendNotification(label) {
  try {
    if (Notification.permission === "granted") {
      new Notification("Session complete ✓", {
        body: `Your ${label} session is done. Take a break.`,
        icon: "/favicon.ico",
        silent: true,
      });
    }
  } catch {}
}

function MenuIcon({ color }) {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
      <rect y="0" width="18" height="1.5" rx="1" fill={color} />
      <rect y="6" width="18" height="1.5" rx="1" fill={color} />
      <rect y="12" width="18" height="1.5" rx="1" fill={color} />
    </svg>
  );
}

function SidePanel({ open, onClose, dailyGoal, setDailyGoal, todaySessions, totalSessions, theme: themeMode, setTheme, t }) {
  const doneSessions = todaySessions.length;
  const pct = Math.min(doneSessions / dailyGoal, 1);
  const isLight = themeMode === "light";

  const [notifPerm, setNotifPerm] = useState(() => {
    try { return "Notification" in window ? Notification.permission : "unsupported"; }
    catch { return "unsupported"; }
  });
  const [notifInfo, setNotifInfo] = useState(false);

  const handleNotifToggle = async () => {
    if (!("Notification" in window)) return;
    if (notifPerm === "granted") {
      setNotifInfo(true);
      setTimeout(() => setNotifInfo(false), 3500);
      return;
    }
    if (notifPerm === "denied") {
      setNotifInfo(true);
      setTimeout(() => setNotifInfo(false), 3500);
      return;
    }
    const result = await Notification.requestPermission();
    setNotifPerm(result);
  };

  const notifLabel = notifPerm === "granted" ? "ON" : notifPerm === "denied" ? "BLOCKED" : "OFF";
  const notifColor = notifPerm === "granted" ? t.notifGranted : notifPerm === "denied" ? t.notifDenied : t.textDim;

  return (
    <>
      {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: t.backdropBg, zIndex: 10 }} />}
      <div style={{
        position: "fixed", top: 0, left: 0, height: "100%", width: "260px",
        background: t.panelBg, borderRight: `1px solid ${t.panelBorder}`,
        zIndex: 20, transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease",
        display: "flex", flexDirection: "column", padding: "32px 24px", gap: "28px",
        fontFamily: "'DM Mono', monospace",
      }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "10px", color: t.textMid, letterSpacing: "0.25em" }}>SETTINGS</span>
          <button onClick={onClose} style={{ fontSize: "18px", color: t.textDim, lineHeight: 1, padding: "2px 6px", transition: "color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.color = t.text}
            onMouseLeave={e => e.currentTarget.style.color = t.textDim}
          >×</button>
        </div>

        {/* Theme toggle */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "9px", color: t.textDim, letterSpacing: "0.2em" }}>
            {isLight ? "LIGHT MODE" : "DARK MODE"}
          </span>
          <button
            onClick={() => setTheme(isLight ? "dark" : "light")}
            style={{ width: "40px", height: "22px", borderRadius: "11px", background: t.toggleBg, border: "none", position: "relative", cursor: "pointer", transition: "background 0.3s", flexShrink: 0 }}
          >
            <div style={{ position: "absolute", top: "3px", left: isLight ? "21px" : "3px", width: "16px", height: "16px", borderRadius: "50%", background: t.toggleKnob, transition: "left 0.25s ease" }} />
          </button>
        </div>

        {/* Notification permission */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "9px", color: t.textDim, letterSpacing: "0.2em" }}>NOTIFICATIONS</span>
            <button
              onClick={handleNotifToggle}
              style={{
                fontSize: "9px", letterSpacing: "0.15em", color: notifColor,
                border: `1px solid ${notifColor}`, borderRadius: "2px",
                padding: "4px 10px", background: "none", cursor: "pointer",
                transition: "all 0.2s", fontFamily: "'DM Mono', monospace",
              }}
            >{notifLabel}</button>
          </div>
          {notifInfo && (
            <span style={{ fontSize: "8px", color: t.textMid, letterSpacing: "0.1em", lineHeight: 1.5 }}>
              {notifPerm === "denied"
                ? "blocked — reset in browser site settings"
                : "to turn off, go to browser site settings"}
            </span>
          )}
        </div>

        <div style={{ height: "1px", background: t.divider }} />

        {/* Daily goal */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <span style={{ fontSize: "9px", color: t.textDim, letterSpacing: "0.2em" }}>DAILY GOAL</span>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => setDailyGoal(Math.max(1, dailyGoal - 1))}
              style={{ width: "28px", height: "28px", border: `1px solid ${t.btnBorder}`, borderRadius: "2px", color: t.btnColor, fontSize: "16px", transition: "all 0.15s", background: "none" }}
              onMouseEnter={e => { e.currentTarget.style.color = t.text; e.currentTarget.style.borderColor = t.btnBorderHover; }}
              onMouseLeave={e => { e.currentTarget.style.color = t.btnColor; e.currentTarget.style.borderColor = t.btnBorder; }}
            >−</button>
            <span style={{ fontSize: "24px", fontWeight: 300, color: t.text, minWidth: "32px", textAlign: "center" }}>{dailyGoal}</span>
            <button onClick={() => setDailyGoal(Math.min(20, dailyGoal + 1))}
              style={{ width: "28px", height: "28px", border: `1px solid ${t.btnBorder}`, borderRadius: "2px", color: t.btnColor, fontSize: "16px", transition: "all 0.15s", background: "none" }}
              onMouseEnter={e => { e.currentTarget.style.color = t.text; e.currentTarget.style.borderColor = t.btnBorderHover; }}
              onMouseLeave={e => { e.currentTarget.style.color = t.btnColor; e.currentTarget.style.borderColor = t.btnBorder; }}
            >+</button>
            <span style={{ fontSize: "9px", color: t.textFaint, letterSpacing: "0.15em" }}>sessions</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "9px", color: t.textFaint, letterSpacing: "0.15em" }}>TODAY</span>
              <span style={{ fontSize: "9px", color: t.textDim, letterSpacing: "0.1em" }}>{doneSessions}/{dailyGoal}</span>
            </div>
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
              {Array.from({ length: dailyGoal }).map((_, i) => (
                <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: i < doneSessions ? t.dotFilled : t.dotEmpty, transition: "background 0.3s" }} />
              ))}
            </div>
            <div style={{ height: "2px", background: t.progressTrack, borderRadius: "1px" }}>
              <div style={{ height: "100%", borderRadius: "1px", width: `${pct * 100}%`, background: pct >= 1 ? t.progressGoal : t.progressFill, transition: "width 0.4s ease" }} />
            </div>
            {pct >= 1 && <span style={{ fontSize: "9px", color: t.progressGoal, letterSpacing: "0.15em" }}>GOAL REACHED ✓</span>}
          </div>
        </div>

        <div style={{ height: "1px", background: t.divider }} />

        {/* Session log */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" }}>
          <span style={{ fontSize: "9px", color: t.textDim, letterSpacing: "0.2em" }}>TODAY'S SESSIONS</span>
          {todaySessions.length === 0
            ? <span style={{ fontSize: "10px", color: t.textFaint, letterSpacing: "0.1em" }}>none yet</span>
            : todaySessions.slice().reverse().map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${t.sessionBorder}` }}>
                <span style={{ fontSize: "10px", color: t.textMid, letterSpacing: "0.05em" }}>{s.desc} · {s.duration}m</span>
                <span style={{ fontSize: "9px", color: t.textFaint }}>{s.time}</span>
              </div>
            ))
          }
        </div>

        <div style={{ fontSize: "9px", color: t.textFaint, letterSpacing: "0.15em" }}>
          {totalSessions} total session{totalSessions !== 1 ? "s" : ""} logged
        </div>
      </div>
    </>
  );
}

// Custom time block — click to type any number of minutes
function CustomBlock({ active, running, t, onSelect }) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [customMins, setCustomMins] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const num = parseInt(inputVal, 10);
    if (!num || num <= 0) return;
    const clamped = Math.min(num, 999);
    setCustomMins(clamped);
    onSelect(clamped);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditing(false);
    e.stopPropagation();
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (running) return;
    setInputVal(customMins ? String(customMins) : "");
    setEditing(true);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
        padding: "12px 16px", border: "1px solid",
        borderColor: active ? t.blockBorderActive : t.blockBorderIdle,
        borderRadius: "4px", background: active ? t.blockBgActive : "transparent",
        color: active ? t.blockColorActive : t.blockColorIdle,
        transition: "all 0.15s", cursor: running ? "not-allowed" : "pointer",
        opacity: running && !active ? 0.25 : 1,
        minWidth: "56px",
      }}
      onMouseEnter={e => { if (!running && !active) e.currentTarget.style.borderColor = t.textDim; }}
      onMouseLeave={e => { if (!running && !active) e.currentTarget.style.borderColor = t.blockBorderIdle; }}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={inputVal}
          onChange={e => setInputVal(e.target.value.replace(/\D/g, ""))}
          onBlur={commit}
          onKeyDown={handleKey}
          onClick={e => e.stopPropagation()}
          placeholder="min"
          style={{
            width: "40px", fontSize: "13px", fontWeight: 400, letterSpacing: "0.05em",
            background: "transparent", border: "none",
            borderBottom: `1px solid ${t.blockBorderActive}`,
            outline: "none", color: active ? t.blockColorActive : t.text,
            textAlign: "center", fontFamily: "'DM Mono', monospace", padding: "0",
          }}
        />
      ) : (
        <span style={{ fontSize: "13px", fontWeight: 400, letterSpacing: "0.05em" }}>
          {customMins ? `${customMins}m` : "···"}
        </span>
      )}
      <span style={{ fontSize: "8px", letterSpacing: "0.15em", color: active ? t.textMid : t.textFaint }}>custom</span>
    </div>
  );
}

export default function Timer() {
  const [selected, setSelected] = useState(1); // 0-3 presets, 4 = custom
  const [totalSecs, setTotalSecs] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [data, setData] = useState(() => loadData());
  const [sessionLabel, setSessionLabel] = useState("pomodoro");

  const endTimeRef = useRef(null);
  const rafRef = useRef(null);
  const wakeLockRef = useRef(null);
  const t = getTheme(data.theme);

  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {}
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  // Re-acquire wake lock when tab becomes visible again (browser drops it on tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && running) {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [running, requestWakeLock]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = remaining / totalSecs;
  const circumference = 2 * Math.PI * 72;
  const todaySessions = getTodaySessions(data.sessions);

  const stopTimer = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const updateData = (changes) => {
    setData(prev => { const next = { ...prev, ...changes }; saveData(next); return next; });
  };

  const setDailyGoal = (n) => updateData({ dailyGoal: n });
  const setTheme = (theme) => updateData({ theme });

  const logSession = useCallback((label, duration) => {
    setData(prev => {
      const next = { ...prev, sessions: [...prev.sessions, { desc: label, duration, date: getToday(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }] };
      saveData(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (running) {
      requestWakeLock();
      endTimeRef.current = Date.now() + remaining * 1000;
      const currentLabel = sessionLabel;
      const currentMins = Math.round(totalSecs / 60);
      const tick = () => {
        const left = Math.round((endTimeRef.current - Date.now()) / 1000);
        if (left <= 0) {
          setRemaining(0); setRunning(false); setDone(true);
          releaseWakeLock();
          playChime();
          sendNotification(currentLabel);
          logSession(currentLabel, currentMins);
          return;
        }
        setRemaining(left);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      releaseWakeLock();
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

  const selectPreset = (i) => {
    if (running) return;
    stopTimer();
    const s = PRESETS[i].mins * 60;
    setSelected(i); setTotalSecs(s); setRemaining(s);
    setSessionLabel(PRESETS[i].desc);
    setRunning(false); setDone(false);
  };

  const selectCustom = (customMins) => {
    if (running) return;
    stopTimer();
    const s = customMins * 60;
    setSelected(4); setTotalSecs(s); setRemaining(s);
    setSessionLabel(`${customMins}m`);
    setRunning(false); setDone(false);
  };

  const reset = () => { stopTimer(); setRemaining(totalSecs); setRunning(false); setDone(false); };

  const toggle = () => {
    if (done) return;
    if (running) { stopTimer(); setRunning(false); }
    else { playClick(); setRunning(true); }
  };

  if (fullscreen) {
    return (
      <div onClick={() => setFullscreen(false)} style={{
        position: "fixed", inset: 0, background: t.bg,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: "20px", cursor: "pointer", fontFamily: "'DM Mono', monospace", transition: "background 0.3s",
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400&display=swap');`}</style>
        <div style={{ fontSize: "clamp(72px, 20vw, 160px)", fontWeight: 300, color: done ? t.textFaint : running ? t.text : t.textMid, letterSpacing: "0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums", transition: "color 0.4s" }}>
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </div>
        <div style={{ fontSize: "11px", letterSpacing: "0.35em", color: done ? t.textFaint : running ? t.textDim : t.textFaint }}>
          {done ? "DONE" : running ? "FOCUS" : "PAUSED"}
        </div>
        <div style={{ position: "absolute", bottom: "32px", fontSize: "9px", color: t.textFaint, letterSpacing: "0.2em" }}>CLICK TO EXIT · ESC</div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "36px", fontFamily: "'DM Mono', monospace", color: t.text, transition: "background 0.3s, color 0.3s" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } button { cursor: pointer; border: none; background: none; font-family: inherit; }`}</style>

      <button onClick={() => setMenuOpen(true)} style={{ position: "fixed", top: "20px", left: "20px", padding: "8px", zIndex: 5, opacity: 0.7, transition: "opacity 0.15s" }}
        onMouseEnter={e => e.currentTarget.style.opacity = "1"}
        onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
      >
        <MenuIcon color={t.menuIcon} />
      </button>

      <SidePanel
        open={menuOpen} onClose={() => setMenuOpen(false)}
        dailyGoal={data.dailyGoal} setDailyGoal={setDailyGoal}
        todaySessions={todaySessions} totalSessions={data.sessions.length}
        theme={data.theme} setTheme={setTheme} t={t}
      />

      {/* Goal bar */}
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "9px", color: t.textDim, letterSpacing: "0.2em" }}>TODAY</span>
          <span style={{ fontSize: "9px", color: t.textDim, letterSpacing: "0.1em" }}>{todaySessions.length}/{data.dailyGoal}</span>
        </div>
        <div style={{ display: "flex", gap: "5px" }}>
          {Array.from({ length: data.dailyGoal }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: "2px", borderRadius: "1px", background: i < todaySessions.length ? t.goalBarFilled : t.goalBarEmpty, transition: "background 0.3s" }} />
          ))}
        </div>
      </div>

      {/* Ring */}
      <div onClick={toggle} style={{ position: "relative", width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center", cursor: done ? "default" : "pointer" }}>
        <svg width="180" height="180" style={{ position: "absolute", transform: "rotate(-90deg)" }}>
          <circle cx="90" cy="90" r="72" fill="none" stroke={t.ringTrack} strokeWidth="3" />
          <circle cx="90" cy="90" r="72" fill="none"
            stroke={done ? t.textDim : running ? t.ringActive : t.ringIdle}
            strokeWidth="3" strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.5s linear, stroke 0.3s" }}
          />
        </svg>
        <div style={{ textAlign: "center", userSelect: "none", position: "relative", zIndex: 2, pointerEvents: "none" }}>
          <div style={{ fontSize: "36px", fontWeight: 300, letterSpacing: "0.04em", color: done ? t.textDim : t.text, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
          <div style={{ fontSize: "9px", color: t.textDim, letterSpacing: "0.2em", marginTop: "8px" }}>
            {done ? "DONE" : running ? "FOCUS" : "PAUSED"}
          </div>
        </div>
      </div>

      {/* Time blocks */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
        {PRESETS.map((b, i) => {
          const active = selected === i;
          return (
            <button key={b.mins} onClick={() => selectPreset(i)} disabled={running}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                padding: "12px 16px", border: "1px solid",
                borderColor: active ? t.blockBorderActive : t.blockBorderIdle,
                borderRadius: "4px", background: active ? t.blockBgActive : "transparent",
                color: active ? t.blockColorActive : t.blockColorIdle,
                transition: "all 0.15s", cursor: running ? "not-allowed" : "pointer",
                opacity: running && !active ? 0.25 : 1,
              }}
              onMouseEnter={e => { if (!running && !active) e.currentTarget.style.borderColor = t.textDim; }}
              onMouseLeave={e => { if (!running && !active) e.currentTarget.style.borderColor = t.blockBorderIdle; }}
            >
              <span style={{ fontSize: "13px", fontWeight: 400, letterSpacing: "0.05em" }}>{b.label}</span>
              <span style={{ fontSize: "8px", letterSpacing: "0.15em", color: active ? t.textMid : t.textFaint }}>{b.desc}</span>
            </button>
          );
        })}

        <CustomBlock active={selected === 4} running={running} t={t} onSelect={selectCustom} />
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
              color: disabled ? t.textFaint : t.btnColor, padding: "9px 20px",
              border: `1px solid ${disabled ? t.ringTrack : t.btnBorder}`,
              borderRadius: "2px", transition: "color 0.15s, border-color 0.15s",
              cursor: disabled ? "default" : "pointer",
            }}
            onMouseEnter={e => { if (!disabled) { e.currentTarget.style.color = t.text; e.currentTarget.style.borderColor = t.btnBorderHover; } }}
            onMouseLeave={e => { if (!disabled) { e.currentTarget.style.color = t.btnColor; e.currentTarget.style.borderColor = t.btnBorder; } }}
          >{label}</button>
        ))}
      </div>

      {/* Keyboard hints */}
      <div style={{ display: "flex", gap: "16px" }}>
        {[["spc", "play/pause"], ["r", "reset"], ["f", "focus"]].map(([k, v]) => (
          <span key={k} style={{ fontSize: "9px", color: t.textFaint, letterSpacing: "0.1em" }}>
            <span style={{ color: t.textDim, marginRight: "4px" }}>{k}</span>{v}
          </span>
        ))}
      </div>
    </div>
  );
}
