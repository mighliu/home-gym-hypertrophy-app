import { useState } from "react";
import { isNativeMobile, syncSmartwatchData } from "../data/smartwatchSync";
import { calculateReadiness } from "../data/analytics";

export default function RecoveryLog({
  recoveryLogs,
  onAddLog
}) {
  const [sleep, setSleep] = useState(3);
  const [fatigue, setFatigue] = useState(3);
  const [soreness, setSoreness] = useState(1);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [rhr, setRhr] = useState("");
  const [hrv, setHrv] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  
  // Sleep stages state
  const [sleepStages, setSleepStages] = useState(null);
  const [sleepEfficiency, setSleepEfficiency] = useState(null);

  const handleWatchSync = async () => {
    setSyncing(true);
    setSyncError("");
    const result = await syncSmartwatchData();
    if (result.success) {
      if (result.sleepRating) setSleep(result.sleepRating);
      if (result.weight) setWeight(result.weight);
      if (result.rhr) setRhr(result.rhr);
      if (result.hrv) setHrv(result.hrv);
      if (result.sleepStages) setSleepStages(result.sleepStages);
      if (result.sleepEfficiency) setSleepEfficiency(result.sleepEfficiency);
      setSuccessMessage(result.message);
      setTimeout(() => setSuccessMessage(""), 3000);
    } else {
      setSyncError(result.message);
      setTimeout(() => setSyncError(""), 5000);
    }
    setSyncing(false);
  };

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const dateObj = new Date();
    const key = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD
    
    const newLog = {
      date: key,
      timestamp: dateObj.getTime(),
      displayDate: dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      sleep: parseInt(sleep),
      fatigue: parseInt(fatigue),
      soreness: parseInt(soreness),
      weight: weight ? parseFloat(weight) : null,
      notes: notes.trim(),
      rhr: rhr ? parseInt(rhr) : null,
      hrv: hrv ? parseInt(hrv) : null,
      sleepStages: sleepStages,
      sleepEfficiency: sleepEfficiency
    };

    onAddLog(newLog);
    setNotes("");
    setRhr("");
    setHrv("");
    setSleepStages(null);
    setSleepEfficiency(null);
    setSuccessMessage("Log saved successfully!");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const getMetricClass = (val, type) => {
    if (type === "sleep") {
      if (val >= 4) return "metric-good";
      if (val === 3) return "metric-avg";
      return "metric-bad";
    } else {
      if (val <= 2) return "metric-good";
      if (val === 3) return "metric-avg";
      return "metric-bad";
    }
  };

  const sortedLogs = [...recoveryLogs].sort((a, b) => b.timestamp - a.timestamp);

  const renderRatingSelectors = (label, value, onChange, type, labels) => {
    return (
      <div className="rating-selector-group">
        <span className="form-label">{label} ({value}/5)</span>
        <div className="pills-container">
          {[1, 2, 3, 4, 5].map((num) => {
            const isSelected = value === num;
            const styleClass = isSelected ? getMetricClass(num, type) : "";
            return (
              <button
                key={num}
                type="button"
                className={`pill-btn ${isSelected ? "active " + styleClass : ""}`}
                onClick={() => onChange(num)}
                title={labels[num - 1]}
              >
                <div className="pill-num">{num}</div>
                <div className="pill-label-micro">{labels[num - 1].split(" ")[0]}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderHeatmap = () => {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); 
    const daysToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    const startOfWeek = new Date(today.getTime() - daysToMonday * 24 * 60 * 60 * 1000);
    const startDate = new Date(startOfWeek.getTime() - 5 * 7 * 24 * 60 * 60 * 1000);
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const dateObj = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = dateObj.toISOString().split("T")[0];
      const log = recoveryLogs.find(l => l.date === dateStr);
      days.push({ dateStr, dateObj, log });
    }

    const grid = [];
    for (let row = 0; row < 7; row++) {
      const rowDays = [];
      for (let col = 0; col < 6; col++) {
        rowDays.push(days[col * 7 + row]);
      }
      grid.push(rowDays);
    }

    const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

    const getHeatmapColorClass = (dayInfo) => {
      if (!dayInfo.log) return "heatmap-empty";
      const { score } = calculateReadiness(dayInfo.log, recoveryLogs);
      if (score >= 75) return "heatmap-good";
      if (score >= 50) return "heatmap-avg";
      if (score >= 30) return "heatmap-warn";
      return "heatmap-bad";
    };

    return (
      <div className="heatmap-container">
        <h4 className="heatmap-title">🗓️ 6-Week Recovery Heatmap</h4>
        <div className="heatmap-grid-wrapper">
          <div className="heatmap-labels-col">
            {dayLabels.map((l, i) => (
              <span key={i} className="heatmap-label-row">{l}</span>
            ))}
          </div>
          <div className="heatmap-cells-grid">
            {grid.map((rowDays, rIdx) => (
              <div key={rIdx} className="heatmap-row">
                {rowDays.map((dayInfo, cIdx) => {
                  const colorClass = getHeatmapColorClass(dayInfo);
                  const readinessData = dayInfo.log ? calculateReadiness(dayInfo.log, recoveryLogs) : null;
                  const displayLabel = dayInfo.log 
                    ? `${dayInfo.dateStr}: Score ${readinessData.score}`
                    : `${dayInfo.dateStr}: No log`;
                  return (
                    <div
                      key={cIdx}
                      className={`heatmap-cell ${colorClass}`}
                      title={displayLabel}
                      onClick={() => dayInfo.log && alert(`Readiness Details for ${dayInfo.dateStr}:\n• Score: ${readinessData.score}\n• Sleep: ${dayInfo.log.sleep}/5\n• Fatigue: ${dayInfo.log.fatigue}/5\n• Soreness: ${dayInfo.log.soreness}/5\n• RHR: ${dayInfo.log.rhr || "—"} bpm\n• HRV: ${dayInfo.log.hrv || "—"} ms\n• Notes: ${dayInfo.log.notes || "None"}`)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="heatmap-key">
          <span>Less recovered</span>
          <div className="heatmap-cell heatmap-bad"></div>
          <div className="heatmap-cell heatmap-warn"></div>
          <div className="heatmap-cell heatmap-avg"></div>
          <div className="heatmap-cell heatmap-good"></div>
          <span>Fully recovered</span>
        </div>
      </div>
    );
  };

  return (
    <div className="recovery-log-tab animated">
      <div className="grid-2">
        {/* LOG FORM */}
        <form onSubmit={handleSubmit} className="card">
          <div className="card-title">
            <span>Log Daily Readiness</span>
            <span className="badge badge-teal">{todayStr}</span>
          </div>

          {successMessage && <div className="success-banner">{successMessage}</div>}

          <div style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn"
              onClick={handleWatchSync}
              disabled={syncing}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                background: "rgba(0, 242, 254, 0.08)",
                border: "1px solid rgba(0, 242, 254, 0.25)",
                color: "var(--color-primary)",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "0.85rem",
                width: "100%",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              {syncing ? "⏳ Fetching watch data..." : "⌚ Sync with Smartwatch"}
            </button>
            
            {!isNativeMobile() && (
              <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", textAlign: "center", display: "block" }}>
                ℹ️ Smartwatch health sync requires the native Android/iOS app container.
              </span>
            )}
            
            {syncError && (
              <span style={{ fontSize: "0.75rem", color: "var(--color-error)", textAlign: "center", display: "block", background: "rgba(255, 56, 96, 0.08)", padding: "0.4rem", borderRadius: "4px", border: "1px solid rgba(255, 56, 96, 0.2)" }}>
                ⚠️ {syncError}
              </span>
            )}
          </div>

          {renderRatingSelectors("Sleep Quality", sleep, setSleep, "sleep", [
            "Terrible (<4h)",
            "Poor (4-5h)",
            "Adequate (6-7h)",
            "Good (7-8h)",
            "Excellent (8h+)"
          ])}

          {/* Sleep Architecture Breakdown (Round 6) */}
          {sleepStages && (
            <div className="sleep-stages-card card-inner-details" style={{ padding: "0.75rem", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)", borderRadius: "8px", margin: "0.5rem 0 1.25rem 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                <span style={{ color: "var(--color-text-main)" }}>🛏️ Sleep Stage Architecture</span>
                <span style={{ color: "var(--color-primary)" }}>Efficiency: {sleepEfficiency}%</span>
              </div>
              
              <div className="sleep-bar-stacked" style={{ display: "flex", height: "14px", borderRadius: "7px", overflow: "hidden", background: "#111", marginBottom: "0.6rem" }}>
                {sleepStages.deep > 0 && <div className="sleep-bar-segment stage-deep" style={{ width: `${(sleepStages.deep / (sleepStages.deep + sleepStages.rem + sleepStages.light + sleepStages.awake)) * 100}%`, background: "#b026ff", height: "100%" }} title={`Deep Sleep: ${sleepStages.deep}m`} />}
                {sleepStages.rem > 0 && <div className="sleep-bar-segment stage-rem" style={{ width: `${(sleepStages.rem / (sleepStages.deep + sleepStages.rem + sleepStages.light + sleepStages.awake)) * 100}%`, background: "#00f2fe", height: "100%" }} title={`REM Sleep: ${sleepStages.rem}m`} />}
                {sleepStages.light > 0 && <div className="sleep-bar-segment stage-light" style={{ width: `${(sleepStages.light / (sleepStages.deep + sleepStages.rem + sleepStages.light + sleepStages.awake)) * 100}%`, background: "#39ff14", height: "100%" }} title={`Light Sleep: ${sleepStages.light}m`} />}
                {sleepStages.awake > 0 && <div className="sleep-bar-segment stage-awake" style={{ width: `${(sleepStages.awake / (sleepStages.deep + sleepStages.rem + sleepStages.light + sleepStages.awake)) * 100}%`, background: "#ff3860", height: "100%" }} title={`Awake: ${sleepStages.awake}m`} />}
              </div>

              <div className="sleep-stages-legend" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#b026ff" }}></span>Deep: {Math.round(sleepStages.deep / 60 * 10) / 10}h</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#00f2fe" }}></span>REM: {Math.round(sleepStages.rem / 60 * 10) / 10}h</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#39ff14" }}></span>Light: {Math.round(sleepStages.light / 60 * 10) / 10}h</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#ff3860" }}></span>Awake: {sleepStages.awake}m</span>
              </div>
            </div>
          )}

          {renderRatingSelectors("Fatigue Level", fatigue, setFatigue, "fatigue", [
            "Fully Recovered",
            "Mildly Tired",
            "Moderate",
            "High Fatigue",
            "Exhausted"
          ])}

          {renderRatingSelectors("Muscle Soreness", soreness, setSoreness, "soreness", [
            "None",
            "Mild",
            "Noticeable",
            "Limits ROM",
            "Can't Train"
          ])}

          <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Weight (lbs)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 182.4"
                className="form-input"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">RHR (bpm)</label>
              <input
                type="number"
                placeholder="e.g. 60"
                className="form-input"
                value={rhr}
                onChange={(e) => setRhr(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">HRV (ms)</label>
              <input
                type="number"
                placeholder="e.g. 65"
                className="form-input"
                value={hrv}
                onChange={(e) => setHrv(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Readiness Notes</label>
            <textarea
              placeholder="How do you feel? Any joints acting up? Motivation level?"
              className="form-input text-area"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full">
            Save Daily Log
          </button>
        </form>

        {/* LOG HISTORY */}
        <div className="card">
          <div className="card-title">History Logs</div>
          {sortedLogs.length > 0 && renderHeatmap()}
          {sortedLogs.length === 0 ? (
            <div className="empty-history">
              <span className="empty-icon">📅</span>
              <p>No readiness logs recorded yet. Start logging above to see your history!</p>
            </div>
          ) : (
            <div className="table-container history-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>BW</th>
                    <th>Sleep</th>
                    <th>Fatigue</th>
                    <th>Soreness</th>
                    <th>RHR</th>
                    <th>HRV</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLogs.slice(0, 10).map((log) => (
                    <tr key={log.date}>
                      <td className="bold-text">{log.displayDate}</td>
                      <td>{log.weight ? `${log.weight} lbs` : "—"}</td>
                      <td>
                        <span className={`badge ${getMetricClass(log.sleep, "sleep")}`}>
                          {log.sleep}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getMetricClass(log.fatigue, "fatigue")}`}>
                          {log.fatigue}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getMetricClass(log.soreness, "soreness")}`}>
                          {log.soreness}
                        </span>
                      </td>
                      <td>{log.rhr ? `${log.rhr} bpm` : "—"}</td>
                      <td>{log.hrv ? `${log.hrv} ms` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sortedLogs.length > 10 && (
                <div className="history-footnote">Showing last 10 logs</div>
              )}
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .rating-selector-group {
          margin-bottom: 1.25rem;
        }
        .pills-container {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.4rem;
          margin-top: 0.4rem;
        }
        .pill-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.5rem 0.2rem;
          cursor: pointer;
          color: var(--color-text-muted);
          transition: var(--transition);
          font-family: var(--font-family);
        }
        .pill-btn:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
          background: color-mix(in srgb, var(--color-primary) 8%, transparent);
        }
        .pill-btn.active {
          color: var(--bg-dark);
          font-weight: 700;
        }
        .pill-num {
          font-size: 1.1rem;
          font-weight: 700;
        }
        .pill-label-micro {
          font-size: 0.55rem;
          text-transform: uppercase;
          opacity: 0.8;
          margin-top: 0.1rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
          text-align: center;
          font-weight: 500;
        }
        .metric-good {
          background-color: var(--color-secondary) !important;
          color: var(--bg-dark) !important;
          box-shadow: var(--shadow-glow-green);
        }
        .metric-avg {
          background-color: var(--color-warning) !important;
          color: var(--bg-dark) !important;
          box-shadow: 0 0 15px rgba(255, 184, 0, 0.2);
        }
        .metric-bad {
          background-color: var(--color-error) !important;
          color: white !important;
          box-shadow: 0 0 15px rgba(255, 56, 96, 0.2);
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        .text-area {
          resize: none;
        }
        .btn-full {
          width: 100%;
          margin-top: 0.5rem;
        }
        .success-banner {
          background: color-mix(in srgb, var(--color-primary) 10%, transparent);
          border: 1px solid var(--color-primary);
          color: var(--color-primary);
          border-radius: 8px;
          padding: 0.75rem;
          margin-bottom: 1.25rem;
          font-size: 0.9rem;
          font-weight: 600;
          text-align: center;
          animation: pulse 2s infinite alternate;
        }
        .empty-history {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.5rem;
          text-align: center;
          color: var(--color-text-muted);
        }
        .empty-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }
        .history-table-container {
          max-height: 440px;
        }
        .bold-text {
          font-weight: 600;
          color: var(--color-text-main);
        }
        .history-footnote {
          text-align: center;
          font-size: 0.75rem;
          color: var(--color-text-muted);
          padding: 0.75rem 0;
          border-top: 1px solid var(--border-color);
          margin-top: 0.5rem;
        }
      ` }} />
    </div>
  );
}
