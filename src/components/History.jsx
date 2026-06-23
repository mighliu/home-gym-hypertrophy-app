import { useState } from "react";
import { DEFAULT_SPLITS, getEquipmentProfile } from "../data/database";
import { getE1RMHistory } from "../data/analytics";

export default function History({ workoutLogs, sessionLogs = {} }) {
  const [subTab, setSubTab] = useState("sessions"); // "sessions" or "prs"

  // Group logs by meso-week-day
  const getCompletedSessions = () => {
    const sessions = {};

    Object.entries(workoutLogs).forEach(([key, setData]) => {
      if (!setData || !setData.completed) return;

      const parts = key.split("-");
      if (parts.length < 5) return; // ignore invalid keys, e.g. readiness/cns keys

      const meso = parseInt(parts[0], 10);
      const week = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const setIdx = parseInt(parts[parts.length - 1], 10);
      const exName = parts.slice(3, -1).join("-");

      const sessionKey = `${meso}-${week}-${day}`;

      if (!sessions[sessionKey]) {
        sessions[sessionKey] = {
          meso,
          week,
          day,
          exercises: {},
          date: setData.date || null,
          timestamp: setData.timestamp || 0,
        };
      }

      // Keep track of the latest timestamp in the session
      if (setData.timestamp && setData.timestamp > sessions[sessionKey].timestamp) {
        sessions[sessionKey].timestamp = setData.timestamp;
        sessions[sessionKey].date = setData.date;
      }

      if (!sessions[sessionKey].exercises[exName]) {
        sessions[sessionKey].exercises[exName] = [];
      }

      sessions[sessionKey].exercises[exName].push({
        setNumber: setIdx,
        weight: setData.weight,
        reps: setData.reps,
        rir: setData.rir,
        notes: setData.notes,
      });
    });

    // Process sessions into a list
    return Object.values(sessions)
      .map((session) => {
        // Sort sets for each exercise
        const exercisesList = Object.entries(session.exercises).map(([name, sets]) => {
          sets.sort((a, b) => a.setNumber - b.setNumber);
          return { name, sets };
        });

        // Calculate session tonnage
        let totalTonnage = 0;
        exercisesList.forEach(({ name, sets }) => {
          const profile = getEquipmentProfile(name);
          if (profile.isWeighted) {
            sets.forEach((s) => {
              if (s.weight && s.reps) {
                totalTonnage += parseFloat(s.weight) * parseInt(s.reps, 10);
              }
            });
          }
        });

        // Get session display title
        const dayIndex = session.day - 1;
        const dayData = DEFAULT_SPLITS[session.meso]?.[dayIndex];
        const title = dayData ? dayData.title : `Day ${session.day} Workout`;

        // Retrieve matched session logs for cardiovascular HR metrics
        const sessionKey = `${session.meso}-${session.week}-${session.day}`;
        const sLog = sessionLogs[sessionKey] || {};

        return {
          ...session,
          title,
          exercises: exercisesList,
          tonnage: totalTonnage,
          avgHr: sLog.avgHr || null,
          peakHr: sLog.peakHr || null,
          zones: sLog.zones || null,
        };
      })
      .sort((a, b) => {
        // Sort by timestamp if available, else by meso/week/day descending
        if (a.timestamp && b.timestamp) {
          return b.timestamp - a.timestamp;
        }
        if (a.meso !== b.meso) return b.meso - a.meso;
        if (a.week !== b.week) return b.week - a.week;
        return b.day - a.day;
      });
  };

  const completedSessions = getCompletedSessions();

  const renderSparkline = (history) => {
    if (!history || history.length < 2) {
      return (
        <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
          Awaiting progress
        </span>
      );
    }
    
    const width = 120;
    const height = 30;
    const padding = 3;
    
    const e1rms = history.map(h => h.e1RM);
    const minVal = Math.min(...e1rms);
    const maxVal = Math.max(...e1rms);
    const range = maxVal - minVal || 10;
    
    const points = history.map((h, i) => {
      const x = (i * (width - padding * 2)) / (history.length - 1) + padding;
      const y = height - padding - ((h.e1RM - minVal) / range) * (height - padding * 2);
      return `${x},${y}`;
    });
    
    const pathD = `M ${points.join(" L ")}`;
    const lastPt = points[points.length - 1].split(",");
    
    return (
      <svg width={width} height={height} className="sparkline-svg" style={{ overflow: "visible" }}>
        <path
          d={pathD}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={lastPt[0]}
          cy={lastPt[1]}
          r="3"
          fill="var(--color-secondary)"
        />
      </svg>
    );
  };

  const renderPRHistory = () => {
    const uniqueExNames = new Set();
    Object.keys(workoutLogs).forEach(key => {
      const parts = key.split("-");
      if (parts.length >= 5) {
        const exName = parts.slice(3, -1).join("-");
        const log = workoutLogs[key];
        if (log && log.completed) {
          uniqueExNames.add(exName);
        }
      }
    });

    const exList = Array.from(uniqueExNames).map(exName => {
      const history = getE1RMHistory(workoutLogs, exName);
      
      let maxWeight = 0;
      let maxReps = 0;
      const sessionTonnages = {};

      Object.entries(workoutLogs).forEach(([key, log]) => {
        if (!log.completed) return;
        const parts = key.split("-");
        const name = parts.slice(3, -1).join("-");
        if (name !== exName) return;

        const w = parseFloat(log.weight);
        const r = parseInt(log.reps, 10);
        if (w && r) {
          if (w > maxWeight) maxWeight = w;
          if (r > maxReps) maxReps = r;
          
          const sessionPrefix = parts.slice(0, 3).join("-");
          sessionTonnages[sessionPrefix] = (sessionTonnages[sessionPrefix] || 0) + (w * r);
        }
      });

      const maxVolume = Object.values(sessionTonnages).length > 0 ? Math.max(...Object.values(sessionTonnages)) : 0;
      const currentE1RM = history.length > 0 ? history[history.length - 1].e1RM : 0;
      const startE1RM = history.length > 0 ? history[0].e1RM : 0;
      const delta = currentE1RM - startE1RM;

      return {
        name: exName,
        history,
        maxWeight,
        maxReps,
        maxVolume,
        currentE1RM,
        delta
      };
    }).filter(ex => ex.history.length > 0);

    if (exList.length === 0) {
      return (
        <div className="empty-history" style={{ padding: "3rem 1rem", textAlign: "center" }}>
          <span className="empty-icon" style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}>🏆</span>
          <p style={{ color: "var(--color-text-muted)" }}>No personal records detected. Hit target reps in the training log to unlock badges!</p>
        </div>
      );
    }

    return (
      <div className="pr-history-view">
        <h3 style={{ color: "var(--color-text-main)", marginBottom: "1rem" }}>🏆 Personal Records & Estimated 1RM Progression</h3>
        <div className="pr-cards-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
          {exList.map(ex => (
            <div key={ex.name} className="card pr-ex-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", padding: "1rem", border: "1px solid var(--border-color)" }}>
              <div style={{ flex: "1 1 200px" }}>
                <h4 style={{ color: "var(--color-text-main)", margin: "0 0 0.5rem 0", fontSize: "1rem" }}>{ex.name}</h4>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", fontSize: "0.7rem" }}>
                  <span className="badge badge-teal">Max Wt: {ex.maxWeight} lbs</span>
                  <span className="badge badge-purple">Max Reps: {ex.maxReps} r</span>
                  <span className="badge badge-muted">Max Session Vol: {ex.maxVolume.toLocaleString()} lbs</span>
                </div>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ fontSize: "0.6rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Current e1RM</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--color-primary)" }}>{Math.round(ex.currentE1RM)} lbs</span>
                  {ex.delta !== 0 && (
                    <span style={{ fontSize: "0.75rem", fontWeight: "700", color: ex.delta >= 0 ? "var(--color-secondary)" : "var(--color-error)" }}>
                      {ex.delta >= 0 ? `+${Math.round(ex.delta)}` : Math.round(ex.delta)} lbs delta
                    </span>
                  )}
                </div>
                
                <div className="sparkline-wrapper" style={{ minWidth: "120px", display: "flex", justifyContent: "center" }}>
                  {renderSparkline(ex.history)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="history-tab animated">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ color: "var(--color-text-main)" }}>Training History</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
              Review completed workouts, tonnage records, heart rate metrics, and PR details.
            </p>
          </div>
          <div className="chart-mode-toggles" style={{ display: "flex", gap: "0.4rem" }}>
            <button
              type="button"
              className={`toggle-mode-btn ${subTab === "sessions" ? "active" : ""}`}
              onClick={() => setSubTab("sessions")}
              style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
            >
              Session Logs
            </button>
            <button
              type="button"
              className={`toggle-mode-btn ${subTab === "prs" ? "active" : ""}`}
              onClick={() => setSubTab("prs")}
              style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
            >
              PR History
            </button>
          </div>
        </div>

        {subTab === "prs" ? (
          renderPRHistory()
        ) : completedSessions.length === 0 ? (
          <div className="empty-history" style={{ padding: "3rem 1rem", textAlign: "center" }}>
            <span className="empty-icon" style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}>📅</span>
            <p style={{ color: "var(--color-text-muted)" }}>No completed sessions found. Complete set tracking rows in the Workout Log tab to build your history!</p>
          </div>
        ) : (
          <div className="history-sessions-list">
            {completedSessions.map((session) => (
              <div key={`${session.meso}-${session.week}-${session.day}`} className="history-session-card">
                <div className="session-card-header">
                  <div>
                    <h3 className="session-title">{session.title}</h3>
                    <div className="session-badges">
                      <span className="badge badge-teal">Meso {session.meso}</span>
                      <span className="badge badge-purple">Week {session.week}</span>
                      <span className="badge badge-muted">Day {session.day}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="session-date-txt">
                      {session.date ? new Date(session.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Legacy Session"}
                    </div>
                    <div className="session-tonnage-txt">
                      Tonnage: <strong>{session.tonnage.toLocaleString()} lbs</strong>
                    </div>
                  </div>
                </div>

                {/* Session Active Heart Rate summary */}
                {session.avgHr && (
                  <div className="session-hr-card" style={{ display: "flex", gap: "1rem", background: "rgba(255, 56, 96, 0.04)", borderBottom: "1px solid var(--border-color)", padding: "0.6rem 1rem", fontSize: "0.75rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#ff3860", fontWeight: "700" }}>
                      <span>❤️ Heart Rate</span>
                      <span>Avg: {session.avgHr} bpm | Peak: {session.peakHr} bpm</span>
                    </div>
                    {session.zones && (
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        {session.zones.zone1 > 0 && <span className="hr-zone-pill zone-1" style={{ padding: "0.15rem 0.35rem", borderRadius: "4px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--color-text-muted)" }} title="Active Recovery">Z1: {session.zones.zone1}m</span>}
                        {session.zones.zone2 > 0 && <span className="hr-zone-pill zone-2" style={{ padding: "0.15rem 0.35rem", borderRadius: "4px", background: "rgba(57, 255, 20, 0.08)", border: "1px solid rgba(57, 255, 20, 0.2)", color: "var(--color-secondary)" }} title="Aerobic / Endurance">Z2: {session.zones.zone2}m</span>}
                        {session.zones.zone3 > 0 && <span className="hr-zone-pill zone-3" style={{ padding: "0.15rem 0.35rem", borderRadius: "4px", background: "rgba(0, 242, 254, 0.08)", border: "1px solid rgba(0, 242, 254, 0.2)", color: "var(--color-primary)" }} title="Tempo / Threshold">Z3: {session.zones.zone3}m</span>}
                        {session.zones.zone4 > 0 && <span className="hr-zone-pill zone-4" style={{ padding: "0.15rem 0.35rem", borderRadius: "4px", background: "rgba(176, 38, 255, 0.08)", border: "1px solid rgba(176, 38, 255, 0.2)", color: "var(--color-accent)" }} title="Anaerobic Capacity">Z4: {session.zones.zone4}m</span>}
                        {session.zones.zone5 > 0 && <span className="hr-zone-pill zone-5" style={{ padding: "0.15rem 0.35rem", borderRadius: "4px", background: "rgba(255, 56, 96, 0.08)", border: "1px solid rgba(255, 56, 96, 0.2)", color: "#ff3860" }} title="Max Effort">Z5: {session.zones.zone5}m</span>}
                      </div>
                    )}
                  </div>
                )}

                <div className="session-exercises-list">
                  {session.exercises.map((ex) => (
                    <div key={ex.name} className="history-ex-row">
                      <h4 className="history-ex-name">{ex.name}</h4>
                      <div className="history-sets-grid">
                        {ex.sets.map((set) => (
                          <div key={set.setNumber} className="history-set-pill">
                            <div className="pill-header">Set {set.setNumber}</div>
                            <div className="pill-body">
                              <span className="pill-weight">{set.weight} lbs</span>
                              <span className="pill-divider">&times;</span>
                              <span className="pill-reps">{set.reps} reps</span>
                              {set.rir !== undefined && set.rir !== "" && (
                                <span className="pill-rir">({set.rir} RIR)</span>
                              )}
                            </div>
                            {set.notes && (
                              <div className="pill-notes" title={set.notes}>
                                💬 {set.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .history-sessions-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .history-session-card {
          border: 1px solid var(--border-color);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.01);
          overflow: hidden;
          transition: var(--transition);
        }
        .history-session-card:hover {
          border-color: rgba(0, 242, 254, 0.2);
          background: rgba(0, 242, 254, 0.01);
        }
        .session-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid var(--border-color);
          flex-wrap: wrap;
          gap: 1rem;
        }
        .session-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--color-text-main);
          margin-bottom: 0.25rem;
        }
        .session-badges {
          display: flex;
          gap: 0.35rem;
        }
        .session-date-txt {
          font-size: 0.8rem;
          color: var(--color-text-muted);
        }
        .session-tonnage-txt {
          font-size: 0.85rem;
          color: var(--color-text-main);
          margin-top: 0.15rem;
        }
        .session-tonnage-txt strong {
          color: var(--color-primary);
        }
        .session-exercises-list {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .history-ex-row {
          border-bottom: 1px dashed rgba(255, 255, 255, 0.05);
          padding-bottom: 0.75rem;
        }
        .history-ex-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .history-ex-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--color-text-main);
          margin-bottom: 0.5rem;
        }
        .history-sets-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .history-set-pill {
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 0.35rem 0.6rem;
          font-size: 0.8rem;
          display: flex;
          flex-direction: column;
          min-width: 110px;
        }
        .pill-header {
          font-size: 0.65rem;
          text-transform: uppercase;
          color: var(--color-text-muted);
          font-weight: bold;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 0.15rem;
          margin-bottom: 0.25rem;
        }
        .pill-body {
          display: flex;
          align-items: center;
          gap: 0.2rem;
          font-weight: 600;
          color: var(--color-text-main);
        }
        .pill-weight {
          color: var(--color-primary);
        }
        .pill-reps {
          color: var(--color-secondary);
        }
        .pill-rir {
          font-size: 0.7rem;
          color: var(--color-warning);
        }
        .pill-notes {
          font-size: 0.7rem;
          color: var(--color-text-muted);
          margin-top: 0.25rem;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
          max-width: 180px;
          border-top: 1px dashed rgba(255, 255, 255, 0.05);
          padding-top: 0.2rem;
        }
        .sparkline-svg {
          display: inline-block;
          vertical-align: middle;
        }
      `}} />
    </div>
  );
}
