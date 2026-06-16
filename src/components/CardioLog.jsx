import { useState } from "react";

function getCardioSessionDetails(week, sessionNum) {
  if (sessionNum === 1) {
    return {
      type: "Zone 2 Walk",
      description: "Outdoor Walk / Incline Walk (Zone 2 steady-state)",
      targetDuration: 30,
      targetNotes: "Keep heart rate in Zone 2 (aerobic/conversational pace)."
    };
  } else if (sessionNum === 2) {
    const isOdd = week % 2 !== 0;
    if (isOdd) {
      const duration = Math.min(15, 10 + Math.floor((week - 1) / 2));
      const totalReps = duration * 15;
      return {
        type: "KB Swings EMOM",
        description: `Kettlebell Swings EMOM (15 reps/min × ${duration} min)`,
        targetDuration: duration,
        targetNotes: `Perform 15 swings at start of every minute. Total reps: ${totalReps}.`
      };
    } else {
      return {
        type: "Jump Rope",
        description: "Jump Rope Session (Steady pace or intervals)",
        targetDuration: 20,
        targetNotes: "Maintain continuous jumping or standard intervals. Focus on footwork and rhythm."
      };
    }
  } else if (sessionNum === 3) {
    let duration = 30;
    if (week >= 6 && week <= 10) duration = 35;
    else if (week >= 11) duration = 40;
    return {
      type: "Zone 2 Walk",
      description: "Outdoor Walk / Incline Walk (Zone 2 steady-state)",
      targetDuration: duration,
      targetNotes: `Keep heart rate in Zone 2. Duration progressed to ${duration} min.`
    };
  }
  return null;
}

