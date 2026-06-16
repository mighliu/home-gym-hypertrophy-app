import { DEFAULT_SPLITS, getEquipmentProfile } from "../data/database";

export default function History({ workoutLogs }) {
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

        return {
          ...session,
          title,
          exercises: exercisesList,
          tonnage: totalTonnage,
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

  return (
    <div className="history-tab animated">
      <div className="card">
        <h2 style={{ marginBottom: "0.5rem", color: "var(--color-text-main)" }}>Workout History</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
          Review your completed sessions, tonnage, RIR selections, and training notes.
        </p>

        {completedSessions.length === 0 ? (
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
      `}} />
    </div>
  );
}
