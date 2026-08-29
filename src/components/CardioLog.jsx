import { useState } from "react";
import { isNativeMobile, syncSmartwatchWorkouts } from "../data/smartwatchSync";

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

function getWeekDateRange(w, currentWeek, workoutLogs) {
  let timestamps = [];
  Object.entries(workoutLogs || {}).forEach(([key, val]) => {
    const parts = key.split("-");
    if (parts.length >= 3) {
      const weekNum = parseInt(parts[1], 10);
      if (weekNum === w && val.timestamp) {
        timestamps.push(val.timestamp);
      }
    }
  });

  if (timestamps.length > 0) {
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const startDate = new Date(minTime - 24 * 60 * 60 * 1000);
    const endDate = new Date(maxTime + 24 * 60 * 60 * 1000);
    return { startDate, endDate };
  }

  let allTimestamps = [];
  Object.entries(workoutLogs || {}).forEach(([key, val]) => {
    const parts = key.split("-");
    if (parts.length >= 3) {
      const weekNum = parseInt(parts[1], 10);
      if (val.timestamp) {
        allTimestamps.push({ time: val.timestamp, week: weekNum });
      }
    }
  });

  if (allTimestamps.length > 0) {
    allTimestamps.sort((a, b) => a.time - b.time);
    const anchor = allTimestamps[0];
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weekDifference = w - anchor.week;
    const estimatedStartTime = anchor.time + weekDifference * msPerWeek;
    const startDate = new Date(estimatedStartTime - 1 * 24 * 60 * 60 * 1000);
    const endDate = new Date(estimatedStartTime + 7 * 24 * 60 * 60 * 1000);
    return { startDate, endDate };
  }

  const now = Date.now();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weekDifference = w - currentWeek;
  const estimatedStartTime = now + weekDifference * msPerWeek;
  const startDate = new Date(estimatedStartTime - 6 * 24 * 60 * 60 * 1000);
  const endDate = new Date(estimatedStartTime + 24 * 60 * 60 * 1000);
  return { startDate, endDate };
}

function matchWorkout(sessionType, workouts, usedIndexes) {
  for (let i = 0; i < workouts.length; i++) {
    if (usedIndexes.has(i)) continue;
    const w = workouts[i];
    const typeStr = (w.workoutActivityType || w.activityType || w.type || "").toLowerCase();
    
    let isMatch = false;
    if (sessionType === "Zone 2 Walk") {
      isMatch = typeStr.includes("walk") || typeStr.includes("hike");
    } else if (sessionType === "Jump Rope") {
      isMatch = typeStr.includes("rope") || typeStr.includes("skip") || typeStr.includes("jump");
    } else if (sessionType === "KB Swings EMOM") {
      isMatch = typeStr.includes("kettlebell") || typeStr.includes("strength") || typeStr.includes("weight") || typeStr.includes("fitness") || typeStr.includes("functional") || typeStr.includes("crossfit") || typeStr.includes("rowing");
    }
    
    if (isMatch) {
      usedIndexes.add(i);
      return w;
    }
  }
  
  if (sessionType === "KB Swings EMOM") {
    for (let i = 0; i < workouts.length; i++) {
      if (usedIndexes.has(i)) continue;
      const w = workouts[i];
      const typeStr = (w.workoutActivityType || w.activityType || w.type || "").toLowerCase();
      if (typeStr.includes("exercise") || typeStr.includes("other") || typeStr.includes("gym") || typeStr.includes("workout")) {
        usedIndexes.add(i);
        return w;
      }
    }
  }
  
  return null;
}

