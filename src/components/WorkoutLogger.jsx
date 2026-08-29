import { useState, useEffect } from "react";
import { DEFAULT_SPLITS, WEEKS, COMPOUND_PATTERNS, getEquipmentProfile } from "../data/database";
import SwapModal from "./SwapModal";
import { calculateReadiness, getSmartWeightSuggestion, detectPRs } from "../data/analytics";
import { syncWorkoutHeartRate } from "../data/smartwatchSync";

// Helper plate calculator logic
const calculatePlates = (totalWeight, profile, plateInventory) => {
  const barWeight = profile.barWeight;
  const divisor = profile.divisor; // 2 for BB/DB/EZ, 1 for KB
  const singleSideTarget = (totalWeight - barWeight) / divisor;

  if (singleSideTarget <= 0) {
    return { plates: {}, remainder: 0, singleSideTarget };
  }

  let remaining = singleSideTarget;
  const plates = {};
  
  // Plate Inventory: dynamically checked from active user config
  const plateTypes = [45, 35, 25, 10, 5, 2.5];
  plateTypes.forEach((wt) => {
    const maxVal = plateInventory[wt] || 0;
    const qty = Math.min(maxVal, Math.floor(remaining / wt));
    if (qty > 0) {
      plates[wt] = qty;
      remaining -= qty * wt;
    }
  });

  return {
    plates,
    remainder: Math.round(remaining * 100) / 100,
    singleSideTarget
  };
};

