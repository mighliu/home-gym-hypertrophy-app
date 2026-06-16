import { useState } from "react";

export default function RecoveryLog({
  recoveryLogs,
  onAddLog
}) {
  const [sleep, setSleep] = useState(3);
  const [fatigue, setFatigue] = useState(3);
  const [soreness, setSoreness] = useState(1);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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
      notes: notes.trim()
    };

    onAddLog(newLog);
    setNotes("");
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

          {renderRatingSelectors("Sleep Quality", sleep, setSleep, "sleep", [
            "Terrible (<4h)",
            "Poor (4-5h)",
            "Adequate (6-7h)",
            "Good (7-8h)",
            "Excellent (8h+)"
          ])}

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

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">AM Bodyweight (lbs)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 182.4"
                className="form-input"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
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