export default function CardioLog({
  cardioLogs,
  onSaveCardio,
  currentWeek,
  recoveryLogs = [],
  workoutLogs = {},
  currentMeso = 1
}) {
  const [syncingWeeks, setSyncingWeeks] = useState({});
  const [syncMessages, setSyncMessages] = useState({});

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
    const key = `m${currentMeso}_w${week}_s${sessionNum}`;
    const currentData = cardioLogs[key] || cardioLogs[`w${week}_s${sessionNum}`] || {};
    const updateData = {
      ...currentData,
      [field]: value
    };
    if (updateData.completed && !updateData.date) {
      updateData.timestamp = Date.now();
      updateData.date = new Date().toISOString().split("T")[0];
    }
    onSaveCardio(key, updateData);
  };

  const handleToggleComplete = (week, sessionNum, targetDuration) => {
    const key = `m${currentMeso}_w${week}_s${sessionNum}`;
    const currentData = cardioLogs[key] || cardioLogs[`w${week}_s${sessionNum}`] || {};
    const newCompleted = !currentData.completed;

    // Auto-fill duration if checking complete and duration is empty
    const finalDuration = newCompleted && (currentData.duration === undefined || currentData.duration === "")
      ? targetDuration
      : (currentData.duration || "");

    onSaveCardio(key, {
      ...currentData,
      duration: finalDuration,
      completed: newCompleted,
      timestamp: newCompleted ? Date.now() : null,
      date: newCompleted ? new Date().toISOString().split("T")[0] : null
    });
  };

  const getCardioRecoveryPoints = () => {
    const points = [];
    Object.entries(cardioLogs || {}).forEach(([key, log]) => {
      if (!log || !log.completed) return;

      let mesoNum, weekNum, sessionNum;

      const mMatch = key.match(/^m(\d+)_w(\d+)_s(\d+)$/);
      const wMatch = key.match(/^w(\d+)_s(\d+)$/);

      if (mMatch) {
        mesoNum = parseInt(mMatch[1], 10);
        weekNum = parseInt(mMatch[2], 10);
        sessionNum = parseInt(mMatch[3], 10);
      } else if (wMatch) {
        mesoNum = 1;
        weekNum = parseInt(wMatch[1], 10);
        sessionNum = parseInt(wMatch[2], 10);
      } else {
        return;
      }

      if (mesoNum !== currentMeso) return;

      let sessionTime = log.timestamp;
      let sessionDateStr = log.date;

      if (!sessionTime) {
        const { startDate } = getWeekDateRange(weekNum, currentWeek, workoutLogs);
        sessionTime = startDate.getTime() + (sessionNum - 1) * 2 * 24 * 60 * 60 * 1000;
        sessionDateStr = new Date(sessionTime).toISOString().split("T")[0];
      }

      const duration = parseFloat(log.duration) || 0;
      const intensity = parseInt(log.intensity, 10) || 3;
      const load = duration * intensity;

      const nextDayTime = new Date(sessionDateStr + "T12:00:00").getTime() + 24 * 60 * 60 * 1000;
      const nextDayStr = new Date(nextDayTime).toISOString().split("T")[0];
      const nextDayLog = recoveryLogs.find(l => l.date === nextDayStr);

      points.push({
        label: `W${weekNum} S${sessionNum}`,
        load,
        sleep: nextDayLog ? nextDayLog.sleep : null,
        fatigue: nextDayLog ? nextDayLog.fatigue : null,
        timestamp: sessionTime
      });
    });

    points.sort((a, b) => a.timestamp - b.timestamp);
    return points.slice(-10);
  };

  const renderCardioRecoveryChart = () => {
    const points = getCardioRecoveryPoints();
    if (points.length === 0) {
      return (
        <div className="card chart-card-dash" style={{ marginBottom: "1.5rem" }}>
          <div className="card-title">Cardio Load vs. Next-Day Recovery Impact</div>
          <div className="chart-placeholder" style={{ padding: "2.5rem 1rem", textAlign: "center" }}>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", margin: 0 }}>
              Complete and log cardio sessions to view the recovery correlation trendline.
            </p>
          </div>
        </div>
      );
    }

    const loads = points.map(p => p.load);
    const maxLoad = Math.max(100, ...loads);
    
    const chartWidth = 600;
    const chartHeight = 220;
    const paddingLeft = 45;
    const paddingRight = 45;
    const paddingTop = 30;
    const paddingBottom = 40;

    const getX = (idx) => {
      const drawableWidth = chartWidth - paddingLeft - paddingRight;
      if (points.length === 1) return paddingLeft + drawableWidth / 2;
      return paddingLeft + (idx * drawableWidth) / (points.length - 1);
    };

    const getLoadY = (val) => {
      const drawableHeight = chartHeight - paddingTop - paddingBottom;
      return chartHeight - paddingBottom - (val * drawableHeight) / maxLoad;
    };

    const getRecY = (val) => {
      const drawableHeight = chartHeight - paddingTop - paddingBottom;
      return chartHeight - paddingBottom - ((val - 1) * drawableHeight) / 4;
    };

    const loadPoints = points.map((p, idx) => ({ x: getX(idx), y: getLoadY(p.load), val: p.load }));
    const sleepPoints = points
      .map((p, idx) => p.sleep !== null ? { x: getX(idx), y: getRecY(p.sleep), val: p.sleep } : null)
      .filter(p => p !== null);
    const fatiguePoints = points
      .map((p, idx) => p.fatigue !== null ? { x: getX(idx), y: getRecY(p.fatigue), val: p.fatigue } : null)
      .filter(p => p !== null);

    const loadPath = loadPoints.reduce((acc, p, idx) => acc + `${idx === 0 ? "M" : "L"} ${p.x} ${p.y} `, "");
    const sleepPath = sleepPoints.reduce((acc, p, idx) => acc + `${idx === 0 ? "M" : "L"} ${p.x} ${p.y} `, "");
    const fatiguePath = fatiguePoints.reduce((acc, p, idx) => acc + `${idx === 0 ? "M" : "L"} ${p.x} ${p.y} `, "");

    return (
      <div className="card chart-card-dash" style={{ marginBottom: "1.5rem" }}>
        <div className="card-title">Cardio Load vs. Next-Day Recovery Impact</div>
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "0.75rem", lineHeight: "1.4" }}>
          Correlates cardio training load (duration × intensity) with the next day's sleep quality and fatigue levels.
        </p>
        <div className="svg-chart-container">
          <svg className="svg-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const val = Math.round(maxLoad * ratio);
              const y = getLoadY(val);
              return (
                <g key={`l-${idx}`} className="grid-line-group">
                  <line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke="var(--border-color)" strokeWidth="1" />
                  <text x={paddingLeft - 8} y={y + 4} fill="var(--color-text-muted)" fontSize="9" textAnchor="end">{val}</text>
                </g>
              );
            })}

            {[1, 2, 3, 4, 5].map((num) => {
              const y = getRecY(num);
              return (
                <text key={`r-${num}`} x={chartWidth - paddingRight + 8} y={y + 4} fill="var(--color-text-muted)" fontSize="9" textAnchor="start">
                  {num === 5 ? "5 (Best)" : num === 1 ? "1 (Worst)" : num}
                </text>
              );
            })}

            {points.map((p, idx) => (
              <text key={idx} x={getX(idx)} y={chartHeight - 10} fill="var(--color-text-muted)" fontSize="9" textAnchor="middle">
                {p.label}
              </text>
            ))}

            {loadPoints.length > 1 && (
              <path d={loadPath} fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" className="chart-path" />
            )}
            {loadPoints.map((p, idx) => (
              <g key={`l-dot-${idx}`}>
                <circle cx={p.x} cy={p.y} r="3.5" fill="var(--bg-card-solid)" stroke="var(--color-primary)" strokeWidth="2" />
                <title>{`Cardio Load: ${p.val}`}</title>
              </g>
            ))}

            {sleepPoints.length > 1 && (
              <path d={sleepPath} fill="none" stroke="var(--color-secondary)" strokeWidth="2" strokeDasharray="3,3" strokeLinecap="round" />
            )}
            {sleepPoints.map((p, idx) => (
              <g key={`s-dot-${idx}`}>
                <circle cx={p.x} cy={p.y} r="3" fill="var(--bg-card-solid)" stroke="var(--color-secondary)" strokeWidth="1.5" />
                <title>{`Next-Day Sleep: ${p.val}/5`}</title>
              </g>
            ))}

            {fatiguePoints.length > 1 && (
              <path d={fatiguePath} fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeDasharray="5,2" strokeLinecap="round" />
            )}
            {fatiguePoints.map((p, idx) => (
              <g key={`f-dot-${idx}`}>
                <circle cx={p.x} cy={p.y} r="3" fill="var(--bg-card-solid)" stroke="var(--color-warning)" strokeWidth="1.5" />
                <title>{`Next-Day Fatigue: ${p.val}/5`}</title>
              </g>
            ))}
          </svg>
          <div className="chart-legend" style={{ marginTop: "0.5rem" }}>
            <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: "var(--color-primary)" }}></span><span>Cardio Load (Left Y)</span></div>
            <div className="legend-item"><span className="legend-dot" style={{ border: "1px dashed var(--color-secondary)", backgroundColor: "transparent", borderRadius: "50%" }}></span><span>Next-Day Sleep (Right Y)</span></div>
            <div className="legend-item"><span className="legend-dot" style={{ border: "1px dotted var(--color-warning)", backgroundColor: "transparent", borderRadius: "50%" }}></span><span>Next-Day Fatigue (Right Y)</span></div>
          </div>
        </div>
      </div>
    );
  };

  const getLogValue = (week, sessionNum, field) => {
    const key = `m${currentMeso}_w${week}_s${sessionNum}`;
    return cardioLogs[key]?.[field] ?? cardioLogs[`w${week}_s${sessionNum}`]?.[field] ?? "";
  };

  const getIntensityLabel = (val) => {
    const labels = ["", "Very Light", "Light", "Moderate", "Hard", "Max Effort"];
    return labels[val] || "";
  };

  const getRecoveryLabel = (val) => {
    const labels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];
    return labels[val] || "";
  };

  const handleSyncWorkoutsForWeek = async (w) => {
    setSyncingWeeks(prev => ({ ...prev, [w]: true }));
    setSyncMessages(prev => ({ ...prev, [w]: "" }));

    const { startDate, endDate } = getWeekDateRange(w, currentWeek, workoutLogs);

    try {
      const result = await syncSmartwatchWorkouts(startDate.toISOString(), endDate.toISOString());
      if (result.success) {
        const workouts = result.workouts || [];
        if (workouts.length === 0) {
          setSyncMessages(prev => ({
            ...prev,
            [w]: "No workouts found on your smartwatch for this week's date range."
          }));
        } else {
          // Perform matching
          const usedIndexes = new Set();
          let matchedCount = 0;

          for (let sNum = 1; sNum <= 3; sNum++) {
            const details = getCardioSessionDetails(w, sNum);
            if (!details) continue;

            const matchedWorkout = matchWorkout(details.type, workouts, usedIndexes);
            if (matchedWorkout) {
              let durationMin = 0;
              if (matchedWorkout.duration) {
                if (matchedWorkout.duration > 120) {
                  durationMin = matchedWorkout.duration / 60;
                } else {
                  durationMin = matchedWorkout.duration;
                }
              } else if (matchedWorkout.startDate && matchedWorkout.endDate) {
                const start = new Date(matchedWorkout.startDate).getTime();
                const end = new Date(matchedWorkout.endDate).getTime();
                if (start && end && end > start) {
                  durationMin = (end - start) / (1000 * 60);
                }
              }
              durationMin = Math.round(durationMin);

              const rawType = matchedWorkout.workoutActivityType || matchedWorkout.activityType || matchedWorkout.type || "Workout";
              const workoutType = rawType.split("_").map(str => str.charAt(0).toUpperCase() + str.slice(1)).join(" ");
              const calories = matchedWorkout.calories || matchedWorkout.energy || matchedWorkout.totalEnergyBurned || 0;
              const caloriesBurned = calories ? Math.round(calories) : null;
              
              const dateStr = matchedWorkout.startDate 
                ? new Date(matchedWorkout.startDate).toLocaleDateString()
                : new Date().toLocaleDateString();

              const key = `m${currentMeso}_w${w}_s${sNum}`;
              const currentData = cardioLogs[key] || cardioLogs[`w${w}_s${sNum}`] || {};
              
              onSaveCardio(key, {
                ...currentData,
                duration: durationMin,
                notes: `Synced from smartwatch (${workoutType}${caloriesBurned ? `, ${caloriesBurned} kcal` : ""}) on ${dateStr}`,
                completed: true,
                synced: true,
                date: matchedWorkout.startDate ? new Date(matchedWorkout.startDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                timestamp: matchedWorkout.startDate ? new Date(matchedWorkout.startDate).getTime() : Date.now()
              });
              matchedCount++;
            }
          }

          if (matchedCount > 0) {
            setSyncMessages(prev => ({
              ...prev,
              [w]: `Successfully matched and imported ${matchedCount} workout(s) from your smartwatch!`
            }));
          } else {
            setSyncMessages(prev => ({
              ...prev,
              [w]: "Workouts fetched, but none matched the types required for this week's sessions (Walks, Jump Rope, or KB Swings)."
            }));
          }
        }
      } else {
        setSyncMessages(prev => ({
          ...prev,
          [w]: `Sync failed: ${result.message}`
        }));
      }
    } catch (err) {
      console.error("Error syncing workouts for week:", err);
      setSyncMessages(prev => ({
        ...prev,
        [w]: `Sync failed: ${err.message || err}`
      }));
    } finally {
      setSyncingWeeks(prev => ({ ...prev, [w]: false }));
    }
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

      {/* Cardio Load vs. Recovery Impact Chart */}
      {renderCardioRecoveryChart()}

      <div className="weeks-accordion">
        {Array.from({ length: 15 }).map((_, idx) => {
          const w = idx + 1;
          const isExpanded = !!expandedWeeks[w];
          const isCurrent = w === currentWeek;

          // Calculate completed sessions in this week
          let completedCount = 0;
          for (let s = 1; s <= 3; s++) {
            if (cardioLogs[`m${currentMeso}_w${w}_s${s}`]?.completed || cardioLogs[`w${w}_s${s}`]?.completed) {
              completedCount++;
            }
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
                  {/* Smartwatch Sync Section */}
                  <div className="week-sync-container" style={{ margin: "0.25rem 0 1.25rem 0" }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleSyncWorkoutsForWeek(w)}
                      disabled={syncingWeeks[w]}
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
                      {syncingWeeks[w] ? "⏳ Syncing workouts..." : "⌚ Sync Workouts for Week " + w}
                    </button>
                    {!isNativeMobile() && (
                      <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", textAlign: "center", display: "block", marginTop: "0.4rem" }}>
                        ℹ️ Smartwatch workout sync requires the native Android/iOS app container.
                      </span>
                    )}
                    {syncMessages[w] && (
                      <span style={{
                        fontSize: "0.75rem",
                        color: syncMessages[w].includes("failed") ? "var(--color-error)" : "var(--color-secondary)",
                        textAlign: "center",
                        display: "block",
                        marginTop: "0.5rem",
                        background: syncMessages[w].includes("failed") ? "rgba(255, 56, 96, 0.08)" : "rgba(57, 255, 20, 0.08)",
                        padding: "0.4rem",
                        borderRadius: "4px",
                        border: syncMessages[w].includes("failed") ? "1px solid rgba(255, 56, 96, 0.2)" : "1px solid rgba(57, 255, 20, 0.2)"
                      }}>
                        {syncMessages[w]}
                      </span>
                    )}
                  </div>

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
                              {getLogValue(w, sNum, "synced") && (
                                <span className="badge badge-success" style={{
                                  background: "rgba(57, 255, 20, 0.1)",
                                  color: "var(--color-secondary)",
                                  border: "1px solid rgba(57, 255, 20, 0.2)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem"
                                }}>
                                  ⌚ Synced
                                </span>
                              )}
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