function PlateCalculatorModal({ data, onClose, plateInventory }) {
  const { exName, weight, profile } = data;
  const { plates, remainder, singleSideTarget } = calculatePlates(weight, profile, plateInventory);

  // Flatten plates to an ordered array for visualization: e.g. [45, 10, 10, 5]
  const loadedPlates = [];
  const plateTypes = [45, 35, 25, 10, 5, 2.5];
  plateTypes.forEach((wt) => {
    const qty = plates[wt] || 0;
    for (let i = 0; i < qty; i++) {
      loadedPlates.push(wt);
    }
  });

  const getPlateStyle = (wt) => {
    switch(wt) {
      case 45: return { height: "135px", width: "24px", bg: "#ff3860", text: "white", label: "45" };
      case 35: return { height: "125px", width: "22px", bg: "#2575fc", text: "white", label: "35" };
      case 25: return { height: "115px", width: "20px", bg: "#ffb800", text: "#1f2937", label: "25" };
      case 10: return { height: "95px", width: "16px", bg: "#39ff14", text: "#1f2937", label: "10" };
      case 5: return { height: "78px", width: "14px", bg: "#ffffff", text: "#1f2937", label: "5" };
      case 2.5: return { height: "62px", width: "12px", bg: "#7f8c8d", text: "white", label: "2.5" };
      default: return { height: "60px", width: "12px", bg: "#ccc", text: "black", label: "" };
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card plate-calc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Barbell Plate Calculator</h3>
          <button type="button" className="btn-close-modal" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="calc-summary">
            <h4 className="calc-ex-name">{exName}</h4>
            <div className="calc-weight-row">
              <span className="calc-total-wt">{weight} lbs</span>
              <span className="calc-label-small">total weight</span>
            </div>
            <p className="calc-details-p">
              Bar Weight: <strong>{profile.barWeight} lbs</strong> ({profile.equip} Setup)
              <br />
              Divisor: <strong>{profile.divisor}x</strong>
              <br />
              Target weight per side: <strong>{singleSideTarget.toFixed(1)} lbs</strong>
            </p>
          </div>

          {/* VISUAL BARBELL SLEEVE */}
          {singleSideTarget > 0 ? (
            <div className="barbell-visual-container">
              <div className="barbell-sleeve-area">
                <div className="barbell-collar"></div>
                <div className="barbell-sleeve-shaft">
                  <div className="plates-stack">
                    {loadedPlates.map((wt, idx) => {
                      const styleInfo = getPlateStyle(wt);
                      return (
                        <div
                          key={idx}
                          className="visual-plate"
                          style={{
                            height: styleInfo.height,
                            width: styleInfo.width,
                            backgroundColor: styleInfo.bg,
                            color: styleInfo.text
                          }}
                        >
                          <span className="visual-plate-label">{styleInfo.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-sleeve-msg">
              No additional weight needed. Use empty {profile.barWeight} lbs {profile.equip}.
            </div>
          )}

          {/* WRITTEN BREAKDOWN */}
          <div className="written-breakdown">
            <h5>Required Plates (Per Side)</h5>
            {loadedPlates.length === 0 && singleSideTarget > 0 && (
              <p className="no-plates-msg">No plates fit within inventory constraints.</p>
            )}
            {Object.keys(plates).length > 0 && (
              <div className="plates-list-grid">
                {Object.keys(plates).sort((a, b) => b - a).map((wt) => (
                  <div key={wt} className="plate-list-item">
                    <span className="plate-bullet" style={{ backgroundColor: getPlateStyle(parseFloat(wt)).bg }}></span>
                    <span className="plate-qty">{plates[wt]}x</span>
                    <span className="plate-name">{wt} lb plate</span>
                  </div>
                ))}
              </div>
            )}

            {/* Remainder Warn */}
            {remainder > 0 && (
              <div className="remainder-warning-box">
                ⚠️ <strong>Unloaded Remainder: +{remainder} lbs</strong>
                <br />
                <span className="warning-detail">
                  Your plate inventory is insufficient or doesn't support the weight increment. Missing plates to load this exact weight.
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-primary btn-full" onClick={onClose}>
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WorkoutLogger({
  meso,
  setMeso,
  week,
  setWeek,
  day,
  setDay,
  workoutLogs,
  recoveryLogs,
  slotOverrides,
  onSaveSet,
  onUpdateSlotOverride,
  triggerRestTimer,
  plateInventory,
  settings,
  checkedMobility,
  setCheckedMobility,
  onSaveSession
}) {
  // 1. Calculate readiness from latest recovery log
  const latestLog = recoveryLogs.length > 0 ? [...recoveryLogs].sort((a,b) => b.timestamp - a.timestamp)[0] : null;
  const { score: readinessScore } = calculateReadiness(latestLog, recoveryLogs);

  // 2. Determine auto-regulation variables
  const setsReduction = readinessScore < 30 ? 2 : (readinessScore < 50 ? 1 : 0);

  const getExerciseTotalSets = (pattern) => {
    const isCmp = COMPOUND_PATTERNS.includes(pattern);
    let totalSets = isCmp ? activeWeekInfo.setsComp : activeWeekInfo.setsIso;
    if (isCmp && setsReduction > 0) {
      totalSets = Math.max(1, totalSets - setsReduction);
    }
    return totalSets;
  };

  const [activeSwapIdx, setActiveSwapIdx] = useState(null);
  const [activeSwapPattern, setActiveSwapPattern] = useState("");
  const [activeSwapCurrent, setActiveSwapCurrent] = useState("");

  // Feeder sets collapsed states (key: exName, value: boolean)
  const [collapsedFeeders, setCollapsedFeeders] = useState({});

  // Expanded notes state (key: `${exName}-${setIdx}`, value: boolean)
  const [expandedNotes, setExpandedNotes] = useState({});

  // Celebration modal visibility
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState(false);

  // PR Alert animation state
  const [prAlert, setPrAlert] = useState(null);

  // Plate calculator modal state
  const [plateCalcData, setPlateCalcData] = useState(null);

  // Mobility checklist collapsed state
  const [mobilityCollapsed, setMobilityCollapsed] = useState(false);

  const activeWeekInfo = WEEKS[week - 1];
  const dayIndex = day - 1;
  const dayData = DEFAULT_SPLITS[meso]?.[dayIndex] || { title: "No Workout Programmed", exercises: [] };

  const getDynamicProfile = (exName) => {
    const profile = getEquipmentProfile(exName);
    if (profile.equip === "BB") {
      profile.barWeight = settings?.bbWeight !== undefined ? parseFloat(settings.bbWeight) : 45;
    } else if (profile.equip === "EZ") {
      profile.barWeight = settings?.ezWeight !== undefined ? parseFloat(settings.ezWeight) : 14;
    } else if (profile.equip === "DB") {
      profile.barWeight = settings?.dbWeight !== undefined ? parseFloat(settings.dbWeight) : 12;
    }
    return profile;
  };

  const handleCnsRating = (exName, rating) => {
    const cnsKey = `cns_readiness_${meso}-${week}-${day}-${exName}`;
    const currentRating = workoutLogs[cnsKey]?.rating;
    if (currentRating === rating) {
      onSaveSet(cnsKey, { rating: null });
    } else {
      onSaveSet(cnsKey, { rating });
    }
  };

  // Soreness check
  const getSorenessAvg = () => {
    const sorted = [...recoveryLogs].sort((a, b) => b.timestamp - a.timestamp);
    if (sorted.length >= 3) {
      const sum = sorted.slice(0, 3).reduce((acc, log) => acc + log.soreness, 0);
      return sum / 3;
    } else if (sorted.length > 0) {
      const sum = sorted.reduce((acc, log) => acc + log.soreness, 0);
      return sum / sorted.length;
    }
    return 0;
  };
  const sorenessAvg = getSorenessAvg();

  // Helper inputs
  const getLogValue = (exName, setIndex, field) => {
    const logKey = `${meso}-${week}-${day}-${exName}-${setIndex}`;
    return workoutLogs[logKey]?.[field] || "";
  };

  const isCompleted = (exName, setIndex) => {
    const logKey = `${meso}-${week}-${day}-${exName}-${setIndex}`;
    return !!workoutLogs[logKey]?.completed;
  };

  const handleInputChange = (exName, setIndex, field, value) => {
    const logKey = `${meso}-${week}-${day}-${exName}-${setIndex}`;
    onSaveSet(logKey, {
      [field]: value === "" ? "" : value,
      completed: false // reset checkbox when value edits
    });
  };

  // Session Stopwatch
  const sessionStartKey = `hgh_session_start_${meso}-${week}-${day}`;
  const sessionPausedKey = `hgh_session_paused_${meso}-${week}-${day}`;
  const sessionAccumulatedKey = `hgh_session_accumulated_${meso}-${week}-${day}`;

  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [isSessionPaused, setIsSessionPaused] = useState(false);

  useEffect(() => {
    const start = localStorage.getItem(sessionStartKey);
    const paused = localStorage.getItem(sessionPausedKey) === "true";
    const accumulated = parseInt(localStorage.getItem(sessionAccumulatedKey) || "0", 10);

    Promise.resolve().then(() => {
      setIsSessionPaused(paused);
      if (!start) {
        setSessionElapsed(0);
      } else if (paused) {
        setSessionElapsed(accumulated);
      } else {
        setSessionElapsed(Math.floor((Date.now() - parseInt(start, 10)) / 1000) + accumulated);
      }
    });
  }, [sessionStartKey, sessionPausedKey, sessionAccumulatedKey]);

  useEffect(() => {
    let interval = null;
    const start = localStorage.getItem(sessionStartKey);
    const paused = localStorage.getItem(sessionPausedKey) === "true";
    const accumulated = parseInt(localStorage.getItem(sessionAccumulatedKey) || "0", 10);

    if (start && !paused && !isSessionPaused) {
      interval = setInterval(() => {
        setSessionElapsed(Math.floor((Date.now() - parseInt(start, 10)) / 1000) + accumulated);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionStartKey, isSessionPaused, sessionPausedKey, sessionAccumulatedKey]);

  const checkStartSessionTimer = (nowTimestamp) => {
    const start = localStorage.getItem(sessionStartKey);
    if (!start) {
      localStorage.setItem(sessionStartKey, String(nowTimestamp));
      localStorage.setItem(sessionPausedKey, "false");
      localStorage.setItem(sessionAccumulatedKey, "0");
      setSessionElapsed(1);
      setIsSessionPaused(false);
    }
  };

  const handleToggleSessionPause = () => {
    const start = localStorage.getItem(sessionStartKey);
    if (!start) return;

    const paused = localStorage.getItem(sessionPausedKey) === "true";
    const accumulated = parseInt(localStorage.getItem(sessionAccumulatedKey) || "0", 10);

    if (paused) {
      localStorage.setItem(sessionStartKey, String(Date.now()));
      localStorage.setItem(sessionPausedKey, "false");
      setIsSessionPaused(false);
    } else {
      const currentSessionElapsed = Math.floor((Date.now() - parseInt(start, 10)) / 1000) + accumulated;
      localStorage.setItem(sessionAccumulatedKey, String(currentSessionElapsed));
      localStorage.setItem(sessionPausedKey, "true");
      setIsSessionPaused(true);
      setSessionElapsed(currentSessionElapsed);
    }
  };

  const handleResetSessionTimer = () => {
    if (window.confirm("Are you sure you want to reset the session stopwatch?")) {
      localStorage.removeItem(sessionStartKey);
      localStorage.removeItem(sessionPausedKey);
      localStorage.removeItem(sessionAccumulatedKey);
      setSessionElapsed(0);
      setIsSessionPaused(false);
    }
  };

  const handleCompleteToggle = (exName, setIndex, suggestedWeight, restTimeStr, nowTimestamp, nowDateStr) => {
    const logKey = `${meso}-${week}-${day}-${exName}-${setIndex}`;
    const currentLog = workoutLogs[logKey] || {};
    const newCompleted = !currentLog.completed;
    
    const finalWeight = currentLog.weight !== undefined && currentLog.weight !== "" 
      ? parseFloat(currentLog.weight) 
      : parseFloat(suggestedWeight);

    const finalReps = currentLog.reps !== undefined && currentLog.reps !== "" 
      ? parseInt(currentLog.reps) 
      : 0;

    const currentTimestamp = newCompleted ? nowTimestamp : null;
    const currentDate = newCompleted ? nowDateStr : null;

    if (newCompleted) {
      checkStartSessionTimer(nowTimestamp);
    }

    onSaveSet(logKey, {
      weight: finalWeight,
      reps: finalReps,
      completed: newCompleted,
      date: currentDate,
      timestamp: currentTimestamp
    });

    // 1. PR DETECTION
    if (newCompleted) {
      const prs = detectPRs(workoutLogs, exName, logKey, {
        weight: finalWeight,
        reps: finalReps,
        completed: true,
        date: currentDate,
        timestamp: currentTimestamp
      });
      if (prs.isWeightPR || prs.isRepPR || prs.isVolumePR) {
        const types = [];
        if (prs.isWeightPR) types.push("Weight PR 🏋️");
        if (prs.isRepPR) types.push("Rep PR 📈");
        if (prs.isVolumePR) types.push("Volume PR 🔥");
        setPrAlert({
          exercise: exName,
          types: types.join(" & ")
        });
        setTimeout(() => {
          setPrAlert(null);
        }, 4000);
      }
    }

    // CHECK IF SESSION COMPLETED AFTER THIS TOGGLE
    const isSessionCompleteNow = dayData.exercises.every((ex, exIdx) => {
      const name = getExName(ex.exercise, exIdx);
      const totalSets = getExerciseTotalSets(ex.pattern);
      for (let s = 1; s <= totalSets; s++) {
        if (name === exName && s === setIndex) {
          if (!newCompleted) return false;
        } else {
          if (!isCompleted(name, s)) return false;
        }
      }
      return true;
    });

    const getTonnageAfterUpdate = () => {
      let tonnage = 0;
      dayData.exercises.forEach((ex, exIdx) => {
        const name = getExName(ex.exercise, exIdx);
        const totalSets = getExerciseTotalSets(ex.pattern);
        
        for (let s = 1; s <= totalSets; s++) {
          let isSetCompleted = false;
          let setWeight = 0;
          let setReps = 0;

          if (name === exName && s === setIndex) {
            isSetCompleted = newCompleted;
            setWeight = finalWeight;
            setReps = finalReps;
          } else {
            const key = `${meso}-${week}-${day}-${name}-${s}`;
            const log = workoutLogs[key];
            if (log) {
              isSetCompleted = !!log.completed;
              setWeight = log.weight !== undefined && log.weight !== "" ? parseFloat(log.weight) : 0;
              setReps = log.reps !== undefined && log.reps !== "" ? parseInt(log.reps) : 0;
            }
          }

          if (isSetCompleted && setWeight > 0 && setReps > 0) {
            const profile = getDynamicProfile(name);
            if (profile.isWeighted) {
              tonnage += setWeight * setReps;
            }
          }
        }
      });
      return tonnage;
    };

    if (isSessionCompleteNow && !hasCelebrated) {
      setShowCelebration(true);
      setHasCelebrated(true);
      
      const sessionKey = `${meso}-${week}-${day}`;
      const elapsed = sessionElapsed;
      const tonnageVal = getTonnageAfterUpdate();
      
      if (onSaveSession) {
        onSaveSession(sessionKey, {
          duration: elapsed,
          tonnage: tonnageVal,
          completedAt: nowTimestamp
        });
      }

      // 2. ACTIVE HEART RATE SYNCING
      const fetchWorkoutHR = async () => {
        const startT = parseInt(localStorage.getItem(sessionStartKey), 10) || (Date.now() - elapsed * 1000);
        const endT = Date.now();
        const hrData = await syncWorkoutHeartRate(startT, endT);
        if (hrData.success) {
          if (onSaveSession) {
            onSaveSession(sessionKey, {
              duration: elapsed,
              tonnage: tonnageVal,
              completedAt: nowTimestamp,
              avgHr: hrData.avgHr,
              peakHr: hrData.peakHr,
              zones: hrData.zones
            });
          }
        }
      };
      fetchWorkoutHR();
      
    } else if (!isSessionCompleteNow) {
      setHasCelebrated(false);
      setShowCelebration(false);
    }

    if (newCompleted) {
      const slotKey = `${meso}-${day}-${dayData.exercises.findIndex((e, idx) => getExName(e.exercise, idx) === exName)}`;
      const customRestVal = slotOverrides[slotKey]?.restTime;
      let seconds = 90;

      if (customRestVal) {
        seconds = parseInt(customRestVal, 10);
      } else if (restTimeStr.includes("s")) {
        seconds = parseInt(restTimeStr);
      } else if (restTimeStr.includes("m")) {
        const parts = restTimeStr.replace("m", "").split("-");
        const minutes = parts.length > 1 ? parseFloat(parts[1]) : parseFloat(parts[0]);
        seconds = minutes * 60;
      }
      triggerRestTimer(seconds, exName);
    }
  };

  const mround = (val, roundTo) => {
    return Math.round(val / roundTo) * roundTo;
  };

  const getExName = (defaultEx, idx) => {
    return slotOverrides[`${meso}-${day}-${idx}`]?.exercise || defaultEx;
  };

  // Mobility exercises definition based on training day split
  const isUpperDay = day === 1 || day === 3;
  const mobilityList = isUpperDay
    ? [
        { id: "passthrough", name: "Band Passthroughs", reps: "10-15 reps", desc: "Hold band wide, pass overhead to lower back. Keeps shoulders mobile." },
        { id: "pullapart", name: "Band Pull-Aparts", reps: "15-20 reps", desc: "Hold band at chest height, pull outward and squeeze shoulder blades." },
        { id: "shrug", name: "Gymnastic Ring Scapular Shrugs", reps: "10-12 reps", desc: "Hang from rings, retract and shrug shoulders down with straight arms." }
      ]
    : [
        { id: "cossack", name: "BW Cossack Squats", reps: "6-8 per side", desc: "Perform deep lateral lunges, rotating the trailing toe upward." },
        { id: "stretch", name: "World's Greatest Stretch", reps: "3 per side", desc: "Lunge forward, drop elbow to inside, rotate torso and reach to sky." },
        { id: "goodmorning", name: "Band Good Mornings", reps: "15-20 reps", desc: "Step on resistance band, loop around neck, hinge hips back with flat back." }
      ];

  const handleMobilityToggle = (id) => {
    const key = `${meso}-${week}-${day}-${id}`;
    setCheckedMobility((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isAllMobilityChecked = mobilityList.every((ex) => {
    const key = `${meso}-${week}-${day}-${ex.id}`;
    return !!checkedMobility[key];
  });

  // Smart Progressive Overload suggestions lookup
  const getPrevWeekLoggedSet = (exName) => {
    if (week === 1) return null;
    let bestSet = null;
    let maxWeight = 0;
    let maxReps = 0;
    
    for (let s = 1; s <= 10; s++) {
      const logKey = `${meso}-${week - 1}-${day}-${exName}-${s}`;
      const log = workoutLogs[logKey];
      if (log && log.completed && log.weight && log.reps > 0) {
        const wt = parseFloat(log.weight);
        const rp = parseInt(log.reps, 10);
        if (wt > maxWeight || (wt === maxWeight && rp > maxReps)) {
          maxWeight = wt;
          maxReps = rp;
          bestSet = { weight: wt, reps: rp, rir: log.rir };
        }
      }
    }
    return bestSet;
  };

  const getCoachingAdvice = (exName, rawSuggested, profile) => {
    const prevSet = getPrevWeekLoggedSet(exName);
    if (!prevSet) {
      return {
        text: rawSuggested > 0 ? `${rawSuggested} lbs` : "Bodyweight",
        detail: null
      };
    }
    
    let recWeight = prevSet.weight;
    let recReps = prevSet.reps;
    let reason = "Match previous week";
    
    const isBb = profile.equip === "BB";
    const isDb = profile.equip === "DB";
    const increment = isBb ? 5 : (isDb ? 5 : 2.5);
    
    if (week === 2) {
      recReps = prevSet.reps + 1;
      reason = "Lower RIR target. Attempt +1 rep.";
    } else if (week === 3) {
      recWeight = prevSet.weight + increment;
      reason = "Intensification week. Load +5 lbs.";
    } else if (week === 4) {
      recWeight = prevSet.weight + increment;
      reason = "Overreach week. Max load (0 RIR). Optional: 3–5 stretch partials at the end of isolation sets.";
    } else if (week === 5) {
      recWeight = Math.max(profile.barWeight, mround(prevSet.weight * 0.7, 5));
      recReps = Math.max(5, prevSet.reps - 2);
      reason = "Deload week. Reduce weight & intensity.";
    }
    
    return {
      text: `${recWeight} lbs × ${recReps}`,
      detail: `Prev: ${prevSet.weight} lbs × ${prevSet.reps} (${reason})`
    };
  };

  // PR e1RM dynamic detection
  const getHistoricalBestE1rm = (exName, currentKey) => {
    let maxE1rm = 0;
    Object.keys(workoutLogs).forEach((key) => {
      if (key === currentKey) return;
      const parts = key.split("-");
      if (parts.length >= 5) {
        const loggedExName = parts.slice(3, -1).join("-");
        if (loggedExName === exName) {
          const log = workoutLogs[key];
          if (log.completed && log.weight && log.reps > 0) {
            const e1rm = Math.round(parseFloat(log.weight) * (1 + parseInt(log.reps, 10) / 30));
            if (e1rm > maxE1rm) maxE1rm = e1rm;
          }
        }
      }
    });
    return maxE1rm;
  };





  const renderFeederSets = (exName, baseline, profile) => {
    if (profile.equip !== "BB" && profile.equip !== "DB" && profile.equip !== "EZ") return null;
    if (baseline <= 0) return null;

    const f1 = profile.barWeight;
    const f2 = Math.max(profile.barWeight, mround(baseline * 0.6, 5));
    const f3 = Math.max(profile.barWeight, mround(baseline * 0.85, 5));

    const cnsKey = `cns_readiness_${meso}-${week}-${day}-${exName}`;
    const cnsRating = workoutLogs[cnsKey]?.rating;

    return (
      <div className="feeder-sets-banner">
        <span className="feeder-title">⚡ Warm-Up Feeder Sets for {exName}</span>
        <div className="feeder-list">
          <div className="feeder-item">
            <span>①</span> Empty Bar:{" "}
            <span
              className="wside-clickable warm-up-clickable"
              onClick={() => setPlateCalcData({ exName: `Warm-Up 1: ${exName}`, weight: f1, profile })}
            >
              {f1} lbs
            </span>{" "}
            &times; 10
          </div>
          <div className="feeder-item">
            <span>②</span> 60%:{" "}
            <span
              className="wside-clickable warm-up-clickable"
              onClick={() => setPlateCalcData({ exName: `Warm-Up 2: ${exName}`, weight: f2, profile })}
            >
              {f2} lbs
            </span>{" "}
            &times; 5
          </div>
          <div className="feeder-item">
            <span>③</span> 85%:{" "}
            <span
              className="wside-clickable warm-up-clickable"
              onClick={() => setPlateCalcData({ exName: `Warm-Up 3: ${exName}`, weight: f3, profile })}
            >
              {f3} lbs
            </span>{" "}
            &times; 2
          </div>
        </div>

        <div className="cns-readiness-row">
          <span className="cns-label">Rate Warm-Up Set ③ speed:</span>
          <div className="cns-buttons">
            <button
              type="button"
              className={`cns-btn cns-btn-fast ${cnsRating === "fast" ? "active" : ""}`}
              onClick={() => handleCnsRating(exName, "fast")}
            >
              ⚡ Fast (Snappy)
            </button>
            <button
              type="button"
              className={`cns-btn cns-btn-normal ${cnsRating === "normal" ? "active" : ""}`}
              onClick={() => handleCnsRating(exName, "normal")}
            >
              ● Normal
            </button>
            <button
              type="button"
              className={`cns-btn cns-btn-slow ${cnsRating === "slow" ? "active" : ""}`}
              onClick={() => handleCnsRating(exName, "slow")}
            >
              ⚠️ Slow (Grindy)
            </button>
          </div>
        </div>

        {sorenessAvg >= 3.0 && (
          <div className="soreness-alert">
            ⚠️ SORENESS WARNING: Rolling soreness is high ({sorenessAvg.toFixed(1)}/5). Warm up thoroughly!
          </div>
        )}
      </div>
    );
  };

  const getWeekTonnage = () => {
    let tonnage = 0;
    dayData.exercises.forEach((ex, exIdx) => {
      const exName = getExName(ex.exercise, exIdx);
      const totalSets = getExerciseTotalSets(ex.pattern);
      
      for (let s = 1; s <= totalSets; s++) {
        const key = `${meso}-${week}-${day}-${exName}-${s}`;
        const log = workoutLogs[key];
        if (log && log.completed && log.weight && log.reps) {
          const profile = getDynamicProfile(exName);
          if (profile.isWeighted) {
            tonnage += parseFloat(log.weight) * parseInt(log.reps);
          }
        }
      }
    });
    return tonnage;
  };

  // Group contiguous superset exercises
  const getGroupedExercises = () => {
    const groups = [];
    let currentGroup = null;

    dayData.exercises.forEach((ex, exIdx) => {
      const ssMatch = ex.ss ? ex.ss.match(/^([A-Z])\d+$/) : null;
      const ssLetter = ssMatch ? ssMatch[1] : null;

      if (ssLetter) {
        if (currentGroup && currentGroup.type === "superset" && currentGroup.name === ssLetter) {
          currentGroup.items.push({ ex, exIdx });
        } else {
          if (currentGroup) {
            groups.push(currentGroup);
          }
          currentGroup = {
            type: "superset",
            name: ssLetter,
            items: [{ ex, exIdx }]
          };
        }
      } else {
        if (currentGroup) {
          groups.push(currentGroup);
          currentGroup = null;
        }
        groups.push({
          type: "single",
          ex,
          exIdx
        });
      }
    });

    if (currentGroup) {
      groups.push(currentGroup);
    }
    return groups;
  };

  // Helper format stopwatch
  const formatElapsedTime = (sec) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    const pad = (n) => String(n).padStart(2, "0");
    if (hrs > 0) {
      return `${hrs}:${pad(mins)}:${pad(secs)}`;
    }
    return `${mins}:${pad(secs)}`;
  };

  // Render a single exercise card
  const renderExerciseCard = (ex, exIdx, isInsideSuperset = false) => {
    const exName = getExName(ex.exercise, exIdx);
    const profile = getDynamicProfile(exName);
    const isCmp = COMPOUND_PATTERNS.includes(ex.pattern);
    const totalSets = getExerciseTotalSets(ex.pattern);

    const slotKey = `${meso}-${day}-${exIdx}`;
    const baseWeight = slotOverrides[slotKey]?.baseline !== undefined && slotOverrides[slotKey].baseline !== ""
      ? slotOverrides[slotKey].baseline 
      : ex.baseline;
    const rackSetup = slotOverrides[slotKey]?.rack !== undefined 
      ? slotOverrides[slotKey].rack 
      : ex.rack;

    const restTimeStr = isCmp ? "2-3m" : (ex.pattern === "Abs" ? "60s" : "90s");
    const customRest = slotOverrides[slotKey]?.restTime !== undefined
      ? slotOverrides[slotKey].restTime
      : "";

    const cnsKey = `cns_readiness_${meso}-${week}-${day}-${exName}`;
    const cnsRating = workoutLogs[cnsKey]?.rating;
    const isSlow = cnsRating === "slow";

    let rawSuggested = 0;
    let suggestedLoad = "—";
    if (profile.isWeighted && baseWeight > 0) {
      rawSuggested = Math.max(profile.barWeight, mround(baseWeight * activeWeekInfo.weightPct, 5));
      if (isSlow) {
        suggestedLoad = Math.max(profile.barWeight, mround(rawSuggested * 0.95, 5));
      } else {
        suggestedLoad = rawSuggested;
      }
    }

    const isFeederCollapsed = collapsedFeeders[exName] !== undefined ? collapsedFeeders[exName] : (exIdx > 0);
    const coaching = getCoachingAdvice(exName, rawSuggested, profile);
    const smartSuggestion = getSmartWeightSuggestion(workoutLogs, exName, readinessScore);

    return (
      <div key={exIdx} className={`card exercise-card ${isInsideSuperset ? "superset-card-nested" : ""}`}>
        <div className="ex-card-header">
          <div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem", flexWrap: "wrap" }}>
              <span className="badge badge-teal">{ex.pattern}</span>
              {ex.ss && <span className="badge badge-purple">SS: {ex.ss}</span>}
              <a
                href={`https://www.youtube.com/results?search_query=how+to+do+${encodeURIComponent(exName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ex-demo-link"
                title="Watch exercise demonstration"
              >
                ⓘ Demo
              </a>
            </div>
            <h3 className="ex-card-name">{exName}</h3>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-swap-inline"
            onClick={() => {
              setActiveSwapIdx(exIdx);
              setActiveSwapPattern(ex.pattern);
              setActiveSwapCurrent(exName);
            }}
          >
            🔁 Swap
          </button>
        </div>

        <div className="ex-card-details">
          <div className="detail-item detail-item-input">
            <strong>Base:</strong>
            <div className="input-with-unit">
              <input
                type="number"
                className="form-input detail-input"
                value={baseWeight || ""}
                onChange={(e) => onUpdateSlotOverride(meso, day, exIdx, "baseline", e.target.value)}
                placeholder={ex.baseline}
              />
              <span className="unit-label">lbs</span>
            </div>
          </div>
          <div className="detail-item detail-item-input">
            <strong>Rack:</strong>
            <input
              type="text"
              className="form-input detail-input text-detail-input"
              value={rackSetup || ""}
              onChange={(e) => onUpdateSlotOverride(meso, day, exIdx, "rack", e.target.value)}
              placeholder={ex.rack}
            />
          </div>
          <div className="detail-item"><strong>Tempo:</strong> {ex.tempo}</div>
          <div className="detail-item detail-item-input">
            <strong>Rest:</strong>
            <div className="input-with-unit">
              <input
                type="number"
                className="form-input detail-input"
                value={customRest}
                onChange={(e) => onUpdateSlotOverride(meso, day, exIdx, "restTime", e.target.value)}
                placeholder={isCmp ? "180" : (ex.pattern === "Abs" ? "60" : "90")}
              />
              <span className="unit-label">s</span>
            </div>
          </div>
        </div>

        {/* Dynamic Coach Progressive Overload Suggestions */}
        {coaching.detail && (
          <div className="coaching-advice-banner">
            🎯 <strong>Overload suggestion:</strong> {coaching.text} <span className="coaching-detail-txt">({coaching.detail})</span>
          </div>
        )}

        {isCmp && profile.isWeighted && baseWeight > 0 && (
          <div className="feeder-sets-expandable" style={{ marginBottom: "1rem" }}>
            <button
              type="button"
              className="btn btn-secondary btn-feeder-toggle"
              onClick={() => setCollapsedFeeders(prev => ({ ...prev, [exName]: !isFeederCollapsed }))}
            >
              {isFeederCollapsed ? "⚡ Show Warm-Up Feeder Sets" : "⚡ Hide Warm-Up Feeder Sets"}
            </button>
            {!isFeederCollapsed && renderFeederSets(exName, baseWeight, profile)}
          </div>
        )}

        {isSlow && (
          <div className="cns-fatigue-warning">
            ⚠️ CNS Fatigue Detected: Reducing suggested working sets weight by 5% today ({rawSuggested} lbs → {suggestedLoad} lbs) to preserve training quality.
          </div>
        )}

        {/* Set Tracker Table */}
        <div className="sets-container">
          <div className="set-row header-row">
            <div className="set-cell cell-index">Set</div>
            <div className="set-cell cell-target">Target</div>
            <div className="set-cell cell-weight">Weight (lbs)</div>
            <div className="set-cell cell-wside">W/Side</div>
            <div className="set-cell cell-reps">Reps</div>
            <div className="set-cell cell-rir">RIR</div>
            <div className="set-cell cell-e1rm">e1RM</div>
            <div className="set-cell cell-check">Done</div>
          </div>

          {Array.from({ length: totalSets }).map((_, sIdx) => {
            const setNum = sIdx + 1;
            const loggedWt = getLogValue(exName, setNum, "weight");
            const loggedReps = getLogValue(exName, setNum, "reps");
            const loggedRir = getLogValue(exName, setNum, "rir");
            const isSetDone = isCompleted(exName, setNum);

            // Deviation warning (Weight deviates >30% from target)
            const targetWtVal = suggestedLoad !== "—" ? parseFloat(suggestedLoad) : null;
            const userWtVal = loggedWt !== "" ? parseFloat(loggedWt) : null;
            const isDeviated = targetWtVal && userWtVal && (Math.abs(userWtVal - targetWtVal) / targetWtVal > 0.3);

            // Calculate plates per side
            let wSideText = "—";
            const wtToUse = loggedWt !== "" ? parseFloat(loggedWt) : (suggestedLoad !== "—" ? parseFloat(suggestedLoad) : null);
            if (profile.isWeighted && wtToUse !== null) {
              const plateWt = (wtToUse - profile.barWeight) / profile.divisor;
              wSideText = plateWt > 0 ? `${plateWt.toFixed(1)}/side` : "0 plates";
            } else if (!profile.isWeighted) {
              wSideText = profile.equip;
            }

            // Calculate e1RM
            let e1rmText = "—";
            if (profile.isWeighted && isSetDone && loggedWt && loggedReps > 0) {
              e1rmText = `${Math.round(parseFloat(loggedWt) * (1 + parseInt(loggedReps) / 30))} lbs`;
            }

            // Historical PR detection
            const currentKey = `${meso}-${week}-${day}-${exName}-${setNum}`;
            const currentE1rm = profile.isWeighted && isSetDone && loggedWt && loggedReps > 0
              ? Math.round(parseFloat(loggedWt) * (1 + parseInt(loggedReps) / 30))
              : 0;
            const histBest = getHistoricalBestE1rm(exName, currentKey);
            const isNewPr = currentE1rm > histBest && histBest > 0;

            const isNoteExpanded = !!expandedNotes[`${exName}-${setNum}`];

            return (
              <div key={sIdx} className="set-row-wrapper">
                <div className={`set-row ${isSetDone ? "row-done" : ""}`}>
                  <div className="set-cell cell-index" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <span>S{setNum}</span>
                    <button
                      type="button"
                      className={`btn-note-toggle ${isNoteExpanded ? "active" : ""}`}
                      onClick={() => setExpandedNotes(prev => ({ ...prev, [`${exName}-${setNum}`]: !isNoteExpanded }))}
                      title="Add set notes"
                    >
                      💬
                    </button>
                  </div>
                  <div className="set-cell cell-target">
                    {suggestedLoad !== "—" ? (
                      isSlow ? (
                        <span className="cns-scaled-text" title="CNS Fatigue Scaled (-5%)">
                          {suggestedLoad} lbs
                        </span>
                      ) : (
                        `${suggestedLoad} lbs`
                      )
                    ) : "Bodyweight"}
                  </div>
                  <div className="set-cell cell-weight" style={{ position: "relative" }}>
                    <input
                      type="number"
                      min="0"
                      placeholder={smartSuggestion !== null ? String(smartSuggestion) : (suggestedLoad !== "—" ? suggestedLoad : "")}
                      className={`form-input set-input ${isDeviated ? "input-warning" : ""}`}
                      disabled={isSetDone}
                      value={loggedWt}
                      onChange={(e) => handleInputChange(exName, setNum, "weight", e.target.value)}
                    />
                    {loggedWt === "" && smartSuggestion !== null && !isSetDone && (
                      <button
                        type="button"
                        className="btn-apply-suggestion"
                        onClick={() => handleInputChange(exName, setNum, "weight", String(smartSuggestion))}
                        title={`Suggested: ${smartSuggestion} lbs. Click to apply.`}
                      >
                        ⚡ Suggest: {smartSuggestion}
                      </button>
                    )}
                    {isDeviated && (
                      <span className="dev-warn-indicator" title="Weight deviates >30% from target!">&#9888;</span>
                    )}
                  </div>
                  <div className="set-cell cell-wside">
                    <span
                      className={`wside-badge ${profile.isWeighted && wtToUse !== null ? "wside-clickable" : ""}`}
                      onClick={() => {
                        if (profile.isWeighted && wtToUse !== null) {
                          setPlateCalcData({
                            exName,
                            weight: wtToUse,
                            profile
                          });
                        }
                      }}
                    >
                      {wSideText}
                    </span>
                  </div>
                  <div className="set-cell cell-reps">
                    <input
                      type="number"
                      min="1"
                      placeholder="Reps"
                      className="form-input set-input"
                      disabled={isSetDone}
                      value={loggedReps}
                      onChange={(e) => handleInputChange(exName, setNum, "reps", e.target.value)}
                    />
                  </div>
                  <div className="set-cell cell-rir">
                    <select
                      className="form-select set-input-rir"
                      value={loggedRir}
                      onChange={(e) => handleInputChange(exName, setNum, "rir", e.target.value)}
                      disabled={isSetDone}
                    >
                      <option value="">RIR</option>
                      <option value="0">0</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                  </div>
                  <div className="set-cell cell-e1rm" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.2rem" }}>
                    <span>{e1rmText}</span>
                    {isNewPr && <span className="pr-trophy-badge" title="🏆 NEW e1RM PERSONAL RECORD!">🏆</span>}
                  </div>
                  <div className="set-cell cell-check">
                    <button
                      type="button"
                      className={`btn-check-set ${isSetDone ? "checked" : ""}`}
                      onClick={() => handleCompleteToggle(
                        exName,
                        setNum,
                        suggestedLoad,
                        restTimeStr,
                        Date.now(),
                        new Date().toISOString().split("T")[0]
                      )}
                    >
                      {isSetDone ? "✓" : ""}
                    </button>
                  </div>
                </div>

                {isNoteExpanded && (
                  <div className="set-notes-row">
                    <input
                      type="text"
                      className="form-input set-note-input"
                      placeholder="Enter set performance details (e.g. grip slipped, paused last rep, shoulder felt great)..."
                      value={getLogValue(exName, setNum, "notes")}
                      onChange={(e) => handleInputChange(exName, setNum, "notes", e.target.value)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderReadinessBanner = () => {
    if (!latestLog) return null;
    
    if (readinessScore < 30) {
      return (
        <div className="readiness-alert-banner critical-warning animated">
          🚨 <strong>CNS AUTOREGULATION ACTIVE:</strong> Critical recovery strain detected (Readiness: {readinessScore}/100). 
          We've auto-regulated compound lift volumes (<strong>-2 sets</strong>) and eased intensity (<strong>+1 RIR target buffer</strong>) to prevent overtraining.
        </div>
      );
    } else if (readinessScore < 50) {
      return (
        <div className="readiness-alert-banner warning animated">
          ⚠️ <strong>CNS AUTOREGULATION ACTIVE:</strong> Moderate recovery strain detected (Readiness: {readinessScore}/100). 
          We've scaled down compound lift volumes (<strong>-1 set</strong>) to manage systemic fatigue.
        </div>
      );
    } else if (readinessScore >= 75) {
      return (
        <div className="readiness-alert-banner clear-good animated">
          🔥 <strong>CNS GREEN LIGHT:</strong> Excellent recovery detected (Readiness: {readinessScore}/100). 
          Your central nervous system is fully primed. You are cleared to train with high intensity!
        </div>
      );
    }
    return null;
  };

  const groupedExercises = getGroupedExercises();

  return (
    <div className="workout-logger-tab animated">
      {/* SELECTION CARD */}
      <div className="card selection-card">
        <div className="selection-grid">
          <div className="form-group">
            <label className="form-label">Mesocycle</label>
            <select className="form-select" value={meso} onChange={(e) => setMeso(parseInt(e.target.value))}>
              <option value={1}>Meso 1 — Hypertrophy (Weeks 1-5)</option>
              <option value={2}>Meso 2 — Progression (Weeks 6-10)</option>
              <option value={3}>Meso 3 — Peak Overreach (Weeks 11-15)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Week</label>
            <select className="form-select" value={week} onChange={(e) => setWeek(parseInt(e.target.value))}>
              {WEEKS.map((wk, idx) => (
                <option key={idx} value={idx + 1}>
                  {wk.label} ({wk.rir})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Training Day</label>
            <select className="form-select" value={day} onChange={(e) => setDay(parseInt(e.target.value))}>
              <option value={1}>Day 1 — Upper Body (Push Focus)</option>
              <option value={2}>Day 2 — Lower Body (Quad Focus)</option>
              <option value={3}>Day 3 — Upper Body (Pull Focus)</option>
              <option value={4}>Day 4 — Lower Body (Hinge Focus)</option>
            </select>
          </div>
        </div>
        <div className="workout-title-container">
          <h2>{dayData.title}</h2>
          <span className="badge badge-purple">
            Continuous Week: {meso === 1 ? week : meso === 2 ? week + 5 : week + 10}
          </span>
        </div>
      </div>

      {renderReadinessBanner()}

      {/* DYNAMIC JOINT MOBILITY checklist */}
      <div className={`card mobility-card ${mobilityCollapsed ? "collapsed" : ""}`}>
        <div className="mobility-header" onClick={() => setMobilityCollapsed(!mobilityCollapsed)}>
          <div className="mobility-title-side">
            <span className="mobility-icon-badge">🧘</span>
            <div>
              <h4 className="mobility-main-title">Phase 2: Specific Joint Mobilization</h4>
              <p className="mobility-subtitle">
                {isUpperDay ? "Upper Body Movements" : "Lower Body Movements"} (2-3 mins)
              </p>
            </div>
          </div>
          <div className="mobility-right-side">
            {isAllMobilityChecked ? (
              <span className="badge badge-secondary">Warm-up Complete ✓</span>
            ) : (
              <span className="badge badge-muted">Checklist ({mobilityList.filter(item => {
                const key = `${meso}-${week}-${day}-${item.id}`;
                return checkedMobility[key];
              }).length}/3)</span>
            )}
            <span className="chevron-icon">{mobilityCollapsed ? "▲" : "▼"}</span>
          </div>
        </div>

        {!mobilityCollapsed && (
          <div className="mobility-content">
            <div className="mobility-grid">
              {mobilityList.map((item) => {
                const key = `${meso}-${week}-${day}-${item.id}`;
                const isChecked = !!checkedMobility[key];
                return (
                  <div key={item.id} className={`mobility-item-row ${isChecked ? "checked" : ""}`} onClick={() => handleMobilityToggle(item.id)}>
                    <div className="mobility-check-col">
                      <div className={`custom-checkbox-circle ${isChecked ? "active" : ""}`}>
                        {isChecked && "✓"}
                      </div>
                    </div>
                    <div className="mobility-text-col">
                      <div className="mobility-item-header">
                        <span className="mobility-item-name">{item.name}</span>
                        <span className="mobility-item-reps">{item.reps}</span>
                      </div>
                      <p className="mobility-item-desc">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* EXERCISE LIST (GROUPED BY SUPERSET) */}
      <div className="exercise-list">
        {groupedExercises.map((group, groupIdx) => {
          if (group.type === "single") {
            const { ex, exIdx } = group;
            return renderExerciseCard(ex, exIdx);
          } else {
            return (
              <div key={`superset-${group.name}-${groupIdx}`} className="superset-container">
                <div className="superset-header">
                  <span className="superset-icon-badge-inline">⚡</span>
                  <span className="superset-group-title">Superset Sequence {group.name}</span>
                </div>
                <div className="superset-cards-stack">
                  {group.items.map(({ ex, exIdx }) => renderExerciseCard(ex, exIdx, true))}
                </div>
              </div>
            );
          }
        })}
      </div>

      {/* SESSION SUMMARY BAR */}
      <div className="card summary-bar">
        <h3>Session Summary</h3>
        <div className="summary-metrics">
          <div className="metric">
            <span className="metric-label">Session Time</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <span className="metric-val">{formatElapsedTime(sessionElapsed)}</span>
              {sessionElapsed > 0 && (
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button
                    type="button"
                    onClick={handleToggleSessionPause}
                    title={isSessionPaused ? "Resume Session Timer" : "Pause Session Timer"}
                    style={{
                      background: isSessionPaused ? "rgba(57, 255, 20, 0.1)" : "rgba(0, 242, 254, 0.1)",
                      border: isSessionPaused ? "1px solid rgba(57, 255, 20, 0.3)" : "1px solid rgba(0, 242, 254, 0.3)",
                      borderRadius: "6px",
                      color: isSessionPaused ? "var(--color-secondary)" : "var(--color-primary)",
                      padding: "0.2rem 0.5rem",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      transition: "all 0.2s"
                    }}
                  >
                    {isSessionPaused ? "▶ Resume" : "⏸ Pause"}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetSessionTimer}
                    title="Reset Session Timer"
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "6px",
                      color: "var(--color-text-muted)",
                      padding: "0.2rem 0.5rem",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      transition: "all 0.2s"
                    }}
                  >
                    🔄 Reset
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="metric">
            <span className="metric-label">Estimated Tonnage</span>
            <span className="metric-val">{getWeekTonnage().toLocaleString()} lbs</span>
          </div>
        </div>
      </div>

      {/* WORKOUT COMPLETION CELEBRATION MODAL */}
      {showCelebration && (
        <div className="modal-overlay celebration-overlay" onClick={() => setShowCelebration(false)}>
          <div className="modal-card celebration-card animated" onClick={(e) => e.stopPropagation()}>
            <div className="celebration-badge-gold">🎉</div>
            <h2>Session Completed!</h2>
            <p className="celebration-subtext">You crushed your workouts for today. Here is your training performance summary:</p>
            
            <div className="celebration-metrics-grid">
              <div className="celebration-metric-item">
                <span className="cel-label">Time Elapsed</span>
                <span className="cel-val">{formatElapsedTime(sessionElapsed)}</span>
              </div>
              <div className="celebration-metric-item">
                <span className="cel-label">Estimated Tonnage</span>
                <span className="cel-val">{getWeekTonnage().toLocaleString()} lbs</span>
              </div>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: "1rem" }}>
              Autoregulated progression metrics successfully saved to database. Remember to log your recovery and sleep tonight!
            </p>

            <button type="button" className="btn btn-primary btn-full" style={{ marginTop: "1.5rem" }} onClick={() => setShowCelebration(false)}>
              Back to training log
            </button>
          </div>
        </div>
      )}

      {/* EXERCISE SWAP MODAL */}
      <SwapModal
        isOpen={activeSwapIdx !== null}
        onClose={() => {
          setActiveSwapIdx(null);
          setActiveSwapPattern("");
          setActiveSwapCurrent("");
        }}
        pattern={activeSwapPattern}
        currentExercise={activeSwapCurrent}
        onSwap={(newEx) => onUpdateSlotOverride(meso, day, activeSwapIdx, "exercise", newEx)}
      />

      {/* BARBELL PLATE CALCULATOR MODAL */}
      {plateCalcData && (
        <PlateCalculatorModal
          data={plateCalcData}
          onClose={() => setPlateCalcData(null)}
          plateInventory={plateInventory}
        />
      )}

      {/* PR ALERT BADGE */}
      {prAlert && (
        <div className="pr-alert-badge animated-pr-badge">
          <span className="pr-alert-icon">🎉</span>
          <div className="pr-alert-content">
            <span className="pr-alert-title">NEW PERSONAL RECORD!</span>
            <span className="pr-alert-details">{prAlert.exercise}: {prAlert.types}</span>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .selection-card {
          margin-bottom: 1.5rem;
        }
        .selection-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        @media (min-width: 768px) {
          .selection-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .workout-title-container {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }
        @media (min-width: 768px) {
          .workout-title-container {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }
        .workout-title-container h2 {
          font-size: 1.3rem;
          color: var(--color-text-main);
        }
        .ex-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .ex-card-name {
          font-size: 1.1rem;
          margin-top: 0.2rem;
          color: var(--color-text-main);
        }
        .btn-swap-inline {
          font-size: 0.75rem;
          padding: 0.4rem 0.8rem;
        }
        .ex-card-details {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin-bottom: 1rem;
        }
        @media (min-width: 768px) {
          .ex-card-details {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .feeder-sets-banner {
          background: rgba(0, 242, 254, 0.05);
          border: 1px solid rgba(0, 242, 254, 0.15);
          border-radius: 8px;
          padding: 0.75rem 1rem;
          margin-bottom: 1rem;
        }
        .feeder-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--color-primary);
          text-transform: uppercase;
        }
        .feeder-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-top: 0.4rem;
          font-size: 0.9rem;
        }
        .feeder-item span {
          color: var(--color-primary);
          font-weight: bold;
          margin-right: 0.25rem;
        }
        .soreness-alert {
          margin-top: 0.5rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--color-error);
        }
        .sets-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .set-row-wrapper {
          display: flex;
          flex-direction: column;
        }
        .set-row {
          display: grid;
          grid-template-columns: 45px 65px 1fr 80px 1fr 50px 55px 40px;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }
        .set-row.header-row {
          font-weight: 700;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--color-text-muted);
          border-bottom: 2px solid var(--border-color);
        }
        .set-cell {
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        .set-input {
          font-size: 0.85rem;
          padding: 0.4rem 0.5rem;
          text-align: center;
          height: 32px;
          border-radius: 6px;
        }
        .wside-badge {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.2rem 0.4rem;
          background: var(--bg-input);
          border-radius: 4px;
          color: var(--color-text-muted);
          width: 100%;
          text-align: center;
          transition: var(--transition);
        }
        .wside-clickable {
          cursor: pointer;
          background: rgba(0, 242, 254, 0.1);
          color: var(--color-primary);
          border: 1px solid rgba(0, 242, 254, 0.2);
        }
        .wside-clickable:hover {
          background: var(--color-primary);
          color: var(--bg-dark);
          box-shadow: var(--shadow-glow);
          transform: translateY(-1px);
        }
        .warm-up-clickable {
          display: inline-block;
          font-size: 0.85rem;
          font-weight: 700;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          margin: 0 0.2rem;
        }
        .cell-e1rm {
          font-size: 0.85rem;
          font-weight: 600;
          text-align: center;
        }
        .btn-check-set {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          background: var(--bg-input);
          color: white;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-check-set:hover {
          border-color: var(--color-primary);
        }
        .btn-check-set.checked {
          background: var(--color-secondary);
          border-color: var(--color-secondary);
          color: var(--bg-dark);
        }
        .row-done {
          opacity: 0.6;
        }
        .summary-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          margin-bottom: 2rem;
        }
        .summary-metrics {
          display: flex;
          gap: 1.5rem;
        }
        .metric {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .metric-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--color-text-muted);
        }
        .metric-val {
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--color-primary);
        }
        .detail-item-input {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .detail-input {
          height: 24px !important;
          padding: 0 0.25rem !important;
          font-size: 0.75rem !important;
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 4px !important;
          width: 50px !important;
          display: inline-block !important;
          color: white !important;
          text-align: center;
          font-family: var(--font-family);
        }
        .text-detail-input {
          width: 85px !important;
          text-align: left;
        }
        .input-with-unit {
          display: inline-flex;
          align-items: center;
          gap: 0.15rem;
        }
        .unit-label {
          font-size: 0.7rem;
          color: var(--color-text-muted);
        }

        /* DYNAMIC JOINT MOBILITY CARD STYLING */
        .mobility-card {
          margin-bottom: 1.5rem;
          transition: var(--transition);
          border: 1px solid var(--border-color);
        }
        .mobility-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
        }
        .mobility-title-side {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .mobility-icon-badge {
          font-size: 1.6rem;
          background: rgba(176, 38, 255, 0.1);
          padding: 0.4rem;
          border-radius: 8px;
          border: 1px solid rgba(176, 38, 255, 0.2);
        }
        .mobility-main-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-text-main);
        }
        .mobility-subtitle {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: 0.1rem;
        }
        .mobility-right-side {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .mobility-content {
          margin-top: 1.25rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
          animation: fadeIn 0.25s ease-out;
        }
        .mobility-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .mobility-item-row {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 8px;
          cursor: pointer;
          transition: var(--transition);
        }
        .mobility-item-row:hover {
          border-color: rgba(176, 38, 255, 0.2);
          background: rgba(176, 38, 255, 0.02);
        }
        .mobility-item-row.checked {
          border-color: rgba(57, 255, 20, 0.15);
          background: rgba(57, 255, 20, 0.02);
        }
        .custom-checkbox-circle {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: bold;
          color: var(--bg-dark);
          transition: var(--transition);
        }
        .custom-checkbox-circle.active {
          background: var(--color-secondary);
          border-color: var(--color-secondary);
        }
        .mobility-text-col {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          flex: 1;
        }
        .mobility-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .mobility-item-name {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--color-text-main);
        }
        .mobility-item-reps {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-primary);
          background: rgba(0, 242, 254, 0.1);
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
        }
        .mobility-item-desc {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          line-height: 1.3;
        }

        /* BARBELL PLATE CALCULATOR VISUAL DIALOG */
        .plate-calc-modal {
          max-width: 440px !important;
        }
        .calc-summary {
          text-align: center;
          margin-bottom: 1.25rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
        }
        .calc-ex-name {
          font-size: 1.15rem;
          color: var(--color-text-main);
          margin-bottom: 0.25rem;
        }
        .calc-weight-row {
          display: inline-flex;
          align-items: baseline;
          gap: 0.35rem;
          margin-bottom: 0.5rem;
        }
        .calc-total-wt {
          font-size: 2rem;
          font-weight: 800;
          color: var(--color-primary);
        }
        .calc-label-small {
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--color-text-muted);
        }
        .calc-details-p {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          line-height: 1.4;
        }
        .calc-details-p strong {
          color: var(--color-text-main);
        }
        .barbell-visual-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          margin-bottom: 1.25rem;
          overflow-x: auto;
          min-height: 180px;
        }
        .barbell-sleeve-area {
          display: flex;
          align-items: center;
          position: relative;
        }
        .barbell-collar {
          width: 15px;
          height: 150px;
          background: linear-gradient(to right, #333, #000);
          border: 1px solid #444;
          border-radius: 4px 0 0 4px;
          z-index: 5;
        }
        .barbell-sleeve-shaft {
          height: 30px;
          width: 250px;
          background: linear-gradient(to bottom, #dcdcdc, #999, #666);
          border: 1px solid #777;
          border-left: none;
          border-radius: 0 6px 6px 0;
          display: flex;
          align-items: center;
          position: relative;
        }
        .plates-stack {
          display: flex;
          align-items: center;
          position: absolute;
          left: 0;
          height: 100%;
          gap: 1.5px;
        }
        .visual-plate {
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(0, 0, 0, 0.5);
          font-size: 0.65rem;
          font-weight: 800;
          box-shadow: 2px 0 5px rgba(0, 0, 0, 0.3);
          box-sizing: border-box;
          z-index: 10;
        }
        .visual-plate-label {
          display: inline-block;
          transform: rotate(-90deg);
          white-space: nowrap;
          pointer-events: none;
        }
        .empty-sleeve-msg {
          text-align: center;
          padding: 2rem;
          font-size: 0.9rem;
          color: var(--color-text-muted);
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed var(--border-color);
          border-radius: 8px;
          margin-bottom: 1.25rem;
        }
        .written-breakdown {
          padding-top: 0.5rem;
        }
        .written-breakdown h5 {
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          margin-bottom: 0.75rem;
        }
        .plates-list-grid {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.02);
          padding: 0.75rem;
          border-radius: 8px;
        }
        .plate-list-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }
        .plate-bullet {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          border: 1px solid rgba(0, 0, 0, 0.3);
          display: inline-block;
        }
        .plate-qty {
          font-weight: bold;
          color: var(--color-text-main);
        }
        .plate-name {
          color: var(--color-text-muted);
        }
        .remainder-warning-box {
          margin-top: 1rem;
          background: rgba(255, 56, 96, 0.08);
          border: 1px solid var(--color-error);
          border-radius: 8px;
          padding: 0.75rem;
          font-size: 0.8rem;
          color: var(--color-error);
          line-height: 1.4;
        }
        .warning-detail {
          color: var(--color-text-muted);
        }
        .no-plates-msg {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          font-style: italic;
        }

        /* CNS READINESS STYLES */
        .cns-readiness-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px dashed rgba(0, 242, 254, 0.15);
        }
        .cns-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--color-text-main);
        }
        .cns-buttons {
          display: flex;
          gap: 0.35rem;
        }
        .cns-btn {
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.02);
          color: var(--color-text-muted);
          font-family: var(--font-family);
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.6rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cns-btn:hover {
          color: var(--color-primary);
          border-color: var(--color-primary);
        }
        .cns-btn-fast.active {
          background: rgba(0, 242, 254, 0.15);
          color: var(--color-primary);
          border-color: var(--color-primary);
          box-shadow: 0 0 10px rgba(0, 242, 254, 0.2);
        }
        .cns-btn-normal.active {
          background: rgba(57, 255, 20, 0.15);
          color: var(--color-secondary);
          border-color: var(--color-secondary);
          box-shadow: 0 0 10px rgba(57, 255, 20, 0.2);
        }
        .cns-btn-slow.active {
          background: rgba(255, 184, 0, 0.15);
          color: var(--color-warning);
          border-color: var(--color-warning);
          box-shadow: 0 0 10px rgba(255, 184, 0, 0.2);
        }
        .cns-fatigue-warning {
          background: rgba(255, 184, 0, 0.08);
          border: 1px solid var(--color-warning);
          color: var(--color-warning);
          border-radius: 8px;
          padding: 0.75rem;
          margin-bottom: 1rem;
          font-size: 0.8rem;
          line-height: 1.4;
        }
        .cns-scaled-text {
          color: var(--color-warning);
          font-weight: 700;
          text-shadow: 0 0 10px rgba(255, 184, 0, 0.2);
        }

        /* NEW STYLES FOR SUGGESTIONS IMPLEMENTATION */
        .set-input-rir {
          font-size: 0.8rem;
          padding: 0.2rem;
          height: 32px;
          border-radius: 6px;
          background: var(--bg-input);
          color: var(--color-text-main);
          border: 1px solid var(--border-color);
          text-align: center;
        }
        .btn-note-toggle {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.8rem;
          padding: 0;
          opacity: 0.5;
          transition: var(--transition);
        }
        .btn-note-toggle:hover, .btn-note-toggle.active {
          opacity: 1;
        }
        .set-notes-row {
          padding: 0.25rem 0.5rem 0.5rem 0.5rem;
          border-bottom: 1px dashed var(--border-color);
        }
        .set-note-input {
          width: 100%;
          font-size: 0.8rem !important;
          padding: 0.35rem 0.5rem !important;
          border-radius: 4px !important;
          height: auto !important;
          background: rgba(255, 255, 255, 0.02) !important;
          border: 1px solid var(--border-color) !important;
          color: var(--color-text-main) !important;
        }
        .pr-trophy-badge {
          color: gold;
          font-size: 0.95rem;
          cursor: help;
          animation: bounce 1s infinite alternate;
        }
        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-3px); }
        }
        .ex-demo-link {
          font-size: 0.75rem;
          color: var(--color-primary);
          text-decoration: none;
          margin-left: 0.5rem;
          background: rgba(0, 242, 254, 0.08);
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          border: 1px solid rgba(0, 242, 254, 0.2);
          transition: var(--transition);
        }
        .ex-demo-link:hover {
          background: var(--color-primary);
          color: var(--bg-dark);
        }
        .btn-feeder-toggle {
          font-size: 0.75rem !important;
          padding: 0.3rem 0.6rem !important;
          height: auto !important;
          margin-bottom: 0.5rem;
        }
        .coaching-advice-banner {
          background: rgba(255, 184, 0, 0.04);
          border: 1px dashed rgba(255, 184, 0, 0.2);
          color: var(--color-text-main);
          font-size: 0.8rem;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          margin-bottom: 0.75rem;
        }
        .coaching-detail-txt {
          color: var(--color-text-muted);
          font-size: 0.75rem;
        }

        /* SUPERSET STYLES */
        .superset-container {
          border: 1px solid rgba(176, 38, 255, 0.2);
          border-left: 5px solid var(--color-accent);
          background: rgba(176, 38, 255, 0.02);
          border-radius: 10px;
          padding: 1rem;
          margin-bottom: 1.5rem;
          position: relative;
        }
        .superset-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(176, 38, 255, 0.1);
        }
        .superset-icon-badge-inline {
          font-size: 0.95rem;
          background: var(--color-accent);
          color: white;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          font-weight: bold;
        }
        .superset-group-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--color-text-main);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .superset-cards-stack {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .superset-card-nested {
          margin-bottom: 0 !important;
          background: rgba(0, 0, 0, 0.15) !important;
          box-shadow: none !important;
          border-color: rgba(255, 255, 255, 0.03) !important;
        }

        /* CELEBRATION MODAL */
        .celebration-overlay {
          background: rgba(0, 0, 0, 0.8) !important;
          backdrop-filter: blur(8px);
        }
        .celebration-card {
          text-align: center;
          padding: 2.5rem 2rem !important;
          max-width: 450px !important;
          border: 1px solid var(--color-secondary) !important;
          box-shadow: 0 0 30px rgba(57, 255, 20, 0.15) !important;
        }
        .celebration-badge-gold {
          font-size: 3.5rem;
          margin-bottom: 1rem;
          animation: celPulse 1.5s infinite alternate;
        }
        @keyframes celPulse {
          from { transform: scale(1); }
          to { transform: scale(1.1); }
        }
        .celebration-subtext {
          font-size: 0.9rem;
          color: var(--color-text-muted);
          margin-bottom: 1.5rem;
        }
        .celebration-metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
          background: rgba(255, 255, 255, 0.02);
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }
        .celebration-metric-item {
          display: flex;
          flex-direction: column;
        }
        .cel-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          color: var(--color-text-muted);
          font-weight: 700;
        }
        .cel-val {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--color-primary);
          margin-top: 0.25rem;
        }

        /* VALIDATION & DEVIATION STYLES */
        .input-warning {
          border-color: var(--color-warning) !important;
          color: var(--color-warning) !important;
          box-shadow: 0 0 8px rgba(255, 184, 0, 0.2) !important;
        }
        .dev-warn-indicator {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-warning);
          font-size: 0.95rem;
          cursor: help;
        }

        /* RESPONSIVE MOBILE GRID OPTIMIZATION */
        @media (max-width: 767px) {
          .set-row {
            grid-template-columns: 30px 1fr 65px 1fr 45px 32px !important;
          }
          .cell-wside, .cell-e1rm {
            display: none !important;
          }
          .set-input-rir {
            font-size: 0.75rem;
            padding: 0.1rem;
          }
        }
      ` }} />
    </div>
  );
}
