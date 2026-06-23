import { useState } from "react";
import {
  calculateReadiness,
  calculateEWMAWeight,
  getCaloricPhaseInfo,
  calculateSleepPerformanceCorrelation,
  calculateFatigueSetsTimeline,
  calculateStreaks,
  generateWeeklySummaryText,
  predictNextReadiness,
  countTotalPRs,
  get30DayHRVBaseline
} from "../data/analytics";

export default function Insights({
  workoutLogs,
  recoveryLogs,
  cardioLogs,
  sessionLogs,
  currentWeek,
  currentMeso
}) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState("all"); // "all", "readiness", "bodyweight", "hrv", "performance"

  // 1. Get current readiness state
  const latestLog = recoveryLogs.length > 0 ? [...recoveryLogs].sort((a,b) => b.timestamp - a.timestamp)[0] : null;
  const { score: readinessScore } = calculateReadiness(latestLog, recoveryLogs);

  // 1b. Predict recovery trend
  const recoveryPrediction = predictNextReadiness(recoveryLogs);

  // 1c. PR count badge
  const totalPRsCount = countTotalPRs(workoutLogs);

  // 2. Streaks
  const streaks = calculateStreaks(workoutLogs, recoveryLogs);

  // 3. Weight phase info
  const weightPhase = getCaloricPhaseInfo(recoveryLogs);

  // 4. EWMA weight calculations
  const weightLogsWithEWMA = calculateEWMAWeight(recoveryLogs);

  // 5. Sleep correlation points
  const correlationPoints = calculateSleepPerformanceCorrelation(sessionLogs, recoveryLogs);

  // 6. Fatigue vs sets data
  const fatigueSetsData = calculateFatigueSetsTimeline(workoutLogs, recoveryLogs);

  // Helper for gauge stroke calculations
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (readinessScore / 100) * circumference;

  const getReadinessColor = (val) => {
    if (val >= 75) return "#39ff14"; // Green
    if (val >= 50) return "#00f2fe"; // Teal/Blue
    if (val >= 30) return "#ffb800"; // Orange/Yellow
    return "#ff3860"; // Red
  };

  const getReadinessLabel = (val) => {
    if (val >= 75) return "🟢 CLEAR FOR INTENSE TRAINING";
    if (val >= 50) return "🔵 PROCEED AS PROGRAMMED";
    if (val >= 30) return "🟡 CAUTION: LIGHT TRAINING RECOMMENDED";
    return "🔴 DELOAD / REST DAY STRONGLY ADVISED";
  };

  const handleExportText = () => {
    const text = generateWeeklySummaryText(workoutLogs, recoveryLogs, cardioLogs, currentWeek, currentMeso);
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  // --- SVG CHART RENDERERS ---

  // 1. Bodyweight with EWMA
  const renderBodyweightEWMAChart = () => {
    const chartLogs = weightLogsWithEWMA.slice(-30);
    if (chartLogs.length === 0) {
      return <div className="chart-placeholder">Log weight in the Recovery tab to see trend.</div>;
    }

    const weights = chartLogs.map(l => parseFloat(l.weight));
    const minWt = Math.min(...weights) - 2;
    const maxWt = Math.max(...weights) + 2;
    const range = maxWt - minWt || 10;

    const width = 600;
    const height = 220;
    const padL = 40;
    const padR = 20;
    const padT = 30;
    const padB = 40;

    const getX = (idx) => {
      const dw = width - padL - padR;
      return padL + (idx * dw) / Math.max(1, chartLogs.length - 1);
    };

    const getY = (val) => {
      const dh = height - padT - padB;
      return height - padB - ((val - minWt) * dh) / range;
    };

    // Draw Raw weight path & EWMA path
    const rawPoints = chartLogs.map((log, idx) => ({ x: getX(idx), y: getY(log.weight), val: log.weight }));
    const ewmaPoints = chartLogs.map((log, idx) => ({ x: getX(idx), y: getY(log.ewma), val: log.ewma }));

    const rawPath = rawPoints.reduce((acc, p, i) => acc + `${i === 0 ? "M" : "L"} ${p.x} ${p.y} `, "");
    const ewmaPath = ewmaPoints.reduce((acc, p, i) => acc + `${i === 0 ? "M" : "L"} ${p.x} ${p.y} `, "");

    return (
      <div className="svg-chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart">
          {/* Y Axis Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const val = minWt + range * ratio;
            const y = getY(val);
            return (
              <g key={idx} className="grid-line-group">
                <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="var(--border-color)" strokeWidth="1" />
                <text x={padL - 8} y={y + 4} fill="var(--color-text-muted)" fontSize="9" textAnchor="end">{val.toFixed(1)}</text>
              </g>
            );
          })}

          {/* Lines */}
          {rawPoints.length > 1 && (
            <path d={rawPath} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="3,3" />
          )}
          {ewmaPoints.length > 1 && (
            <path d={ewmaPath} fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" className="chart-path" />
          )}

          {/* Dots */}
          {rawPoints.map((p, idx) => (
            <circle key={`raw-${idx}`} cx={p.x} cy={p.y} r="3" fill="var(--color-text-muted)" opacity="0.6" />
          ))}
          {ewmaPoints.map((p, idx) => {
            const isLast = idx === ewmaPoints.length - 1;
            return (
              <g key={`ewma-${idx}`}>
                <circle cx={p.x} cy={p.y} r="4" fill="var(--bg-card-solid)" stroke="var(--color-primary)" strokeWidth="2.5" />
                {isLast && (
                  <text x={p.x} y={p.y - 10} fill="var(--color-primary)" fontSize="10" fontWeight="bold" textAnchor="middle">{p.val}</text>
                )}
              </g>
            );
          })}

          {/* X Labels */}
          {chartLogs.map((p, idx) => {
            if (idx === 0 || idx === chartLogs.length - 1 || idx === Math.floor(chartLogs.length / 2)) {
              return (
                <text key={idx} x={getX(idx)} y={height - 10} fill="var(--color-text-muted)" fontSize="9" textAnchor="middle">
                  {p.displayDate || p.date.substring(5)}
                </text>
              );
            }
            return null;
          })}
        </svg>
        <div className="chart-legend">
          <div className="legend-item"><span className="legend-dot" style={{ border: "1px dashed rgba(255,255,255,0.4)" }}></span><span>Raw Entry</span></div>
          <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: "var(--color-primary)" }}></span><span>Smoothed EWMA Trend</span></div>
        </div>
      </div>
    );
  };

  // 2. HRV Daily vs. 30-day Baseline
  const renderHRVChart = () => {
    const validLogs = [...recoveryLogs].filter(l => l.hrv).sort((a, b) => a.timestamp - b.timestamp).slice(-30);
    if (validLogs.length === 0) {
      return <div className="chart-placeholder">Log HRV in the Recovery tab to see trend.</div>;
    }

    const hrValues = validLogs.map(l => l.hrv);
    const minHRV = Math.max(0, Math.min(...hrValues) - 10);
    const maxHRV = Math.max(...hrValues) + 10;
    const range = maxHRV - minHRV || 20;

    const width = 600;
    const height = 220;
    const padL = 40;
    const padR = 20;
    const padT = 30;
    const padB = 40;

    const getX = (idx) => {
      const dw = width - padL - padR;
      return padL + (idx * dw) / Math.max(1, validLogs.length - 1);
    };

    const getY = (val) => {
      const dh = height - padT - padB;
      return height - padB - ((val - minHRV) * dh) / range;
    };

    const points = validLogs.map((log, idx) => ({ x: getX(idx), y: getY(log.hrv), val: log.hrv, baseline: get30DayHRVBaseline(recoveryLogs, log.date) }));
    const pathData = points.reduce((acc, p, i) => acc + `${i === 0 ? "M" : "L"} ${p.x} ${p.y} `, "");

    return (
      <div className="svg-chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart">
          {/* Y Axis Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const val = minHRV + range * ratio;
            const y = getY(val);
            return (
              <g key={idx} className="grid-line-group">
                <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="var(--border-color)" strokeWidth="1" />
                <text x={padL - 8} y={y + 4} fill="var(--color-text-muted)" fontSize="9" textAnchor="end">{Math.round(val)}</text>
              </g>
            );
          })}

          {/* Baseline shaded band if baseline exists */}
          {points.length > 0 && points[points.length - 1].baseline && (
            <g>
              {(() => {
                const currentBaseline = points[points.length - 1].baseline;
                const topY = getY(currentBaseline * 1.15);
                const bottomY = getY(currentBaseline * 0.85);
                return (
                  <rect
                    x={padL}
                    y={Math.max(padT, topY)}
                    width={width - padL - padR}
                    height={Math.max(5, bottomY - topY)}
                    fill="rgba(0, 242, 254, 0.05)"
                    stroke="rgba(0, 242, 254, 0.15)"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                );
              })()}
            </g>
          )}

          {/* HRV Line */}
          {points.length > 1 && (
            <path d={pathData} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" className="chart-path" />
          )}

          {/* HRV points */}
          {points.map((p, idx) => {
            const isLast = idx === points.length - 1;
            return (
              <g key={idx}>
                <circle cx={p.x} cy={p.y} r="4" fill="var(--bg-card-solid)" stroke="var(--color-accent)" strokeWidth="2" />
                {isLast && (
                  <text x={p.x} y={p.y - 10} fill="var(--color-accent)" fontSize="10" fontWeight="bold" textAnchor="middle">{p.val} ms</text>
                )}
              </g>
            );
          })}

          {/* X Axis Dates */}
          {validLogs.map((p, idx) => {
            if (idx === 0 || idx === validLogs.length - 1 || idx === Math.floor(validLogs.length / 2)) {
              return (
                <text key={idx} x={getX(idx)} y={height - 10} fill="var(--color-text-muted)" fontSize="9" textAnchor="middle">
                  {p.displayDate || p.date.substring(5)}
                </text>
              );
            }
            return null;
          })}
        </svg>
        <div className="chart-legend">
          <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: "rgba(0, 242, 254, 0.08)", border: "1px dashed rgba(0, 242, 254, 0.3)" }}></span><span>Personal Baseline Envelope (±15%)</span></div>
          <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: "var(--color-accent)" }}></span><span>Daily HRV</span></div>
        </div>
      </div>
    );
  };

  // 3. Sleep vs. Performance Correlation Scatter Plot
  const renderCorrelationChart = () => {
    if (correlationPoints.length === 0) {
      return <div className="chart-placeholder">Complete workouts and log recovery metrics to generate correlation metrics.</div>;
    }

    const tonnages = correlationPoints.map(p => p.tonnage);
    const minTon = Math.max(0, Math.min(...tonnages) - 1000);
    const maxTon = Math.max(...tonnages) + 1000;
    const tonRange = maxTon - minTon || 5000;

    const width = 600;
    const height = 220;
    const padL = 50;
    const padR = 20;
    const padT = 30;
    const padB = 40;

    const getX = (sleepRating) => {
      const dw = width - padL - padR;
      // Sleep rating goes 1 to 5. Map 1->padL, 5->width-padR
      return padL + ((sleepRating - 1) * dw) / 4;
    };

    const getY = (ton) => {
      const dh = height - padT - padB;
      return height - padB - ((ton - minTon) * dh) / tonRange;
    };

    return (
      <div className="svg-chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart">
          {/* Y Axis Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const val = minTon + tonRange * ratio;
            const y = getY(val);
            return (
              <g key={idx} className="grid-line-group">
                <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="var(--border-color)" strokeWidth="1" />
                <text x={padL - 8} y={y + 4} fill="var(--color-text-muted)" fontSize="9" textAnchor="end">{Math.round(val / 100) / 10}k</text>
              </g>
            );
          })}

          {/* X Axis grid columns for Sleep Ratings 1-5 */}
          {[1, 2, 3, 4, 5].map((num) => {
            const x = getX(num);
            return (
              <g key={num}>
                <line x1={x} y1={padT} x2={x} y2={height - padB} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <text x={x} y={height - 10} fill="var(--color-text-muted)" fontSize="9" textAnchor="middle">Sleep: {num}</text>
              </g>
            );
          })}

          {/* Scatter points */}
          {correlationPoints.map((p, idx) => {
            const cx = getX(p.sleep);
            const cy = getY(p.tonnage);
            return (
              <g key={idx} className="scatter-point-group">
                <circle
                  cx={cx}
                  cy={cy}
                  r="6"
                  fill="var(--color-primary)"
                  stroke="var(--bg-card-solid)"
                  strokeWidth="1.5"
                  style={{ filter: "drop-shadow(0 0 4px var(--color-primary))" }}
                />
                <title>{`${p.label}: ${p.tonnage.toLocaleString()} lbs (Sleep: ${p.sleep}/5)`}</title>
              </g>
            );
          })}
        </svg>
        <p className="chart-info-caption">Plots total lifted tonnage (lbs) against the prior night's sleep rating. Cluster shift upwards to the right represents strong recovery correlation.</p>
      </div>
    );
  };

  // 4. Fatigue vs Weekly Sets Completed
  const renderFatigueSetsChart = () => {
    const hasData = fatigueSetsData.some(d => d.sets > 0 || d.avgFatigue > 0);
    if (!hasData) {
      return <div className="chart-placeholder">Log sets in the Workout tab to see timeline.</div>;
    }

    const setsVals = fatigueSetsData.map(d => d.sets);
    const maxSets = Math.max(20, ...setsVals) + 10;

    const width = 600;
    const height = 220;
    const padL = 40;
    const padR = 40;
    const padT = 30;
    const padB = 40;

    const getX = (idx) => {
      const dw = width - padL - padR;
      return padL + (idx * dw) / 4;
    };

    const getSetsY = (val) => {
      const dh = height - padT - padB;
      return height - padB - (val * dh) / maxSets;
    };

    const getFatigueY = (val) => {
      const dh = height - padT - padB;
      // Fatigue ranges 1 to 5
      return height - padB - ((val - 1) * dh) / 4;
    };

    const fatiguePoints = fatigueSetsData.map((d, idx) => ({ x: getX(idx), y: getFatigueY(d.avgFatigue), val: d.avgFatigue }));
    const fatiguePath = fatiguePoints.reduce((acc, p, i) => acc + `${i === 0 ? "M" : "L"} ${p.x} ${p.y} `, "");

    return (
      <div className="svg-chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart">
          {/* Y Axis Left Grid lines (Sets) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const val = Math.round(maxSets * ratio);
            const y = getSetsY(val);
            return (
              <g key={`l-${idx}`} className="grid-line-group">
                <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="var(--border-color)" strokeWidth="1" />
                <text x={padL - 8} y={y + 4} fill="var(--color-text-muted)" fontSize="9" textAnchor="end">{val}</text>
              </g>
            );
          })}

          {/* Y Axis Right labels (Fatigue 1 to 5) */}
          {[1, 2, 3, 4, 5].map((num) => {
            const y = getFatigueY(num);
            return (
              <text key={`r-${num}`} x={width - padR + 8} y={y + 4} fill="var(--color-accent)" fontSize="9" textAnchor="start">F{num}</text>
            );
          })}

          {/* Sets Completed Bars */}
          {fatigueSetsData.map((d, idx) => {
            const x = getX(idx);
            const y = getSetsY(d.sets);
            const barW = 24;
            return (
              <rect
                key={idx}
                x={x - barW / 2}
                y={y}
                width={barW}
                height={height - padB - y}
                fill="rgba(0, 242, 254, 0.15)"
                stroke="var(--color-primary)"
                strokeWidth="1.5"
                rx="3"
              />
            );
          })}

          {/* Fatigue Line */}
          {fatiguePoints.length > 1 && (
            <path d={fatiguePath} fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" className="chart-path" />
          )}

          {/* Fatigue points */}
          {fatiguePoints.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="4" fill="var(--bg-card-solid)" stroke="var(--color-accent)" strokeWidth="2.5" />
            </g>
          ))}

          {/* X Axis Labels */}
          {fatigueSetsData.map((d, idx) => (
            <text key={idx} x={getX(idx)} y={height - 10} fill="var(--color-text-muted)" fontSize="9" textAnchor="middle">
              {d.week}
            </text>
          ))}
        </svg>
        <div className="chart-legend">
          <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: "rgba(0, 242, 254, 0.15)", border: "1.5px solid var(--color-primary)", borderRadius: "2px" }}></span><span>Weekly Sets Completed</span></div>
          <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: "var(--color-accent)" }}></span><span>Weekly Avg Fatigue</span></div>
        </div>
      </div>
    );
  };

  return (
    <div className="insights-view">
      <div className="insights-header">
        <h2 className="section-title">📊 Recovery & Performance Insights</h2>
        <p className="section-subtitle">Real-time analytical mapping of your training load and health variables</p>
      </div>

      {/* TOP STATS DASHBOARD & STREAKS */}
      <div className="insights-summary-grid">
        {/* Readiness Circular Widget */}
        <div className="card readiness-card">
          <h3 className="card-title">Daily Readiness Index</h3>
          <div className="readiness-gauge-container">
            <svg className="readiness-gauge" width="200" height="200" viewBox="0 0 200 200">
              <circle
                className="readiness-gauge-bg"
                cx="100"
                cy="100"
                r={radius}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="12"
                fill="none"
              />
              <circle
                className="readiness-gauge-fill"
                cx="100"
                cy="100"
                r={radius}
                stroke={getReadinessColor(readinessScore)}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                style={{
                  filter: `drop-shadow(0 0 6px ${getReadinessColor(readinessScore)})`,
                  transition: "stroke-dashoffset 0.8s ease-out"
                }}
              />
              <text x="100" y="105" className="gauge-score-value" fill="var(--color-text-main)" fontSize="36" fontWeight="800" textAnchor="middle">
                {readinessScore}
              </text>
              <text x="100" y="130" className="gauge-score-unit" fill="var(--color-text-muted)" fontSize="10" fontWeight="bold" textAnchor="middle">
                READY
              </text>
            </svg>
          </div>
          <div className="readiness-advice-text" style={{ color: getReadinessColor(readinessScore) }}>
            {getReadinessLabel(readinessScore)}
          </div>

          {/* Recovery Score Trend Prediction */}
          <div className={`readiness-prediction-row pred-${recoveryPrediction.status}`}>
            <span className="pred-arrow">
              {recoveryPrediction.status === "rising" ? "▲" : recoveryPrediction.status === "declining" ? "▼" : "●"}
            </span>
            <div className="pred-content">
              <span className="pred-title">Tomorrow Est: {recoveryPrediction.predictedScore} Readiness</span>
              <p className="pred-text">{recoveryPrediction.text}</p>
            </div>
          </div>
          
          {latestLog ? (
            <div className="readiness-variables-pills">
              {latestLog.sleep && <span className="var-pill">Sleep: {latestLog.sleep}/5</span>}
              {latestLog.fatigue && <span className="var-pill">Fatigue: {latestLog.fatigue}/5</span>}
              {latestLog.soreness && <span className="var-pill">Soreness: {latestLog.soreness}/5</span>}
              {latestLog.rhr && <span className="var-pill">RHR: {latestLog.rhr} bpm</span>}
              {latestLog.hrv && <span className="var-pill">HRV: {latestLog.hrv} ms</span>}
            </div>
          ) : (
            <p className="no-data-hint">Log recovery details to calibrate score.</p>
          )}
        </div>

        {/* Streaks Card */}
        <div className="card streaks-card">
          <h3 className="card-title">Consistency & Streaks</h3>
          <div className="streaks-list">
            <div className="streak-item">
              <span className="streak-icon">🔥</span>
              <div className="streak-details">
                <span className="streak-value">{streaks.workoutStreak} sessions</span>
                <span className="streak-label">Completed Workouts</span>
              </div>
            </div>
            <div className="streak-item">
              <span className="streak-icon">😴</span>
              <div className="streak-details">
                <span className="streak-value">{streaks.sleepStreak} days</span>
                <span className="streak-label">Consistent Sleep (≥4)</span>
              </div>
            </div>
            <div className="streak-item">
              <span className="streak-icon">🏆</span>
              <div className="streak-details">
                <span className="streak-value">{totalPRsCount} Badges</span>
                <span className="streak-label">Personal Records Hit</span>
              </div>
            </div>
            <div className="streak-item">
              <span className="streak-icon">📊</span>
              <div className="streak-details">
                <span className="streak-value">{streaks.loggingStreak} days</span>
                <span className="streak-label">Daily Logging Streak</span>
              </div>
            </div>
          </div>

          <div className="caloric-phase-box">
            <div className="phase-header">
              <span>Weight Trend (7d)</span>
              <span className="phase-badge">{weightPhase.phase}</span>
            </div>
            <div className="phase-stats">
              <span className="phase-value">{weightPhase.change > 0 ? `+${weightPhase.change}` : weightPhase.change} lbs/wk</span>
              <span className="phase-offset-kcal">{weightPhase.kcalOffset >= 0 ? `+${weightPhase.kcalOffset}` : weightPhase.kcalOffset} kcal/day est.</span>
            </div>
          </div>
        </div>

        {/* Actions & Export */}
        <div className="card share-card">
          <h3 className="card-title">Share Progress</h3>
          <p className="share-desc">Copy a pre-formatted dashboard summary of Meso {currentMeso} Week {currentWeek} to paste into messages or share with your coach.</p>
          <button 
            type="button" 
            className={`btn btn-primary btn-full-width ${copySuccess ? "btn-success" : ""}`}
            onClick={handleExportText}
          >
            {copySuccess ? "✓ Copied to Clipboard!" : "📤 Copy Weekly Summary"}
          </button>
        </div>
      </div>

      {/* DETAILED CHARTS VIEW */}
      <div className="insights-charts-section">
        <div className="chart-navigation-bar">
          <button className={`chart-tab-btn ${activeChartTab === "all" ? "active" : ""}`} onClick={() => setActiveChartTab("all")}>All Trends</button>
          <button className={`chart-tab-btn ${activeChartTab === "bodyweight" ? "active" : ""}`} onClick={() => setActiveChartTab("bodyweight")}>Weight Trend (EWMA)</button>
          <button className={`chart-tab-btn ${activeChartTab === "hrv" ? "active" : ""}`} onClick={() => setActiveChartTab("hrv")}>Autonomic HRV</button>
          <button className={`chart-tab-btn ${activeChartTab === "performance" ? "active" : ""}`} onClick={() => setActiveChartTab("performance")}>Sleep & Performance</button>
        </div>

        <div className="charts-list-grid">
          {(activeChartTab === "all" || activeChartTab === "bodyweight") && (
            <div className="card chart-card-dash">
              <div className="chart-card-header">
                <h4 className="chart-card-title">Smoothed Weight Trendline (7d EWMA)</h4>
                <p className="chart-card-desc">Reduces daily water and glycogen fluctuations to expose actual metabolic tissue changes.</p>
              </div>
              {renderBodyweightEWMAChart()}
            </div>
          )}

          {(activeChartTab === "all" || activeChartTab === "hrv") && (
            <div className="card chart-card-dash">
              <div className="chart-card-header">
                <h4 className="chart-card-title">Autonomic Balance (HRV vs 30-Day Baseline)</h4>
                <p className="chart-card-desc">Monitors central nervous system strain relative to your rolling 30-day baseline envelope.</p>
              </div>
              {renderHRVChart()}
            </div>
          )}

          {(activeChartTab === "all" || activeChartTab === "performance") && (
            <div className="card chart-card-dash">
              <div className="chart-card-header">
                <h4 className="chart-card-title">Sleep Quality vs. Session Tonnage</h4>
                <p className="chart-card-desc">Correlates prior night's subjective sleep rating against total logged tonnage in subsequent workouts.</p>
              </div>
              {renderCorrelationChart()}
            </div>
          )}

          {activeChartTab === "all" && (
            <div className="card chart-card-dash">
              <div className="chart-card-header">
                <h4 className="chart-card-title">CNS Fatigue Accumulation vs. Set Volume</h4>
                <p className="chart-card-desc">Tracks subjective fatigue waves (1-5) against sets completed over the course of the mesocycle.</p>
              </div>
              {renderFatigueSetsChart()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
