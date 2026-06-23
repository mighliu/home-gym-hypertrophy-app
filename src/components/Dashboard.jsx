import { useState } from "react";
import { EXERCISE_DB } from "../data/database";
import { compareMesocycles } from "../data/analytics";

export default function Dashboard({
  workoutLogs,
  recoveryLogs,
  cardioLogs = {},
  slotOverrides,
  currentWeek = 1,
  currentMeso = 1,
  volumeLandmarks = {
    Chest: { mev: 8, mrv: 22 },
    Back: { mev: 8, mrv: 22 },
    Shoulders: { mev: 8, mrv: 22 },
    Quads: { mev: 8, mrv: 22 },
    "Hamstrings/Glutes": { mev: 8, mrv: 22 },
    Biceps: { mev: 6, mrv: 16 },
    Triceps: { mev: 6, mrv: 16 },
    Calves: { mev: 6, mrv: 16 },
    Abs: { mev: 6, mrv: 16 },
    Traps: { mev: 6, mrv: 16 }
  },
  sessionLogs = {}
}) {
  const [chartMode, setChartMode] = useState("meso"); // "meso" or "week"
  const [pacingMode, setPacingMode] = useState("duration"); // "duration" or "density"

  // Round 6: Mesocycle comparison selection
  const [mesoCompareA, setMesoCompareA] = useState(currentMeso);
  const [mesoCompareB, setMesoCompareB] = useState(currentMeso > 1 ? currentMeso - 1 : 1);

  // Round 6: Volume view mode toggle
  const [volumeViewMode, setVolumeViewMode] = useState("list"); // "list" or "radar"

  const getPacingStats = (sorted) => {
    if (sorted.length === 0) return { avgMin: 0, maxMin: 0, minMin: 0, avgDensity: 0, total: 0 };
    const durations = sorted.map(s => s.duration);
    const densities = sorted.map(s => s.density);
    const sumDuration = durations.reduce((a, b) => a + b, 0);
    const sumDensity = densities.reduce((a, b) => a + b, 0);
    return {
      avgMin: Math.round(sumDuration / sorted.length),
      maxMin: Math.round(Math.max(...durations)),
      minMin: Math.round(Math.min(...durations)),
      avgDensity: Math.round(sumDensity / sorted.length),
      total: sorted.length
    };
  };

  const sortedSessions = Object.entries(sessionLogs || {})
    .map(([key, data]) => {
      const parts = key.split("-");
      const mesoNum = parseInt(parts[0], 10);
      const weekNum = parseInt(parts[1], 10);
      const dayNum = parseInt(parts[2], 10);
      const durationMin = (data.duration || 0) / 60;
      const tonnage = data.tonnage || 0;
      const density = durationMin > 0 ? tonnage / durationMin : 0;
      return {
        key,
        label: `M${mesoNum}W${weekNum}D${dayNum}`,
        duration: parseFloat(durationMin.toFixed(1)),
        density: parseFloat(density.toFixed(0)),
        completedAt: data.completedAt || 0
      };
    })
    .filter((s) => s.duration > 0)
    .sort((a, b) => a.completedAt - b.completedAt);

  const pacingStats = getPacingStats(sortedSessions);

  // Tally of sets completed for the current week per muscle group
  const getMuscleGroupSets = () => {
    const muscleSets = {
      Chest: 0,
      Back: 0,
      Shoulders: 0,
      Quads: 0,
      "Hamstrings/Glutes": 0,
      Biceps: 0,
      Triceps: 0,
      Calves: 0,
      Abs: 0,
      Traps: 0
    };

    const patternToMuscleGroup = {
      "Incline Push": "Chest",
      "Horizontal Push": "Chest",
      "Chest Isolation": "Chest",
      
      "Horizontal Pull": "Back",
      "Vertical Pull": "Back",
      
      "Side Delts": "Shoulders",
      "Rear Delts": "Shoulders",
      "Front Delts / OHP": "Shoulders",
      
      "Quads": "Quads",
      "Quads (Unilateral)": "Quads",
      
      "Glutes/Hams (Hinge)": "Hamstrings/Glutes",
      "Hamstring Hinge": "Hamstrings/Glutes",
      "Hamstring Isolation": "Hamstrings/Glutes",
      
      "Biceps": "Biceps",
      "Triceps": "Triceps",
      "Calves": "Calves",
      "Abs": "Abs",
      "Traps": "Traps"
    };

    const exerciseToPattern = {};
    Object.entries(EXERCISE_DB).forEach(([pattern, details]) => {
      if (details.exercises) {
        details.exercises.forEach(ex => {
          exerciseToPattern[ex] = pattern;
        });
      }
    });

    Object.keys(workoutLogs).forEach(key => {
      const firstDash = key.indexOf("-");
      if (firstDash === -1) return;
      const secondDash = key.indexOf("-", firstDash + 1);
      if (secondDash === -1) return;
      const thirdDash = key.indexOf("-", secondDash + 1);
      if (thirdDash === -1) return;
      
      const m = key.substring(0, firstDash);
      const w = key.substring(firstDash + 1, secondDash);
      
      const lastDash = key.lastIndexOf("-");
      if (lastDash <= thirdDash) return;
      
      const exName = key.substring(thirdDash + 1, lastDash);
      
      if (m === String(currentMeso) && w === String(currentWeek)) {
        const log = workoutLogs[key];
        if (log && log.completed) {
          const pattern = exerciseToPattern[exName];
          if (pattern) {
            const muscleGroup = patternToMuscleGroup[pattern];
            if (muscleGroup && muscleSets[muscleGroup] !== undefined) {
              muscleSets[muscleGroup] += 1;
            }
          }
        }
      }
    });

    return muscleSets;
  };

  const muscleVolumeData = getMuscleGroupSets();

  // Define the core anchor slots
  const anchorSlots = [
    { key: "1-1-0", defaultName: "Incline Barbell Bench Press", muscle: "Chest / Shoulders", pattern: "Incline Push", mesoRow: 6 },
    { key: "1-2-0", defaultName: "High Bar Barbell Squat", muscle: "Quads / Glutes", pattern: "Quads", mesoRow: 20 },
    { key: "1-3-1", defaultName: "One-Arm Dumbbell Row", muscle: "Lats / Upper Back", pattern: "Horizontal Pull", mesoRow: 31 },
    { key: "1-4-0", defaultName: "Conventional Barbell Deadlift", muscle: "Posterior Chain", pattern: "Glutes/Hams (Hinge)", mesoRow: 44 },
    { key: "1-3-3", defaultName: "Standing Barbell Overhead Press", muscle: "Shoulders / Triceps", pattern: "Front Delts / OHP", mesoRow: 33 }
  ];

  // Helper to find the best e1RM for a specific exercise in a specific mesocycle
  const getBestE1rm = (exName, meso) => {
    let maxE1rm = 0;
    Object.keys(workoutLogs).forEach((key) => {
      // Key format: `${meso}-${week}-${day}-${exName}-${setIndex}`
      const parts = key.split("-");
      if (parts[0] === String(meso) && parts.slice(3, -1).join("-") === exName) {
        const log = workoutLogs[key];
        if (log.completed && log.weight && log.reps > 0) {
          const e1rm = Math.round(parseFloat(log.weight) * (1 + parseInt(log.reps) / 30));
          if (e1rm > maxE1rm) {
            maxE1rm = e1rm;
          }
        }
      }
    });
    return maxE1rm;
  };

  // Helper to find best e1RM in a specific week of 1-15 macrocycle
  const getWeeklyBestE1rm = (exName, w) => {
    const mesoVal = Math.floor((w - 1) / 5) + 1;
    const weekVal = ((w - 1) % 5) + 1;
    let maxE1rm = 0;
    Object.keys(workoutLogs).forEach((key) => {
      const parts = key.split("-");
      if (parts[0] === String(mesoVal) && parts[1] === String(weekVal) && parts.slice(3, -1).join("-") === exName) {
        const log = workoutLogs[key];
        if (log.completed && log.weight && log.reps > 0) {
          const e1rm = Math.round(parseFloat(log.weight) * (1 + parseInt(log.reps) / 30));
          if (e1rm > maxE1rm) {
            maxE1rm = e1rm;
          }
        }
      }
    });
    return maxE1rm;
  };

  const getRepRange = (pattern) => {
    return EXERCISE_DB[pattern]?.rr || "8-10";
  };

  // Process data for each anchor lift
  const anchorsData = anchorSlots.map((slot) => {
    const currentName = slotOverrides[slot.key]?.exercise || slot.defaultName;
    const m1Best = getBestE1rm(currentName, 1);
    const m2Best = getBestE1rm(currentName, 2);
    const m3Best = getBestE1rm(currentName, 3);

    let trend = "Awaiting Data";
    let trendClass = "";
    if (m1Best > 0 && m3Best > 0) {
      if (m3Best > m1Best) {
        trend = "↑ Progressing (M1→M3)";
        trendClass = "trend-up";
      } else if (m3Best < m1Best) {
        trend = "↓ Stalled (M1→M3)";
        trendClass = "trend-down";
      } else {
        trend = "● Stable (M1→M3)";
        trendClass = "trend-stable";
      }
    } else if (m1Best > 0 && m2Best > 0) {
      if (m2Best > m1Best) {
        trend = "↑ Progressing (M1→M2)";
        trendClass = "trend-up";
      } else if (m2Best < m1Best) {
        trend = "↓ Stalled (M1→M2)";
        trendClass = "trend-down";
      } else {
        trend = "● Stable (M1→M2)";
        trendClass = "trend-stable";
      }
    }

    return {
      name: currentName,
      muscle: slot.muscle,
      pattern: slot.pattern,
      m1: m1Best,
      m2: m2Best,
      m3: m3Best,
      trend,
      trendClass,
      targetReps: `${getRepRange(slot.pattern)} reps`
    };
  });

  const getRollingAverages = () => {
    const sorted = [...recoveryLogs].sort((a, b) => b.timestamp - a.timestamp);
    const last7 = sorted.slice(0, 7);
    if (last7.length === 0) return { sleep: 0, fatigue: 0, rhr: 0, hrv: 0, count: 0, rhrCount: 0, hrvCount: 0 };
    
    const sleepSum = last7.reduce((acc, log) => acc + log.sleep, 0);
    const fatigueSum = last7.reduce((acc, log) => acc + log.fatigue, 0);
    
    const rhrLogs = last7.filter(log => log.rhr !== undefined && log.rhr !== null);
    const hrvLogs = last7.filter(log => log.hrv !== undefined && log.hrv !== null);
    
    const rhrSum = rhrLogs.reduce((acc, log) => acc + log.rhr, 0);
    const hrvSum = hrvLogs.reduce((acc, log) => acc + log.hrv, 0);
    
    return {
      sleep: sleepSum / last7.length,
      fatigue: fatigueSum / last7.length,
      rhr: rhrLogs.length > 0 ? rhrSum / rhrLogs.length : 0,
      hrv: hrvLogs.length > 0 ? hrvSum / hrvLogs.length : 0,
      count: last7.length,
      rhrCount: rhrLogs.length,
      hrvCount: hrvLogs.length
    };
  };

  const rolling = getRollingAverages();

  const getCoachingAdvice = () => {
    if (rolling.count < 3) {
      return {
        text: "📊 AWAITING DATA: Log at least 3 days of sleep and fatigue in the Recovery tab to unlock dynamic coaching advice.",
        status: "pending"
      };
    }

    const { sleep, fatigue, rhr, hrv, rhrCount, hrvCount } = rolling;
    
    const hasRhrStrain = rhrCount >= 2 && rhr > 75;
    const hasHrvStrain = hrvCount >= 2 && hrv < 45;
    const hasSevereVitalsStrain = hasRhrStrain && hasHrvStrain;
    const hasAnyVitalsStrain = hasRhrStrain || hasHrvStrain;

    if (fatigue >= 4.0 && (sleep <= 2.0 || hasSevereVitalsStrain)) {
      return {
        text: `🚨 CRITICAL CNS FATIGUE: High subjective fatigue (${fatigue.toFixed(1)}/5), poor sleep, and critical autonomic strain detected (RHR: ${rhrCount > 0 ? Math.round(rhr) + " bpm" : "N/A"}, HRV: ${hrvCount > 0 ? Math.round(hrv) + " ms" : "N/A"}). We recommend an early Deload or cutting training volume by 50% immediately.`,
        status: "critical"
      };
    } else if (fatigue >= 4.0 || hasSevereVitalsStrain) {
      let vitalsWarning = hasSevereVitalsStrain ? " with severe vitals strain (RHR elevated & HRV depressed)" : "";
      return {
        text: `⚠️ CNS FATIGUE WARNING: High autonomic/systemic strain detected${vitalsWarning} (Fatigue: ${fatigue.toFixed(1)}/5, RHR: ${rhrCount > 0 ? Math.round(rhr) + " bpm" : "—"}, HRV: ${hrvCount > 0 ? Math.round(hrv) + " ms" : "—"}). Ensure you are taking rest seriously and consider scaling back set volume on your compound lifts.`,
        status: "warning"
      };
    } else if (sleep <= 2.0 || hasAnyVitalsStrain) {
      let reason = sleep <= 2.0 ? "critically low sleep quality" : "";
      if (hasRhrStrain && hasHrvStrain) {
        reason += (reason ? " and " : "") + "severe autonomic strain (elevated resting heart rate & depressed HRV)";
      } else if (hasRhrStrain) {
        reason += (reason ? " and " : "") + "elevated resting heart rate (>75 bpm)";
      } else if (hasHrvStrain) {
        reason += (reason ? " and " : "") + "depressed HRV (<45 ms)";
      }
      return {
        text: `😴 AUTONOMIC RECOVERY WARNING: Mild autonomic strain detected (${reason}). Sleep: ${sleep.toFixed(1)}/5, RHR: ${rhrCount > 0 ? Math.round(rhr) + " bpm" : "—"}, HRV: ${hrvCount > 0 ? Math.round(hrv) + " ms" : "—"}. Focus on sleep hygiene, hydration, and nutrition.`,
        status: "warning"
      };
    } else {
      let vitalsStatus = "";
      if (rhrCount >= 2 && hrvCount >= 2) {
        vitalsStatus = ` (RHR: ${Math.round(rhr)} bpm, HRV: ${Math.round(hrv)} ms are in optimal zones)`;
      }
      return {
        text: `✅ GREEN LIGHT: Fatigue, sleep, and objective vitals are in optimal ranges${vitalsStatus}. You are cleared to train with high intensity and progress according to your RIR targets!`,
        status: "good"
      };
    }
  };

  const advice = getCoachingAdvice();

  // Draw SVG chart with dynamic Meso vs. Weekly view modes
  const renderChart = () => {
    const activeLifts = anchorsData.filter(d => d.m1 > 0 || d.m2 > 0 || d.m3 > 0);
    if (activeLifts.length === 0) {
      return (
        <div className="chart-placeholder">
          <p>Chart will appear here once you log sets for at least one anchor lift.</p>
        </div>
      );
    }

    const chartWidth = 650;
    const chartHeight = 220;
    const padding = 40;

    // Find overall max e1RM to scale Y axis
    let overallMax = 100;
    activeLifts.forEach(d => {
      if (chartMode === "meso") {
        const maxVal = Math.max(d.m1, d.m2, d.m3);
        if (maxVal > overallMax) overallMax = maxVal;
      } else {
        for (let w = 1; w <= 15; w++) {
          const val = getWeeklyBestE1rm(d.name, w);
          if (val > overallMax) overallMax = val;
        }
      }
    });
    overallMax = Math.ceil((overallMax * 1.1) / 20) * 20;

    const getX = (idx) => {
      const drawableWidth = chartWidth - padding * 2;
      if (chartMode === "meso") {
        return padding + (idx * drawableWidth) / 2;
      } else {
        return padding + (idx * drawableWidth) / 14;
      }
    };

    const getY = (val) => {
      if (val === 0) return chartHeight - padding;
      const drawableHeight = chartHeight - padding * 2;
      return chartHeight - padding - (val * drawableHeight) / overallMax;
    };

    const lineColors = ["#00f2fe", "#39ff14", "#b026ff", "#ffb800", "#ff3860"];

    return (
      <div className="svg-chart-container">
        <svg className="svg-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          {/* Y Axis Grid Lines & Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const val = Math.round(overallMax * ratio);
            const y = getY(val);
            return (
              <g key={idx} className="grid-line-group">
                <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="var(--border-color)" strokeWidth="1" />
                <text x={padding - 10} y={y + 4} fill="var(--color-text-muted)" fontSize="10" textAnchor="end">{val}</text>
              </g>
            );
          })}

          {/* X Axis Labels */}
          {chartMode === "meso" ? (
            ["Meso 1", "Meso 2", "Meso 3"].map((label, idx) => {
              const x = getX(idx);
              return (
                <text key={idx} x={x} y={chartHeight - 10} fill="var(--color-text-muted)" fontSize="11" textAnchor="middle">{label}</text>
              );
            })
          ) : (
            Array.from({ length: 15 }).map((_, idx) => {
              const wNum = idx + 1;
              const x = getX(idx);
              const showLabel = wNum === 1 || wNum === 15 || wNum % 2 !== 0;
              return (
                <g key={wNum}>
                  <line x1={x} y1={padding} x2={x} y2={chartHeight - padding} stroke="var(--border-color)" strokeWidth="1" />
                  {showLabel && (
                    <text x={x} y={chartHeight - 10} fill="var(--color-text-muted)" fontSize="9" textAnchor="middle">W{wNum}</text>
                  )}
                </g>
              );
            })
          )}

          {/* Lines for each active lift */}
          {activeLifts.map((lift, idx) => {
            const points = [];
            if (chartMode === "meso") {
              if (lift.m1 > 0) points.push({ x: getX(0), y: getY(lift.m1), val: lift.m1 });
              if (lift.m2 > 0) points.push({ x: getX(1), y: getY(lift.m2), val: lift.m2 });
              if (lift.m3 > 0) points.push({ x: getX(2), y: getY(lift.m3), val: lift.m3 });
            } else {
              for (let w = 1; w <= 15; w++) {
                const val = getWeeklyBestE1rm(lift.name, w);
                if (val > 0) {
                  points.push({ x: getX(w - 1), y: getY(val), val });
                }
              }
            }

            if (points.length < 2) {
              return (
                <g key={idx}>
                  {points.map((p, pIdx) => (
                    <circle key={pIdx} cx={p.x} cy={p.y} r="4" fill={lineColors[idx % lineColors.length]} />
                  ))}
                </g>
              );
            }

            const pathData = points.reduce((acc, p, pIdx) => {
              return acc + `${pIdx === 0 ? "M" : "L"} ${p.x} ${p.y} `;
            }, "");

            return (
              <g key={idx}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={lineColors[idx % lineColors.length]}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="chart-path"
                />
                {points.map((p, pIdx) => {
                  const labelOffset = chartMode === "week" ? 8 : 10;
                  const labelSize = chartMode === "week" ? 8 : 9;
                  return (
                    <g key={pIdx}>
                      <circle cx={p.x} cy={p.y} r="4" fill="var(--bg-card-solid)" stroke={lineColors[idx % lineColors.length]} strokeWidth="2.5" />
                      {/* Render text labels values slightly above points */}
                      <text x={p.x} y={p.y - labelOffset} fill="var(--color-text-main)" fontSize={labelSize} fontWeight="bold" textAnchor="middle">{p.val}</text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
        
        {/* Legend */}
        <div className="chart-legend">
          {activeLifts.map((lift, idx) => (
            <div key={idx} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: lineColors[idx % lineColors.length] }}></span>
              <span className="legend-text">{lift.name.split(" ")[0]}.. ({lift.muscle.split(" ")[0]})</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBodyweightChart = () => {
    const validLogs = [...recoveryLogs]
      .filter((log) => log.weight)
      .sort((a, b) => a.timestamp - b.timestamp);

    const chartLogs = validLogs.slice(-30);

    if (chartLogs.length === 0) {
      return (
        <div className="chart-placeholder" style={{ padding: "3rem 1rem", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-muted)" }}>No bodyweight logs recorded yet. Log your weight in the Recovery tab to see the trend.</p>
        </div>
      );
    }

    const weights = chartLogs.map((log) => log.weight);
    const minWt = Math.min(...weights) - 2;
    const maxWt = Math.max(...weights) + 2;
    const wtRange = maxWt - minWt;

    const chartWidth = 600;
    const chartHeight = 220;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 40;

    const getX = (idx) => {
      const drawableWidth = chartWidth - paddingLeft - paddingRight;
      if (chartLogs.length === 1) return paddingLeft + drawableWidth / 2;
      return paddingLeft + (idx * drawableWidth) / (chartLogs.length - 1);
    };

    const getY = (val) => {
      const drawableHeight = chartHeight - paddingTop - paddingBottom;
      return chartHeight - paddingBottom - ((val - minWt) * drawableHeight) / wtRange;
    };

    const points = chartLogs.map((log, idx) => ({
      x: getX(idx),
      y: getY(log.weight),
      weight: log.weight,
      date: log.displayDate || log.date.substring(5),
    }));

    const pathData = points.reduce((acc, p, idx) => {
      return acc + `${idx === 0 ? "M" : "L"} ${p.x} ${p.y} `;
    }, "");

    const gridTicks = 4;
    const yTicks = [];
    for (let i = 0; i <= gridTicks; i++) {
      yTicks.push(minWt + (wtRange * i) / gridTicks);
    }

    return (
      <div className="svg-chart-container">
        <svg className="svg-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          {yTicks.map((val, idx) => {
            const y = getY(val);
            return (
              <g key={idx} className="grid-line-group">
                <line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke="var(--border-color)" strokeWidth="1" />
                <text x={paddingLeft - 8} y={y + 4} fill="var(--color-text-muted)" fontSize="10" textAnchor="end">{val.toFixed(1)}</text>
              </g>
            );
          })}

          {points.map((p, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === points.length - 1;
            const isMiddle = idx === Math.floor(points.length / 2);
            if (!isFirst && !isLast && !isMiddle) return null;

            return (
              <text key={idx} x={p.x} y={chartHeight - 10} fill="var(--color-text-muted)" fontSize="9" textAnchor="middle">
                {p.date}
              </text>
            );
          })}

          {points.length > 1 && (
            <path
              d={pathData}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="chart-path"
            />
          )}

          {points.map((p, idx) => (
            <g key={idx}>
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill="var(--bg-card-solid)"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
              />
              {(idx === points.length - 1 || idx === 0) && (
                <text
                  x={p.x}
                  y={p.y - 10}
                  fill="var(--color-text-main)"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {p.weight}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const pagingValueFormatted = (val) => {
    if (pacingMode === "duration") {
      return `${val.toFixed(1)}m`;
    }
    return `${val.toFixed(0)}`;
  };

  const renderPacingChart = () => {
    const chartSessions = sortedSessions.slice(-20);

    if (chartSessions.length === 0) {
      return (
        <div className="chart-placeholder" style={{ padding: "3rem 1rem", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-muted)" }}>
            No training session time logs recorded yet. Complete a full workout day to see your duration and pacing trends.
          </p>
        </div>
      );
    }

    const values = chartSessions.map((s) => pacingMode === "duration" ? s.duration : s.density);
    const minVal = Math.max(0, Math.min(...values) * 0.9);
    const maxVal = Math.max(10, Math.max(...values) * 1.1);
    const valRange = maxVal - minVal;

    const chartWidth = 600;
    const chartHeight = 220;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 40;

    const getX = (idx) => {
      const drawableWidth = chartWidth - paddingLeft - paddingRight;
      if (chartSessions.length === 1) return paddingLeft + drawableWidth / 2;
      return paddingLeft + (idx * drawableWidth) / (chartSessions.length - 1);
    };

    const getY = (val) => {
      const drawableHeight = chartHeight - paddingTop - paddingBottom;
      return chartHeight - paddingBottom - ((val - minVal) * drawableHeight) / valRange;
    };

    const points = chartSessions.map((s, idx) => ({
      x: getX(idx),
      y: getY(pacingMode === "duration" ? s.duration : s.density),
      val: pacingMode === "duration" ? s.duration : s.density,
      label: s.label
    }));

    const pathData = points.reduce((acc, p, idx) => {
      return acc + `${idx === 0 ? "M" : "L"} ${p.x} ${p.y} `;
    }, "");

    const gridTicks = 4;
    const yTicks = [];
    for (let i = 0; i <= gridTicks; i++) {
      yTicks.push(minVal + (valRange * i) / gridTicks);
    }

    return (
      <div className="svg-chart-container">
        <svg className="svg-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          {yTicks.map((val, idx) => {
            const y = getY(val);
            const displayVal = pacingMode === "duration" ? `${val.toFixed(0)}m` : `${val.toFixed(0)}`;
            return (
              <g key={idx} className="grid-line-group">
                <line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke="var(--border-color)" strokeWidth="1" />
                <text x={paddingLeft - 8} y={y + 4} fill="var(--color-text-muted)" fontSize="10" textAnchor="end">{displayVal}</text>
              </g>
            );
          })}

          {points.map((p, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === points.length - 1;
            const isMiddle = idx === Math.floor(points.length / 2);
            if (!isFirst && !isLast && !isMiddle) return null;

            return (
              <text key={idx} x={p.x} y={chartHeight - 10} fill="var(--color-text-muted)" fontSize="9" textAnchor="middle">
                {p.label}
              </text>
            );
          })}

          {points.length > 1 && (
            <path
              d={pathData}
              fill="none"
              stroke={pacingMode === "duration" ? "var(--color-primary)" : "var(--color-secondary)"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="chart-path"
            />
          )}

          {points.map((p, idx) => (
            <g key={idx}>
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill="var(--bg-card-solid)"
                stroke={pacingMode === "duration" ? "var(--color-primary)" : "var(--color-secondary)"}
                strokeWidth="2.5"
              />
              {(idx === points.length - 1 || idx === 0) && (
                <text
                  x={p.x}
                  y={p.y - 10}
                  fill="var(--color-text-main)"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {pagingValueFormatted(p.val)}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const renderMesoComparison = () => {
    const comp = compareMesocycles(workoutLogs, recoveryLogs, sessionLogs, cardioLogs, mesoCompareB, mesoCompareA);
    
    const getDeltaColor = (delta) => {
      if (delta.direction === "up") return "var(--color-secondary)";
      if (delta.direction === "down") return "var(--color-error)";
      return "var(--color-text-muted)";
    };
    
    const getDeltaArrow = (delta) => {
      if (delta.direction === "up") return "▲";
      if (delta.direction === "down") return "▼";
      return "●";
    };

    return (
      <div className="card meso-comparison-card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-header-row compare-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="card-icon" style={{ fontSize: "1.25rem" }}>🔄</span>
            <div className="card-title" style={{ margin: "0" }}>Mesocycle Comparison Dashboard</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <select
              className="form-select compare-select"
              value={mesoCompareA}
              onChange={(e) => setMesoCompareA(parseInt(e.target.value))}
              style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem", borderRadius: "6px" }}
            >
              <option value={1}>Meso 1</option>
              <option value={2}>Meso 2</option>
              <option value={3}>Meso 3</option>
            </select>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>vs</span>
            <select
              className="form-select compare-select"
              value={mesoCompareB}
              onChange={(e) => setMesoCompareB(parseInt(e.target.value))}
              style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem", borderRadius: "6px" }}
            >
              <option value={1}>Meso 1</option>
              <option value={2}>Meso 2</option>
              <option value={3}>Meso 3</option>
            </select>
          </div>
        </div>

        <div className="comparison-grid">
          <div className="comp-item">
            <span className="comp-label">Weekly Tonnage</span>
            <div className="comp-values">
              <span className="comp-val">{Math.round(comp.m1.avgWeeklyTonnage).toLocaleString()} lbs</span>
              <span className="comp-arrow">&rarr;</span>
              <span className="comp-val highlight">{Math.round(comp.m2.avgWeeklyTonnage).toLocaleString()} lbs</span>
              <span className="comp-delta" style={{ color: getDeltaColor(comp.deltas.tonnage) }}>
                {getDeltaArrow(comp.deltas.tonnage)} {comp.deltas.tonnage.text}
              </span>
            </div>
          </div>

          <div className="comp-item">
            <span className="comp-label">Avg Readiness</span>
            <div className="comp-values">
              <span className="comp-val">{Math.round(comp.m1.avgReadiness)}</span>
              <span className="comp-arrow">&rarr;</span>
              <span className="comp-val highlight">{Math.round(comp.m2.avgReadiness)}</span>
              <span className="comp-delta" style={{ color: getDeltaColor(comp.deltas.readiness) }}>
                {getDeltaArrow(comp.deltas.readiness)} {comp.deltas.readiness.text}
              </span>
            </div>
          </div>

          <div className="comp-item">
            <span className="comp-label">Anchor e1RM</span>
            <div className="comp-values">
              <span className="comp-val">{Math.round(comp.m1.avgE1RM)} lbs</span>
              <span className="comp-arrow">&rarr;</span>
              <span className="comp-val highlight">{Math.round(comp.m2.avgE1RM)} lbs</span>
              <span className="comp-delta" style={{ color: getDeltaColor(comp.deltas.e1rm) }}>
                {getDeltaArrow(comp.deltas.e1rm)} {comp.deltas.e1rm.text}
              </span>
            </div>
          </div>

          <div className="comp-item">
            <span className="comp-label">Sleep Quality</span>
            <div className="comp-values">
              <span className="comp-val">{comp.m1.avgSleep.toFixed(1)}/5</span>
              <span className="comp-arrow">&rarr;</span>
              <span className="comp-val highlight">{comp.m2.avgSleep.toFixed(1)}/5</span>
              <span className="comp-delta" style={{ color: getDeltaColor(comp.deltas.sleep) }}>
                {getDeltaArrow(comp.deltas.sleep)} {comp.deltas.sleep.text}
              </span>
            </div>
          </div>

          <div className="comp-item">
            <span className="comp-label">Weight Change</span>
            <div className="comp-values">
              <span className="comp-val">{comp.m1.weightChange >= 0 ? "+" : ""}{comp.m1.weightChange.toFixed(1)} lbs</span>
              <span className="comp-arrow">&rarr;</span>
              <span className="comp-val highlight">{comp.m2.weightChange >= 0 ? "+" : ""}{comp.m2.weightChange.toFixed(1)} lbs</span>
              <span className="comp-delta" style={{ color: comp.deltas.weightChangeDiff >= 0 ? "var(--color-secondary)" : "var(--color-warning)" }}>
                {comp.deltas.weightChangeDiff >= 0 ? `+${comp.deltas.weightChangeDiff.toFixed(1)}` : comp.deltas.weightChangeDiff.toFixed(1)} lbs
              </span>
            </div>
          </div>

          <div className="comp-item">
            <span className="comp-label">Cardio Minutes</span>
            <div className="comp-values">
              <span className="comp-val">{comp.m1.totalCardioMin} min</span>
              <span className="comp-arrow">&rarr;</span>
              <span className="comp-val highlight">{comp.m2.totalCardioMin} min</span>
              <span className="comp-delta" style={{ color: getDeltaColor(comp.deltas.cardio) }}>
                {getDeltaArrow(comp.deltas.cardio)} {comp.deltas.cardio.text}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRadarChart = () => {
    const muscles = [
      "Chest",
      "Back",
      "Shoulders",
      "Quads",
      "Hamstrings/Glutes",
      "Biceps",
      "Triceps",
      "Calves",
      "Abs",
      "Traps"
    ];

    const cx = 180;
    const cy = 135;
    const maxRadius = 100;
    const mevRadius = 50;
    const angleStep = (2 * Math.PI) / muscles.length;

    const getCoordinates = (radius, angle) => {
      return {
        x: cx + radius * Math.cos(angle - Math.PI / 2),
        y: cy + radius * Math.sin(angle - Math.PI / 2)
      };
    };

    const userPoints = muscles.map((muscle, i) => {
      const completed = muscleVolumeData[muscle] || 0;
      const isMain = ["Chest", "Back", "Shoulders", "Quads", "Hamstrings/Glutes"].includes(muscle);
      const landmark = volumeLandmarks?.[muscle] || { mev: isMain ? 8 : 6, mrv: isMain ? 22 : 16 };
      const mev = landmark.mev;
      const mrv = landmark.mrv;

      let radius;
      if (completed === 0) {
        radius = 0;
      } else if (completed <= mev) {
        radius = (completed / mev) * mevRadius;
      } else if (completed <= mrv) {
        radius = mevRadius + ((completed - mev) / (mrv - mev)) * (maxRadius - mevRadius);
      } else {
        radius = maxRadius + Math.min(20, ((completed - mrv) / mrv) * (maxRadius - mevRadius));
      }

      const { x, y } = getCoordinates(radius, i * angleStep);
      
      let color = "var(--color-error)";
      if (completed >= mrv) {
        color = "var(--color-warning)";
      } else if (completed >= mev) {
        color = "var(--color-secondary)";
      }

      return { x, y, label: completed, color, muscle };
    });

    const userPath = userPoints.map(p => `${p.x},${p.y}`).join(" ");

    const mevRingPoints = muscles.map((_, i) => {
      const { x, y } = getCoordinates(mevRadius, i * angleStep);
      return `${x},${y}`;
    }).join(" ");

    const mrvRingPoints = muscles.map((_, i) => {
      const { x, y } = getCoordinates(maxRadius, i * angleStep);
      return `${x},${y}`;
    }).join(" ");

    return (
      <div className="radar-chart-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "280px" }}>
        <svg width="360" height="280" viewBox="0 0 360 280" className="radar-svg">
          <polygon points={mrvRingPoints} className="radar-grid-outer" fill="rgba(0,0,0,0.2)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <polygon points={mevRingPoints} className="radar-grid-inner" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />
          
          {muscles.map((muscle, i) => {
            const angle = i * angleStep;
            const endCoords = getCoordinates(maxRadius, angle);
            const labelCoords = getCoordinates(maxRadius + 22, angle);

            return (
              <g key={muscle}>
                <line x1={cx} y1={cy} x2={endCoords.x} y2={endCoords.y} className="radar-spoke" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                <text
                  x={labelCoords.x}
                  y={labelCoords.y + 3}
                  textAnchor="middle"
                  className="radar-label"
                  fontSize="8"
                  fill="var(--color-text-muted)"
                  fontWeight="bold"
                >
                  {muscle}
                </text>
              </g>
            );
          })}

          {userPath && (
            <polygon points={userPath} className="radar-user-area" fill="rgba(0, 242, 254, 0.15)" stroke="var(--color-primary)" strokeWidth="2" />
          )}

          {userPoints.map((p, idx) => (
            <g key={idx}>
              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill={p.color}
                stroke="var(--bg-card-solid)"
                strokeWidth="1.5"
                className="radar-dot"
              />
              {p.label > 0 && (
                <text
                  x={p.x}
                  y={p.y - 8}
                  fill="white"
                  fontSize="8"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {p.label}
                </text>
              )}
            </g>
          ))}
          
          <g transform="translate(10, 265)">
            <circle cx="5" cy="5" r="3.5" fill="var(--color-secondary)" />
            <text x="12" y="8" fontSize="8" fill="var(--color-text-muted)">MEV-MRV</text>
            <circle cx="70" cy="5" r="3.5" fill="var(--color-error)" />
            <text x="77" y="8" fontSize="8" fill="var(--color-text-muted)">&lt; MEV</text>
            <circle cx="120" cy="5" r="3.5" fill="var(--color-warning)" />
            <text x="127" y="8" fontSize="8" fill="var(--color-text-muted)">&gt;= MRV</text>
          </g>
        </svg>
      </div>
    );
  };

  return (
    <div className="dashboard-tab animated">
      {/* MESOCYCLE COMPARISON */}
      {renderMesoComparison()}
      {/* HEADER CARDS: ROLLING AVERAGES & DYNAMIC COACHING */}
      <div className={rolling.rhrCount > 0 || rolling.hrvCount > 0 ? "vitals-dashboard-header has-vitals" : "vitals-dashboard-header no-vitals"}>
        <div className="card metric-mini-card">
          <span className="mini-label">Fatigue (7-Day Roll)</span>
          <span className="mini-value">{rolling.count > 0 ? rolling.fatigue.toFixed(1) : "—"} <span className="mini-slash">/ 5</span></span>
          <span className="mini-desc">Target: &lt; 3.5 for continuous progress</span>
        </div>
        <div className="card metric-mini-card">
          <span className="mini-label">Sleep (7-Day Roll)</span>
          <span className="mini-value">{rolling.count > 0 ? rolling.sleep.toFixed(1) : "—"} <span className="mini-slash">/ 5</span></span>
          <span className="mini-desc">Target: &gt; 3.0 for nervous recovery</span>
        </div>
        
        {(rolling.rhrCount > 0 || rolling.hrvCount > 0) && (
          <>
            <div className="card metric-mini-card">
              <span className="mini-label">RHR (7-Day Roll)</span>
              <span className="mini-value">{rolling.rhrCount > 0 ? Math.round(rolling.rhr) : "—"} <span className="mini-slash">bpm</span></span>
              <span className="mini-desc" style={{ color: rolling.rhr > 75 ? "var(--color-warning)" : "var(--color-secondary)" }}>
                {rolling.rhr > 75 ? "⚠️ Elevated strain" : "✅ Optimal autonomic state"}
              </span>
            </div>
            <div className="card metric-mini-card">
              <span className="mini-label">HRV (7-Day Roll)</span>
              <span className="mini-value">{rolling.hrvCount > 0 ? Math.round(rolling.hrv) : "—"} <span className="mini-slash">ms</span></span>
              <span className="mini-desc" style={{ color: rolling.hrv < 45 ? "var(--color-warning)" : "var(--color-secondary)" }}>
                {rolling.hrv < 45 ? "⚠️ Depressed response" : "✅ Good nervous adaptation"}
              </span>
            </div>
          </>
        )}
        
        <div className={`card advice-card advice-${advice.status} ${rolling.rhrCount > 0 || rolling.hrvCount > 0 ? "advice-card-full" : ""}`}>
          <span className="mini-label">Recovery Coach Advice</span>
          <p className="advice-text">{advice.text}</p>
        </div>
      </div>

      {/* CORE ANCHORS TABLE & CHART */}
      <div className="grid-2">
        {/* TABLE */}
        <div className="card table-card-dash">
          <div className="card-title">Core Anchor Lifts Progress</div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lift Name</th>
                  <th>Meso 1</th>
                  <th>Meso 2</th>
                  <th>Meso 3</th>
                  <th>Trend</th>
                  <th>Target Reps</th>
                </tr>
              </thead>
              <tbody>
                {anchorsData.map((row) => (
                  <tr key={row.name}>
                    <td className="bold-text">
                      <div className="anchor-name-td">{row.name}</div>
                      <div className="anchor-muscle-td">{row.muscle}</div>
                    </td>
                    <td className="center-text">{row.m1 > 0 ? `${row.m1} lbs` : "—"}</td>
                    <td className="center-text">{row.m2 > 0 ? `${row.m2} lbs` : "—"}</td>
                    <td className="center-text">{row.m3 > 0 ? `${row.m3} lbs` : "—"}</td>
                    <td>
                      <span className={`trend-label ${row.trendClass}`}>
                        {row.trend.split(" ")[0]} {row.trend.split(" ").slice(1).join(" ")}
                      </span>
                    </td>
                    <td><span className="badge badge-teal">{row.targetReps}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CHART WITH TOGGLES */}
        <div className="card chart-card-dash">
          <div className="chart-header-row">
            <div className="card-title">e1RM Progression Curve</div>
            <div className="chart-mode-toggles">
              <button
                type="button"
                className={`toggle-mode-btn ${chartMode === "meso" ? "active" : ""}`}
                onClick={() => setChartMode("meso")}
              >
                Meso View
              </button>
              <button
                type="button"
                className={`toggle-mode-btn ${chartMode === "week" ? "active" : ""}`}
                onClick={() => setChartMode("week")}
              >
                Weekly View
              </button>
            </div>
          </div>
          {renderChart()}
        </div>
      </div>

      {/* SECOND GRID FOR VOLUME & BODYWEIGHT */}
      <div className="grid-2" style={{ marginTop: "1.5rem" }}>
        {/* WEEKLY VOLUME LANDMARKS */}
        <div className="card volume-landmarks-card" style={{ margin: "0" }}>
          <div className="landmarks-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="card-title">Weekly Volume Landmarks</div>
            <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
              <button
                type="button"
                className={`toggle-mode-btn ${volumeViewMode === "list" ? "active" : ""}`}
                onClick={() => setVolumeViewMode("list")}
                style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
              >
                List
              </button>
              <button
                type="button"
                className={`toggle-mode-btn ${volumeViewMode === "radar" ? "active" : ""}`}
                onClick={() => setVolumeViewMode("radar")}
                style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
              >
                Radar
              </button>
            </div>
          </div>
          <p className="landmarks-subtitle">
            Tally of completed sets for the active week compared to Minimum Effective Volume (MEV) and Maximum Recoverable Volume (MRV) targets.
          </p>
          
          {volumeViewMode === "list" ? (
            <div className="landmarks-grid">
            {Object.entries(muscleVolumeData).map(([muscle, completed]) => {
              const isMain = ["Chest", "Back", "Shoulders", "Quads", "Hamstrings/Glutes"].includes(muscle);
              const landmark = volumeLandmarks?.[muscle] || { mev: isMain ? 8 : 6, mrv: isMain ? 22 : 16 };
              const mev = landmark.mev;
              const mrv = landmark.mrv;
              
              const scaleMax = Math.max(completed, mrv * 1.15);
              const completedPct = Math.min(100, (completed / scaleMax) * 100);
              const mevPct = (mev / scaleMax) * 100;
              const mrvPct = (mrv / scaleMax) * 100;
              
              let barClass = "bar-under-mev";
              let statusLabel = "Under MEV";
              if (completed >= mrv) {
                barClass = "bar-over-mrv";
                statusLabel = "Over MRV";
              } else if (completed >= mev) {
                barClass = "bar-sweet-spot";
                statusLabel = "Sweet Spot";
              }
              
              return (
                <div key={muscle} className="landmark-item">
                  <div className="landmark-meta">
                    <span className="landmark-muscle-name">{muscle}</span>
                    <div className="landmark-status-group">
                      <span className={`landmark-status-badge ${barClass}`}>{statusLabel}</span>
                      <span className="landmark-sets-count"><strong>{completed}</strong> / {mev}-{mrv} sets</span>
                    </div>
                  </div>
                  
                  <div className="landmark-bar-container">
                    <div className="landmark-bar-track">
                      <div 
                        className={`landmark-bar-fill ${barClass}`} 
                        style={{ width: `${completedPct}%` }}
                      />
                      
                      {/* MEV Marker */}
                      <div 
                        className="landmark-marker marker-mev" 
                        style={{ left: `${mevPct}%` }}
                        title={`MEV: ${mev} sets`}
                      >
                        <span className="marker-label">MEV</span>
                      </div>
                      
                      {/* MRV Marker */}
                      <div 
                        className="landmark-marker marker-mrv" 
                        style={{ left: `${mrvPct}%` }}
                        title={`MRV: ${mrv} sets`}
                      >
                        <span className="marker-label">MRV</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          ) : (
            renderRadarChart()
          )}
        </div>

        {/* BODYWEIGHT TREND CARD */}
        <div className="card chart-card-dash" style={{ margin: "0" }}>
          <div className="chart-header-row">
            <div className="card-title">AM Bodyweight Trend (Last 30 Logs)</div>
            <span className="badge badge-teal">Daily Logged Weight</span>
          </div>
          {renderBodyweightChart()}
        </div>
      </div>

      {/* THIRD GRID FOR WORKOUT PACING & TIME TRENDS */}
      <div className="grid-2" style={{ marginTop: "1.5rem" }}>
        {/* PACING CHART */}
        <div className="card chart-card-dash" style={{ margin: "0" }}>
          <div className="chart-header-row">
            <div className="card-title">Workout Pacing & Time Trends</div>
            <div className="chart-mode-toggles">
              <button
                type="button"
                className={`toggle-mode-btn ${pacingMode === "duration" ? "active" : ""}`}
                onClick={() => setPacingMode("duration")}
              >
                Duration (m)
              </button>
              <button
                type="button"
                className={`toggle-mode-btn ${pacingMode === "density" ? "active" : ""}`}
                onClick={() => setPacingMode("density")}
              >
                Density (lbs/m)
              </button>
            </div>
          </div>
          {renderPacingChart()}
        </div>

        {/* PACING STATS */}
        <div className="card volume-landmarks-card" style={{ margin: "0", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div className="landmarks-header" style={{ marginBottom: "1rem" }}>
              <div className="card-title">Time & Pacing Analytics</div>
              <span className="badge badge-purple">Macrocycle Summary</span>
            </div>
            <p className="landmarks-subtitle" style={{ marginBottom: "1.5rem" }}>
              Key performance indicators tracking your workout density, session pacing, and time efficiency.
            </p>
            
            {sortedSessions.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Average Session Time</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--color-text-main)" }}>{pacingStats.avgMin} minutes</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Time Range (Shortest / Longest)</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--color-text-main)" }}>{pacingStats.minMin}m / {pacingStats.maxMin}m</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Average Training Density</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--color-secondary)" }}>{pacingStats.avgDensity.toLocaleString()} lbs / min</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.25rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Total Sessions Tracked</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--color-text-main)" }}>{pacingStats.total} workouts</span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                Complete and log a full training day to populate pacing metrics.
              </div>
            )}
          </div>
          
          {sortedSessions.length > 0 && (
            <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(0, 242, 254, 0.04)", border: "1px solid rgba(0, 242, 254, 0.15)", borderRadius: "8px", fontSize: "0.8rem", color: "var(--color-text-muted)", lineHeight: "1.4" }}>
              💡 <strong>Coaching Tip:</strong> Aim to maintain or increase your **Training Density** over the macrocycle. If it decreases, you may need to reduce rest periods or increase lifting intensity.
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .vitals-dashboard-header {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        @media (min-width: 768px) {
          .vitals-dashboard-header {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .vitals-dashboard-header.no-vitals {
            grid-template-columns: repeat(3, 1fr);
          }
          .vitals-dashboard-header.has-vitals {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .advice-card-full {
          grid-column: 1 / -1;
        }
        .metric-mini-card {
          display: flex;
          flex-direction: column;
          padding: 1.25rem !important;
        }
        .mini-label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
        }
        .mini-value {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--color-text-main);
          margin: 0.25rem 0;
          line-height: 1.2;
        }
        .mini-slash {
          font-size: 1rem;
          color: var(--color-text-muted);
          font-weight: 500;
        }
        .mini-desc {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        .advice-card {
          border-left: 4px solid var(--border-color);
        }
        .advice-pending {
          border-left-color: var(--color-text-muted);
          background: rgba(255, 255, 255, 0.01);
        }
        .advice-good {
          border-left-color: var(--color-secondary);
          background: rgba(57, 255, 20, 0.02);
          box-shadow: 0 0 15px rgba(57, 255, 20, 0.05);
        }
        .advice-warning {
          border-left-color: var(--color-warning);
          background: rgba(255, 184, 0, 0.02);
          box-shadow: 0 0 15px rgba(255, 184, 0, 0.05);
        }
        .advice-critical {
          border-left-color: var(--color-error);
          background: rgba(255, 56, 96, 0.02);
          box-shadow: 0 0 15px rgba(255, 56, 96, 0.05);
        }
        .advice-text {
          font-size: 0.82rem;
          margin-top: 0.25rem;
          line-height: 1.4;
          font-weight: 500;
        }
        .table-card-dash {
          padding: 1.25rem !important;
          min-width: 0;
          overflow: hidden;
        }
        .chart-card-dash {
          padding: 1.25rem !important;
          min-width: 0;
          overflow: hidden;
        }
        .bold-text {
          font-weight: 600;
          color: var(--color-text-main);
        }
        .center-text {
          text-align: center;
        }
        .anchor-name-td {
          font-size: 0.9rem;
          line-height: 1.2;
        }
        .anchor-muscle-td {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: 0.15rem;
        }
        .trend-label {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
        }
        .trend-up {
          color: var(--color-secondary);
          background: rgba(57, 255, 20, 0.08);
        }
        .trend-down {
          color: var(--color-error);
          background: rgba(255, 56, 96, 0.08);
        }
        .trend-stable {
          color: var(--color-primary);
          background: rgba(0, 242, 254, 0.08);
        }
        .chart-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 180px;
          text-align: center;
          color: var(--color-text-muted);
          font-size: 0.85rem;
          border: 1px dashed var(--border-color);
          border-radius: 8px;
        }
        .svg-chart-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
        }
        .svg-chart {
          width: 100%;
          max-width: 100%;
          max-height: 220px;
          overflow: hidden;
        }
        .chart-path {
          animation: drawLine 1s ease-out forwards;
        }
        .chart-legend {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.5rem 1rem;
          margin-top: 0.5rem;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .legend-text {
          font-size: 0.7rem;
          color: var(--color-text-muted);
          font-weight: 600;
          text-transform: uppercase;
          white-space: nowrap;
        }

        /* TOGGLE MODE STYLES */
        .chart-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }
        .chart-mode-toggles {
          display: flex;
          gap: 0.2rem;
          background: var(--bg-input);
          padding: 3px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
        }
        .toggle-mode-btn {
          border: none;
          background: none;
          color: var(--color-text-muted);
          padding: 0.25rem 0.6rem;
          border-radius: 4px;
          cursor: pointer;
          font-family: var(--font-family);
          font-size: 0.75rem;
          font-weight: 600;
          transition: var(--transition);
        }
        .toggle-mode-btn:hover {
          color: white;
        }
        .toggle-mode-btn.active {
          background: var(--color-primary);
          color: var(--bg-dark);
          box-shadow: var(--shadow-glow);
        }

        /* VOLUME LANDMARKS CARD STYLES */
        .volume-landmarks-card {
          padding: 1.5rem !important;
        }
        .landmarks-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }
        .landmarks-subtitle {
          font-size: 0.82rem;
          color: var(--color-text-muted);
          margin-bottom: 1.5rem;
          line-height: 1.4;
        }
        .landmarks-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
        }
        @media (min-width: 992px) {
          .landmarks-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
          }
        }
        .landmark-item {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .landmark-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .landmark-muscle-name {
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--color-text-main);
        }
        .landmark-status-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .landmark-status-badge {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .landmark-sets-count {
          font-size: 0.82rem;
          color: var(--color-text-muted);
        }
        .landmark-sets-count strong {
          color: var(--color-text-main);
        }
        .landmark-bar-container {
          position: relative;
          padding: 0.5rem 0;
        }
        .landmark-bar-track {
          height: 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 5px;
          position: relative;
        }
        .landmark-bar-fill {
          height: 100%;
          border-radius: 5px;
          transition: width 0.5s ease-in-out;
        }
        .bar-under-mev {
          background: linear-gradient(90deg, var(--color-text-muted), var(--color-warning));
          box-shadow: 0 0 10px rgba(217, 119, 6, 0.2);
        }
        .bar-sweet-spot {
          background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
        }
        .bar-over-mrv {
          background: linear-gradient(90deg, var(--color-error), var(--color-accent));
          box-shadow: 0 0 10px rgba(220, 38, 38, 0.2);
        }
        .landmark-status-badge.bar-under-mev {
          color: var(--color-warning);
          background: color-mix(in srgb, var(--color-warning) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--color-warning) 25%, transparent);
        }
        .landmark-status-badge.bar-sweet-spot {
          color: var(--color-primary);
          background: color-mix(in srgb, var(--color-primary) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--color-primary) 25%, transparent);
        }
        .landmark-status-badge.bar-over-mrv {
          color: var(--color-error);
          background: color-mix(in srgb, var(--color-error) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--color-error) 25%, transparent);
        }
        .landmark-marker {
          position: absolute;
          top: -4px;
          height: 18px;
          width: 2px;
          background: rgba(255, 255, 255, 0.4);
          z-index: 2;
        }
        .marker-mev {
          background: rgba(255, 184, 0, 0.6);
        }
        .marker-mrv {
          background: rgba(255, 56, 96, 0.6);
        }
        .marker-label {
          position: absolute;
          top: -14px;
          transform: translateX(-50%);
          font-size: 0.6rem;
          font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
        }
      ` }} />
    </div>
  );
}
