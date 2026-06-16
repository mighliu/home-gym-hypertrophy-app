export default function RestTimer({
  timerSeconds,
  timerMax,
  timerExercise,
  timerActive,
  setTimerActive,
  setTimerSeconds,
  dismissTimer
}) {
  if (timerSeconds <= 0 && !timerActive) return null;

  const progress = timerMax > 0 ? (timerSeconds / timerMax) * 100 : 0;
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleTogglePlay = () => {
    setTimerActive(!timerActive);
  };

  const handleAdd30 = () => {
    setTimerSeconds((prev) => prev + 30);
  };

  const handleSub30 = () => {
    setTimerSeconds((prev) => Math.max(0, prev - 30));
  };

  return (
    <div className={`rest-timer-panel ${timerSeconds === 0 ? "timer-alert" : ""}`}>
      <div className="timer-header">
        <span className="timer-badge">REST TIMER</span>
        <span className="timer-exercise">{timerExercise || "Rest Period"}</span>
      </div>
      <div className="timer-body">
        <div className="timer-circle-container">
          <svg className="timer-svg" viewBox="0 0 36 36">
            <path
              className="timer-circle-bg"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="timer-circle-fill"
              strokeDasharray={`${progress}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="timer-text">{formatTime(timerSeconds)}</div>
        </div>
        
        <div className="timer-controls">
          <button className="timer-btn timer-btn-play" onClick={handleTogglePlay} title={timerActive ? "Pause" : "Start"}>
            {timerActive ? "⏸ Pause" : "▶ Resume"}
          </button>
          
          <div className="timer-adjust-row">
            <button className="timer-btn timer-btn-adjust" onClick={handleSub30} title="-30 Seconds" disabled={timerSeconds <= 0}>
              -30s
            </button>
            <button className="timer-btn timer-btn-adjust" onClick={handleAdd30} title="+30 Seconds">
              +30s
            </button>
          </div>
          
          <button className="timer-btn timer-btn-skip" onClick={dismissTimer} title="Skip Rest">
            Skip
          </button>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .rest-timer-panel {
          position: fixed;
          bottom: 4.8rem;
          right: 1rem;
          width: 280px;
          background: rgba(19, 24, 38, 0.95);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(0, 242, 254, 0.3);
          border-radius: 14px;
          padding: 1rem;
          z-index: 1000;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 242, 254, 0.2);
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          color: white;
        }
        @media (min-width: 768px) {
          .rest-timer-panel {
            bottom: 1.5rem;
            right: 1.5rem;
          }
        }
        @keyframes slideIn {
          from { transform: translateY(20px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .timer-alert {
          border-color: var(--color-secondary) !important;
          box-shadow: 0 0 25px rgba(57, 255, 20, 0.4) !important;
          animation: blink 1s infinite alternate;
        }
        @keyframes blink {
          0% { border-color: rgba(57, 255, 20, 0.2); }
          100% { border-color: rgba(57, 255, 20, 1); }
        }
        .timer-header {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          margin-bottom: 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 0.5rem;
        }
        .timer-badge {
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--color-primary);
          letter-spacing: 0.05em;
        }
        .timer-exercise {
          font-size: 0.85rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .timer-body {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .timer-circle-container {
          position: relative;
          width: 76px;
          height: 76px;
        }
        .timer-svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }
        .timer-circle-bg {
          fill: none;
          stroke: rgba(255, 255, 255, 0.05);
          stroke-width: 2.5;
        }
        .timer-circle-fill {
          fill: none;
          stroke: var(--color-primary);
          stroke-width: 2.5;
          stroke-linecap: round;
          transition: stroke-dasharray 0.25s linear;
        }
        .rest-timer-panel.timer-alert .timer-circle-fill {
          stroke: var(--color-secondary);
        }
        .timer-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 1.1rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .timer-controls {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          flex-grow: 1;
        }
        .timer-adjust-row {
          display: flex;
          gap: 0.4rem;
          width: 100%;
        }
        .timer-btn-adjust {
          flex: 1;
        }
        .timer-btn {
          font-family: var(--font-family);
          font-size: 0.8rem;
          font-weight: 600;
          padding: 0.35rem;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          text-transform: uppercase;
        }
        .timer-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--color-primary);
        }
        .timer-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .timer-btn-play {
          background: rgba(0, 242, 254, 0.12);
          border-color: rgba(0, 242, 254, 0.25);
          color: var(--color-primary);
          font-size: 0.8rem;
        }
        .timer-btn-play:hover {
          background: rgba(0, 242, 254, 0.25);
        }
      ` }} />
    </div>
  );
}