export default function CardioLog({ cardioLogs, onSaveCardio, currentWeek, recoveryLogs = [] }) {
  // Accordion state: object mapping week number to boolean
  const [expandedWeeks, setExpandedWeeks] = useState(() => {
    const initial = {};
    for (let w = 1; w <= 15; w++) {
      initial[w] = w === currentWeek;
    }
    return initial;
  });

  const toggleWeek = (w) => {
    setExpandedWeeks((prev) => ({
      ...prev,
      [w]: !prev[w]
    }));
  };

  const handleInputChange = (week, sessionNum, field, value) => {
    const key = `w${week}_s${sessionNum}`;
    const currentData = cardioLogs[key] || {};
    onSaveCardio(key, {
      ...currentData,
      [field]: value
    });
  };

  const handleToggleComplete = (week, sessionNum, targetDuration) => {
    const key = `w${week}_s${sessionNum}`;
    const currentData = cardioLogs[key] || {};
    const newCompleted = !currentData.completed;

    // Auto-fill duration if checking complete and duration is empty
    const finalDuration = newCompleted && (currentData.duration === undefined || currentData.duration === "")
      ? targetDuration
      : (currentData.duration || "");

    onSaveCardio(key, {
      ...currentData,
      duration: finalDuration,
      completed: newCompleted
    });
  };

  const getLogValue = (week, sessionNum, field) => {
    const key = `w${week}_s${sessionNum}`;
    return cardioLogs[key]?.[field] ?? "";
  };

  const getIntensityLabel = (val) => {
    const labels = ["", "Very Light", "Light", "Moderate", "Hard", "Max Effort"];
    return labels[val] || "";
  };

  const getRecoveryLabel = (val) => {
    const labels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];
    return labels[val] || "";
  };

  // Calculate rolling 3-day average fatigue and soreness for autoregulated scaling
  const getRollingAverages = () => {
    const sorted = [...recoveryLogs].sort((a, b) => b.timestamp - a.timestamp);
    const last3 = sorted.slice(0, 3);
    if (last3.length === 0) return { fatigue: 0, soreness: 0 };
    
    const fatigueSum = last3.reduce((acc, log) => acc + log.fatigue, 0);
    const sorenessSum = last3.reduce((acc, log) => acc + log.soreness, 0);
    
    return {
      fatigue: fatigueSum / last3.length,
      soreness: sorenessSum / last3.length
    };
  };

  const rolling = getRollingAverages();
  const isOverreached = rolling.fatigue >= 3.8 || rolling.soreness >= 3.5;

  return (
    <div className="cardio-log-tab animated">
      <div className="card intro-card">
        <h2>Zone 2 & GPP Cardio Progression</h2>
        <p>
          Following your 15-week hypertrophy macrocycle, GPP (General Physical Preparedness) and aerobic capacity are maintained
          using Zone 2 cardiovascular walks and dynamic intervals. Complete 3 sessions per week alongside your lifting.
        </p>
      </div>

      {/* AUTOREGULATION ALERT BANNER */}
      {isOverreached && (
        <div className="autoreg-alert-banner">
          <span className="alert-icon">⚠️</span>
          <div className="alert-content">
            <strong>Cardio Autoregulation Active</strong>
            <p>
              Your rolling 3-day averages show high systemic strain (Fatigue: {rolling.fatigue.toFixed(1)}/5, Soreness: {rolling.soreness.toFixed(1)}/5). 
              Cardio workloads have been scaled back to prioritize muscular hypertrophy recovery.
            </p>
          </div>
        </div>
      )}

      <div className="weeks-accordion">
        {Array.from({ length: 15 }).map((_, idx) => {
          const w = idx + 1;
          const isExpanded = !!expandedWeeks[w];
          const isCurrent = w === currentWeek;

          // Calculate completed sessions in this week
          let completedCount = 0;
          for (let s = 1; s <= 3; s++) {
            if (cardioLogs[`w${w}_s${s}`]?.completed) completedCount++;
          }

          return (
            <div key={w} className={`accordion-week-card ${isExpanded ? "open" : ""} ${isCurrent ? "current-week-highlight" : ""}`}>
              {/* Accordion Header */}
              <button
                type="button"
                className="accordion-header"
                onClick={() => toggleWeek(w)}
              >
                <div className="accordion-title-side">
                  <span className="week-label">Week {w}</span>
                  {isCurrent && <span className="badge badge-purple">Active Week</span>}
                </div>
                <div className="accordion-status-side">
                  <span className={`completion-dot-status count-${completedCount}`}>
                    {completedCount} / 3 Completed
                  </span>
                  <span className="chevron-icon">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </button>

              {/* Accordion Content */}
              {isExpanded && (
                <div className="accordion-content">
                  <div className="sessions-list">
                    {[1, 2, 3].map((sNum) => {
                      const details = getCardioSessionDetails(w, sNum);
                      
                      // Apply dynamic autoregulation scaling
                      let targetDuration = details.targetDuration;
                      let targetNotes = details.targetNotes;
                      let isAutoregulated = false;

                      if (isOverreached) {
                        isAutoregulated = true;
                        if (details.type === "Zone 2 Walk") {
                          targetDuration = Math.max(15, details.targetDuration - 10);
                          targetNotes = `⚠️ scaled down by 10 mins (from ${details.targetDuration}m to ${targetDuration}m) due to high fatigue/soreness. Keep intensity low.`;
                        } else if (details.type === "KB Swings EMOM") {
                          targetDuration = Math.max(8, Math.round(details.targetDuration * 0.8));
                          const reps = targetDuration * 15;
                          targetNotes = `⚠️ scaled down by 20% to ${targetDuration}m (${reps} swings) to preserve recovery resources.`;
                        } else if (details.type === "Jump Rope") {
                          targetDuration = 16; // 20m * 0.8 = 16m
                          targetNotes = `⚠️ scaled down to 16m. Keep a relaxed pace.`;
                        }
                      }

                      const loggedDuration = getLogValue(w, sNum, "duration");
                      const loggedIntensity = getLogValue(w, sNum, "intensity");
                      const loggedRecovery = getLogValue(w, sNum, "recovery");
                      const loggedNotes = getLogValue(w, sNum, "notes");
                      const isDone = !!getLogValue(w, sNum, "completed");

                      return (
                        <div key={sNum} className={`cardio-session-row ${isDone ? "session-done" : ""} ${isAutoregulated ? "session-autoregulated" : ""}`}>
                          <div className="session-header-row">
                            <div className="session-left-meta">
                              <span className="session-index-badge">Session {sNum}</span>
                              <span className={`badge ${details.type === "Zone 2 Walk" ? "badge-teal" : "badge-purple"}`}>
                                {details.type}
                              </span>
                              {isAutoregulated && <span className="badge badge-warning">Autoregulated</span>}
                            </div>
                            <button
                              type="button"
                              className={`btn-check-cardio ${isDone ? "checked" : ""}`}
                              onClick={() => handleToggleComplete(w, sNum, targetDuration)}
                            >
                              {isDone ? "✓ Done" : "Mark Done"}
                            </button>
                          </div>

                          <div className="session-body-grid">
                            <div className="session-instructions">
                              <div className="inst-item">
                                <strong>Workload:</strong> {details.description}
                              </div>
                              <div className="inst-item">
                                <strong>Target:</strong> {targetDuration} minutes
                              </div>
                              <div className="inst-item notes-item">
                                {targetNotes}
                              </div>
                            </div>

                            <div className="session-logs-form">
                              <div className="form-group-horizontal">
                                <label className="log-field-label">Duration (min):</label>
                                <input
                                  type="number"
                                  className="form-input duration-log-input"
                                  value={loggedDuration}
                                  placeholder={targetDuration}
                                  disabled={isDone}
                                  onChange={(e) => handleInputChange(w, sNum, "duration", e.target.value)}
                                />
                              </div>

                              {/* Intensity Selector */}
                              <div className="form-group-horizontal flex-column">
                                <span className="log-field-label">
                                  Intensity: {loggedIntensity ? `${loggedIntensity}/5 (${getIntensityLabel(loggedIntensity)})` : "—"}
                                </span>
                                <div className="rating-pill-container">
                                  {[1, 2, 3, 4, 5].map((num) => (
                                    <button
                                      key={num}
                                      type="button"
                                      className={`rating-pill-btn ${loggedIntensity === num ? "active-intensity" : ""}`}
                                      disabled={isDone}
                                      onClick={() => handleInputChange(w, sNum, "intensity", num)}
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Recovery Selector */}
                              <div className="form-group-horizontal flex-column">
                                <span className="log-field-label">
                                  Recovery: {loggedRecovery ? `${loggedRecovery}/5 (${getRecoveryLabel(loggedRecovery)})` : "—"}
                                </span>
                                <div className="rating-pill-container">
                                  {[1, 2, 3, 4, 5].map((num) => (
                                    <button
                                      key={num}
                                      type="button"
                                      className={`rating-pill-btn ${loggedRecovery === num ? "active-recovery" : ""}`}
                                      disabled={isDone}
                                      onClick={() => handleInputChange(w, sNum, "recovery", num)}
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="form-group-horizontal">
                                <input
                                  type="text"
                                  className="form-input text-log-input"
                                  placeholder="Session notes (e.g. Heart rate, weather, feel)"
                                  value={loggedNotes}
                                  disabled={isDone}
                                  onChange={(e) => handleInputChange(w, sNum, "notes", e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .intro-card {
          margin-bottom: 1.5rem;
        }
        .weeks-accordion {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .accordion-week-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          overflow: hidden;
          transition: var(--transition);
        }
        .accordion-week-card:hover {
          border-color: rgba(0, 242, 254, 0.2);
        }
        .current-week-highlight {
          border-color: rgba(176, 38, 255, 0.4);
          box-shadow: 0 0 15px rgba(176, 38, 255, 0.1);
        }
        .accordion-header {
          width: 100%;
          background: none;
          border: none;
          color: var(--color-text-main);
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          font-family: var(--font-family);
          font-size: 1rem;
          font-weight: 600;
          text-align: left;
        }
        .accordion-title-side {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .week-label {
          font-size: 1.15rem;
          font-weight: 700;
        }
        .accordion-status-side {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .completion-dot-status {
          font-size: 0.85rem;
          padding: 0.2rem 0.6rem;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--color-text-muted);
        }
        .completion-dot-status.count-3 {
          background: rgba(57, 255, 20, 0.1);
          color: var(--color-secondary);
          border: 1px solid rgba(57, 255, 20, 0.2);
        }
        .completion-dot-status.count-1,
        .completion-dot-status.count-2 {
          background: rgba(255, 184, 0, 0.1);
          color: var(--color-warning);
          border: 1px solid rgba(255, 184, 0, 0.2);
        }
        .chevron-icon {
          font-size: 0.8rem;
          color: var(--color-text-muted);
        }
        .accordion-content {
          border-top: 1px solid var(--border-color);
          padding: 1.5rem;
          background: rgba(9, 12, 21, 0.3);
        }
        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .cardio-session-row {
          background: rgba(21, 28, 48, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 8px;
          padding: 1.25rem;
          transition: var(--transition);
        }
        .cardio-session-row:hover {
          border-color: rgba(255, 255, 255, 0.08);
        }
        .session-done {
          border-color: rgba(57, 255, 20, 0.15);
          background: rgba(57, 255, 20, 0.02);
          opacity: 0.8;
        }
        .session-autoregulated {
          border-left: 4px solid var(--color-warning);
        }
        .session-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .session-left-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .session-index-badge {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--color-text-main);
          text-transform: uppercase;
        }
        .btn-check-cardio {
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          color: var(--color-text-main);
          border-radius: 6px;
          padding: 0.35rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          font-family: var(--font-family);
          transition: var(--transition);
        }
        .btn-check-cardio:hover {
          border-color: var(--color-primary);
        }
        .btn-check-cardio.checked {
          background: var(--color-secondary);
          border-color: var(--color-secondary);
          color: var(--bg-dark);
        }
        .session-body-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
        }
        @media (min-width: 768px) {
          .session-body-grid {
            grid-template-columns: 1.2fr 1fr;
          }
        }
        .session-instructions {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          font-size: 0.9rem;
        }
        .inst-item strong {
          color: var(--color-primary);
        }
        .notes-item {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          background: rgba(0, 0, 0, 0.2);
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          border-left: 3px solid var(--color-accent);
          margin-top: 0.25rem;
          line-height: 1.4;
        }
        .session-logs-form {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .form-group-horizontal {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          font-size: 0.85rem;
        }
        .form-group-horizontal.flex-column {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.4rem;
        }
        .log-field-label {
          color: var(--color-text-muted);
          font-weight: 500;
        }
        .duration-log-input {
          width: 80px;
          text-align: center;
          height: 32px !important;
          padding: 0 0.5rem !important;
          font-size: 0.85rem !important;
        }
        .text-log-input {
          width: 100%;
          height: 32px !important;
          font-size: 0.8rem !important;
          text-align: left !important;
          padding: 0 0.75rem !important;
        }
        .rating-pill-container {
          display: flex;
          gap: 0.35rem;
          width: 100%;
        }
        .rating-pill-btn {
          flex: 1;
          height: 28px;
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          color: var(--color-text-muted);
          font-family: var(--font-family);
          font-weight: 600;
          font-size: 0.8rem;
          cursor: pointer;
          transition: var(--transition);
        }
        .rating-pill-btn:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
          background: color-mix(in srgb, var(--color-primary) 8%, transparent);
        }
        .active-intensity {
          background: var(--color-primary) !important;
          border-color: var(--color-primary) !important;
          color: var(--bg-dark) !important;
          font-weight: 700;
          box-shadow: var(--shadow-glow);
        }
        .active-recovery {
          background: var(--color-secondary) !important;
          border-color: var(--color-secondary) !important;
          color: var(--bg-dark) !important;
          font-weight: 700;
          box-shadow: var(--shadow-glow-green);
        }

        /* AUTOREGULATION BANNER STYLES */
        .autoreg-alert-banner {
          background: rgba(255, 184, 0, 0.08);
          border: 1px solid var(--color-warning);
          color: var(--color-text-main);
          border-radius: var(--border-radius);
          padding: 1rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          animation: pulse 2.5s infinite alternate;
        }
        .autoreg-alert-banner .alert-icon {
          font-size: 1.5rem;
        }
        .autoreg-alert-banner strong {
          color: var(--color-warning);
          display: block;
          margin-bottom: 0.2rem;
          font-size: 0.95rem;
        }
        .autoreg-alert-banner p {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin: 0;
          line-height: 1.4;
        }
      ` }} />
    </div>
  );
}
