import { useState, useEffect, useRef, useCallback } from "react";

export default function Timer() {
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const intervalRef = useRef(null);
  const barRef = useRef(null);

  const totalMinutes = Math.round(totalSeconds / 60);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            setDone(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const setTime = useCallback((mins) => {
    const clamped = Math.max(1, Math.min(120, mins));
    const secs = clamped * 60;
    clearInterval(intervalRef.current);
    setTotalSeconds(secs);
    setRemaining(secs);
    setRunning(false);
    setDone(false);
  }, []);

  const getMinutesFromX = useCallback((clientX) => {
    if (!barRef.current) return totalMinutes;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(1 + ratio * 119);
  }, [totalMinutes]);

  const onMouseDown = (e) => {
    if (running) return;
    setDragging(true);
    setTime(getMinutesFromX(e.clientX));
  };

  const onMouseMove = useCallback((e) => {
    if (dragging) setTime(getMinutesFromX(e.clientX));
  }, [dragging, getMinutesFromX, setTime]);

  const onMouseUp = useCallback(() => setDragging(false), []);

  const onTouchStart = (e) => {
    if (running) return;
    setDragging(true);
    setTime(getMinutesFromX(e.touches[0].clientX));
  };

  const onTouchMove = useCallback((e) => {
    if (dragging) setTime(getMinutesFromX(e.touches[0].clientX));
  }, [dragging, getMinutesFromX, setTime]);

  const onTouchEnd = useCallback(() => setDragging(false), []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchmove", onTouchMove);
      window.addEventListener("touchend", onTouchEnd);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [dragging, onMouseMove, onMouseUp, onTouchMove, onTouchEnd]);

  const onWheel = (e) => {
    if (running) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    setTime(totalMinutes + delta);
  };

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = totalSeconds > 0 ? remaining / totalSeconds : 1;
  const circumference = 2 * Math.PI * 90;
  const strokeDash = circumference * (1 - progress);
  const barProgress = (totalMinutes - 1) / 119;

  const toggle = () => { if (!done) setRunning(r => !r); };
  const reset = () => {
    clearInterval(intervalRef.current);
    setRemaining(totalSeconds);
    setRunning(false);
    setDone(false);
  };

  const ticks = [5, 15, 30, 45, 60, 90, 120];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0c0c0c",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Mono', 'Courier New', monospace",
      color: "#e8e8e8",
      gap: "44px",
      padding: "24px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { cursor: pointer; border: none; background: none; font-family: inherit; }
        .ring-track { transition: stroke-dashoffset 0.9s linear; }
        .pulse { animation: pulse 1.4s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .done-flash { animation: flash 0.6s ease-in-out 3; }
        @keyframes flash { 0%,100%{opacity:1} 50%{opacity:0} }
        .main-btn {
          font-size: 11px;
          letter-spacing: 0.25em;
          color: #888;
          padding: 10px 28px;
          border: 1px solid #2a2a2a;
          border-radius: 2px;
          transition: all 0.15s;
          text-transform: uppercase;
        }
        .main-btn:hover:not(:disabled) { color: #e8e8e8; border-color: #666; }
        .main-btn:disabled { opacity: 0.3; cursor: default; }
      `}</style>

      {/* Ring */}
      <div style={{ position: "relative", width: 220, height: 220 }}>
        <svg width="220" height="220" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="110" cy="110" r="90" fill="none" stroke="#1a1a1a" strokeWidth="2" />
          <circle
            cx="110" cy="110" r="90"
            fill="none"
            stroke={done ? "#555" : running ? "#e8e8e8" : "#444"}
            strokeWidth="1.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDash}
            strokeLinecap="round"
            className="ring-track"
          />
        </svg>
        <div
          onClick={toggle}
          style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            cursor: done ? "default" : "pointer",
            userSelect: "none",
          }}
        >
          <span
            className={done ? "done-flash" : running ? "pulse" : ""}
            style={{
              fontSize: "46px", fontWeight: 300,
              letterSpacing: "0.05em",
              color: done ? "#555" : "#e8e8e8",
              lineHeight: 1,
            }}
          >
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
          <span style={{ fontSize: "10px", color: "#444", letterSpacing: "0.2em", marginTop: "8px" }}>
            {done ? "DONE" : running ? "RUNNING" : "PAUSED"}
          </span>
        </div>
      </div>

      {/* Scrubber */}
      <div style={{ width: "100%", maxWidth: 340 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <span style={{ fontSize: "10px", color: "#333", letterSpacing: "0.2em" }}>DURATION</span>
          <span style={{ fontSize: "13px", color: running ? "#555" : "#e8e8e8", letterSpacing: "0.08em", transition: "color 0.2s" }}>
            {totalMinutes}<span style={{ fontSize: "10px", color: "#444", marginLeft: "4px" }}>min</span>
          </span>
        </div>

        <div
          ref={barRef}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onWheel={onWheel}
          style={{
            position: "relative",
            height: "28px",
            display: "flex",
            alignItems: "center",
            cursor: running ? "not-allowed" : dragging ? "grabbing" : "col-resize",
            userSelect: "none",
          }}
        >
          {/* Track */}
          <div style={{
            position: "absolute", left: 0, right: 0,
            height: "2px",
            background: "#1e1e1e",
            borderRadius: "2px",
          }} />

          {/* Fill */}
          <div style={{
            position: "absolute", left: 0,
            height: "2px",
            width: `${barProgress * 100}%`,
            background: running ? "#444" : "#e8e8e8",
            borderRadius: "2px",
            transition: dragging ? "none" : "width 0.08s, background 0.2s",
          }} />

          {/* Thumb */}
          <div style={{
            position: "absolute",
            left: `${barProgress * 100}%`,
            transform: "translateX(-50%)",
            width: "13px",
            height: "13px",
            borderRadius: "50%",
            background: running ? "#333" : "#e8e8e8",
            boxShadow: running ? "none" : dragging ? "0 0 0 3px #0c0c0c, 0 0 0 5px #e8e8e8" : "0 0 0 3px #0c0c0c, 0 0 0 4px #444",
            transition: "background 0.2s, box-shadow 0.15s",
            pointerEvents: "none",
          }} />
        </div>

        {/* Ticks */}
        <div style={{ position: "relative", height: "18px", marginTop: "2px" }}>
          {ticks.map(m => {
            const pos = ((m - 1) / 119) * 100;
            return (
              <div key={m} style={{ position: "absolute", left: `${pos}%`, transform: "translateX(-50%)", textAlign: "center" }}>
                <div style={{ width: "1px", height: "3px", background: "#272727", margin: "0 auto 3px" }} />
                <span style={{ fontSize: "9px", color: "#333", letterSpacing: "0.04em" }}>{m}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button className="main-btn" onClick={toggle} disabled={done}>
          {running ? "pause" : "start"}
        </button>
        <button className="main-btn" onClick={reset}>
          reset
        </button>
      </div>
    </div>
  );
}
