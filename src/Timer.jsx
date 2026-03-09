import { useState, useEffect, useRef } from "react";

const BLOCKS = [
  { mins: 10, label: "10m", desc: "quick" },
  { mins: 25, label: "25m", desc: "pomodoro" },
  { mins: 45, label: "45m", desc: "deep" },
  { mins: 60, label: "60m", desc: "flow" },
];

export default function Timer() {
  const [selected, setSelected] = useState(1);
  const [totalSecs, setTotalSecs] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  // Use a ref to track the end time for accuracy
  const endTimeRef = useRef(null);
  const rafRef = useRef(null);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = remaining / totalSecs;
  const circumference = 2 * Math.PI * 72;

  // Accurate timer using requestAnimationFrame + end timestamp
  useEffect(() => {
    if (running) {
      endTimeRef.current = Date.now() + remaining * 1000;

      const tick = () => {
        const left = Math.round((endTimeRef.current - Date.now()) / 1000);
        if (left <= 0) {
          setRemaining(0);
          setRunning(false);
          setDone(true);
          return;
        }
        setRemaining(left);
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running]);

  useEffect(() => {
    const handler = (e) => {
      if (e.code === "Space") { e.preventDefault(); if (!done) setRunning(r => !r); }
      if (e.code === "KeyR") reset();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [done, totalSecs, remaining]);

  const selectBlock = (i) => {
    if (running) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const s = BLOCKS[i].mins * 60;
    setSelected(i);
    setTotalSecs(s);
    setRemaining(s);
    setRunning(false);
    setDone(false);
  };

  const reset = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setRemaining(totalSecs);
    setRunning(false);
    setDone(false);
  };

  const toggle = () => {
    if (done) return;
    if (running) {
      // Pause: cancel animation, keep remaining as-is
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setRunning(false);
    } else {
      setRunning(true);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#0f0f0f",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "48px",
      fontFamily: "'DM Mono', monospace",
      color: "#d4d4d4",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { cursor: pointer; border: none; background: none; font-family: inherit; }
      `}</style>

      {/* Ring */}
      <div
        onClick={toggle}
        style={{
          position: "relative", width: 180, height: 180,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: done ? "default" : "pointer",
        }}
      >
        <svg width="180" height="180" style={{ position: "absolute", transform: "rotate(-90deg)" }}>
          <circle cx="90" cy="90" r="72" fill="none" stroke="#1e1e1e" strokeWidth="3" />
          <circle
            cx="90" cy="90" r="72"
            fill="none"
            stroke={done ? "#333" : running ? "#d4d4d4" : "#3a3a3a"}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.5s linear, stroke 0.3s" }}
          />
        </svg>
        <div style={{ textAlign: "center", userSelect: "none" }}>
          <div style={{
            fontSize: "36px", fontWeight: 300,
            letterSpacing: "0.04em",
            color: done ? "#444" : "#d4d4d4",
            lineHeight: 1,
          }}>
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
          <div style={{ fontSize: "9px", color: "#333", letterSpacing: "0.2em", marginTop: "8px" }}>
            {done ? "DONE" : running ? "FOCUS" : "PAUSED"}
          </div>
        </div>
      </div>

      {/* Time blocks */}
      <div style={{ display: "flex", gap: "12px" }}>
        {BLOCKS.map((b, i) => {
          const active = selected === i;
          return (
            <button
              key={b.mins}
              onClick={() => selectBlock(i)}
              disabled={running}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                padding: "14px 20px",
                border: "1px solid",
                borderColor: active ? "#d4d4d4" : "#1e1e1e",
                borderRadius: "4px",
                background: active ? "#1a1a1a" : "transparent",
                color: active ? "#d4d4d4" : "#383838",
                transition: "all 0.15s",
                cursor: running ? "not-allowed" : "pointer",
                opacity: running && !active ? 0.25 : 1,
              }}
              onMouseEnter={e => { if (!running && !active) e.currentTarget.style.borderColor = "#2e2e2e"; }}
              onMouseLeave={e => { if (!running && !active) e.currentTarget.style.borderColor = "#1e1e1e"; }}
            >
              <span style={{ fontSize: "14px", fontWeight: 400, letterSpacing: "0.05em" }}>{b.label}</span>
              <span style={{ fontSize: "8px", letterSpacing: "0.15em", color: active ? "#555" : "#282828" }}>{b.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "10px" }}>
        {[
          { label: running ? "pause" : "start", action: toggle, disabled: done },
          { label: "reset", action: reset, disabled: false },
        ].map(({ label, action, disabled }) => (
          <button
            key={label}
            onClick={action}
            disabled={disabled}
            style={{
              fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase",
              color: disabled ? "#252525" : "#555",
              padding: "10px 28px",
              border: "1px solid",
              borderColor: disabled ? "#181818" : "#222",
              borderRadius: "2px",
              transition: "color 0.15s, border-color 0.15s",
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
      <div style={{ display: "flex", gap: "20px" }}>
        {[["spc", "play/pause"], ["r", "reset"]].map(([k, v]) => (
          <span key={k} style={{ fontSize: "9px", color: "#222", letterSpacing: "0.1em" }}>
            <span style={{ color: "#2e2e2e", marginRight: "5px" }}>{k}</span>{v}
          </span>
        ))}
      </div>
    </div>
  );
}
