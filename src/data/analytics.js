// Analytics calculations for health and recovery data

// Helper to get 30-day baseline for HRV (excluding today to get baseline)
export const get30DayHRVBaseline = (logs, targetDateStr) => {
  const targetDate = new Date(targetDateStr);
  const thirtyDaysAgo = new Date(targetDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const inRange = logs.filter(log => {
    const d = new Date(log.date);
    return d >= thirtyDaysAgo && d < targetDate;
  });

  const hrvVals = inRange.map(l => l.hrv).filter(v => v !== undefined && v !== null);
  return hrvVals.length > 0 ? hrvVals.reduce((a, b) => a + b, 0) / hrvVals.length : null;
};

// Helper to get 30-day baseline for RHR
export const get30DayRHRBaseline = (logs, targetDateStr) => {
  const targetDate = new Date(targetDateStr);
  const thirtyDaysAgo = new Date(targetDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const inRange = logs.filter(log => {
    const d = new Date(log.date);
    return d >= thirtyDaysAgo && d < targetDate;
  });

  const rhrVals = inRange.map(l => l.rhr).filter(v => v !== undefined && v !== null);
  return rhrVals.length > 0 ? rhrVals.reduce((a, b) => a + b, 0) / rhrVals.length : null;
};

// Calculate 0-100 Readiness Score based on today's logs + historical baselines
export const calculateReadiness = (log, logs = []) => {
  if (!log) return { score: 70, breakdown: {}, totalWeight: 0 }; // fallback default

  const sleep = log.sleep; // 1-5
  const fatigue = log.fatigue; // 1-5
  const soreness = log.soreness; // 1-5
  const rhr = log.rhr;
  const hrv = log.hrv;

  const hrvBaseline = get30DayHRVBaseline(logs, log.date);
  const rhrBaseline = get30DayRHRBaseline(logs, log.date);

  let totalWeight = 0;
  let weightedSum = 0;

  const breakdown = {};

  // 1. Sleep: 30% weight
  if (sleep !== undefined && sleep !== null) {
    const sleepScores = { 5: 100, 4: 85, 3: 60, 2: 30, 1: 10 };
    const sleepScore = sleepScores[sleep] || 60;
    weightedSum += sleepScore * 0.30;
    totalWeight += 0.30;
    breakdown.sleep = sleepScore;
  }

  // 2. Fatigue: 15% weight (lower is better)
  if (fatigue !== undefined && fatigue !== null) {
    const fatigueScores = { 1: 100, 2: 85, 3: 60, 4: 30, 5: 10 };
    const fatigueScore = fatigueScores[fatigue] || 60;
    weightedSum += fatigueScore * 0.15;
    totalWeight += 0.15;
    breakdown.fatigue = fatigueScore;
  }

  // 3. Soreness: 10% weight (lower is better)
  if (soreness !== undefined && soreness !== null) {
    const sorenessScores = { 1: 100, 2: 85, 3: 60, 4: 30, 5: 10 };
    const sorenessScore = sorenessScores[soreness] || 60;
    weightedSum += sorenessScore * 0.10;
    totalWeight += 0.10;
    breakdown.soreness = sorenessScore;
  }

  // 4. RHR: 20% weight
  if (rhr !== undefined && rhr !== null) {
    let rhrScore;
    if (rhrBaseline) {
      const diff = rhr - rhrBaseline;
      if (diff <= 0) rhrScore = 100;
      else rhrScore = Math.max(0, 100 - diff * 8); // +5 bpm -> 60, +10 bpm -> 20, +12.5 bpm -> 0
    } else {
      // static fallback
      if (rhr <= 55) rhrScore = 100;
      else if (rhr >= 80) rhrScore = 0;
      else rhrScore = 100 - ((rhr - 55) / 25) * 100;
    }
    weightedSum += rhrScore * 0.20;
    totalWeight += 0.20;
    breakdown.rhr = Math.round(rhrScore);
  }

  // 5. HRV: 25% weight
  if (hrv !== undefined && hrv !== null) {
    let hrvScore;
    if (hrvBaseline && hrvBaseline > 0) {
      const pct = (hrv - hrvBaseline) / hrvBaseline;
      if (pct >= 0) hrvScore = 100;
      else hrvScore = Math.max(0, 100 + pct * 300); // -10% -> 70, -20% -> 40, -30% -> 10, -33% -> 0
    } else {
      // static fallback
      if (hrv >= 70) hrvScore = 100;
      else if (hrv <= 35) hrvScore = 0;
      else hrvScore = ((hrv - 35) / 35) * 100;
    }
    weightedSum += hrvScore * 0.25;
    totalWeight += 0.25;
    breakdown.hrv = Math.round(hrvScore);
  }

  const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 70;
  return { score, breakdown, totalWeight };
};

// Calculate 7-day exponentially weighted moving average for bodyweight
export const calculateEWMAWeight = (logs, alpha = 0.25) => {
  const sorted = [...logs]
    .filter(l => l.weight)
    .sort((a, b) => a.timestamp - b.timestamp);

  let currentEWMA = null;
  return sorted.map((log) => {
    const weight = parseFloat(log.weight);
    if (currentEWMA === null) {
      currentEWMA = weight;
    } else {
      currentEWMA = alpha * weight + (1 - alpha) * currentEWMA;
    }
    return {
      ...log,
      ewma: parseFloat(currentEWMA.toFixed(1))
    };
  });
};

// Calculate caloric balance and rate of weight change
export const getCaloricPhaseInfo = (logs) => {
  const sorted = [...logs]
    .filter(l => l.weight)
    .sort((a, b) => b.timestamp - a.timestamp); // newest first

  if (sorted.length < 7) {
    return { change: 0, phase: "Awaiting Data", kcalOffset: 0 };
  }

  const last7 = sorted.slice(0, 7);
  const last7Avg = last7.reduce((acc, l) => acc + parseFloat(l.weight), 0) / 7;

  const prev7 = sorted.slice(7, 14);
  if (prev7.length < 3) {
    const rest = sorted.slice(7);
    const restAvg = rest.reduce((acc, l) => acc + parseFloat(l.weight), 0) / rest.length;
    const diff = last7Avg - restAvg;
    const phase = diff > 0.3 ? "Lean Bulk" : diff < -0.3 ? "Cutting" : "Maintenance";
    return {
      change: parseFloat(diff.toFixed(1)),
      phase,
      kcalOffset: Math.round((diff * 3500) / 7)
    };
  }

  const prev7Avg = prev7.reduce((acc, l) => acc + parseFloat(l.weight), 0) / prev7.length;
  const diff = last7Avg - prev7Avg;
  
  let phase = "Maintenance";
  if (diff > 0.3) phase = "Lean Bulk";
  else if (diff < -0.3) phase = "Cutting";

  return {
    change: parseFloat(diff.toFixed(1)),
    phase,
    kcalOffset: Math.round((diff * 3500) / 7) // daily kcal offset
  };
};

// Correlate sleep ratings (prior night) vs workout tonnage
export const calculateSleepPerformanceCorrelation = (sessionLogs, recoveryLogs) => {
  const points = [];
  Object.entries(sessionLogs || {}).forEach(([key, session]) => {
    if (!session.tonnage || !session.completedAt) return;
    
    const dateStr = new Date(session.completedAt).toISOString().split("T")[0];
    const recLog = recoveryLogs.find(l => l.date === dateStr);
    if (recLog && recLog.sleep) {
      points.push({
        sleep: recLog.sleep,
        tonnage: session.tonnage,
        label: key
      });
    }
  });
  return points;
};

// Calculate weekly average fatigue vs weekly total sets completed
export const calculateFatigueSetsTimeline = (workoutLogs, recoveryLogs) => {
  const weeklyData = {};

  for (let w = 1; w <= 5; w++) {
    weeklyData[w] = { sets: 0, fatigueSum: 0, fatigueCount: 0 };
  }

  Object.keys(workoutLogs || {}).forEach(key => {
    const parts = key.split("-");
    if (parts.length >= 2) {
      const weekNum = parseInt(parts[1], 10);
      const log = workoutLogs[key];
      if (log.completed && weeklyData[weekNum]) {
        weeklyData[weekNum].sets += 1;
      }
    }
  });

  recoveryLogs.forEach(log => {
    let logWeek = 1;
    let minTimeDiff = Infinity;
    
    Object.entries(workoutLogs || {}).forEach(([key, wLog]) => {
      if (wLog.timestamp && log.timestamp) {
        const diff = Math.abs(wLog.timestamp - log.timestamp);
        if (diff < minTimeDiff) {
          minTimeDiff = diff;
          const parts = key.split("-");
          logWeek = parseInt(parts[1], 10);
        }
      }
    });

    if (weeklyData[logWeek] && log.fatigue) {
      weeklyData[logWeek].fatigueSum += log.fatigue;
      weeklyData[logWeek].fatigueCount += 1;
    }
  });

  return Object.entries(weeklyData).map(([week, val]) => ({
    week: `Week ${week}`,
    sets: val.sets,
    avgFatigue: val.fatigueCount > 0 ? parseFloat((val.fatigueSum / val.fatigueCount).toFixed(1)) : 0
  }));
};

// Calculate logging consistency, sleep quality, and workout completion streaks
export const calculateStreaks = (workoutLogs, recoveryLogs) => {
  let loggingStreak = 0;
  const sortedRecovery = [...recoveryLogs]
    .map(l => l.date)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (sortedRecovery.length > 0) {
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    
    let currentCheck = sortedRecovery[0];
    const isLoggingToday = currentCheck === todayStr;
    const isLoggingYesterday = currentCheck === yesterdayStr;
    
    if (isLoggingToday || isLoggingYesterday) {
      loggingStreak = 1;
      let lastTime = new Date(currentCheck).getTime();
      for (let i = 1; i < sortedRecovery.length; i++) {
        const thisTime = new Date(sortedRecovery[i]).getTime();
        const diffDays = Math.round((lastTime - thisTime) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          loggingStreak++;
          lastTime = thisTime;
        } else if (diffDays > 1) {
          break;
        }
      }
    }
  }

  let sleepStreak = 0;
  const sortedByDate = [...recoveryLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  for (const log of sortedByDate) {
    if (log.sleep >= 4) {
      sleepStreak++;
    } else {
      break;
    }
  }

  const completedDays = new Set();
  Object.keys(workoutLogs || {}).forEach(key => {
    const parts = key.split("-");
    if (parts.length >= 3) {
      const mesoNum = parts[0];
      const weekNum = parts[1];
      const dayNum = parts[2];
      const log = workoutLogs[key];
      if (log.completed) {
        completedDays.add(`${mesoNum}-${weekNum}-${dayNum}`);
      }
    }
  });
  const workoutStreak = completedDays.size;

  return { loggingStreak, sleepStreak, workoutStreak };
};

// Generate pre-formatted weekly summary text for export
export const generateWeeklySummaryText = (workoutLogs, recoveryLogs, cardioLogs, weekNum, mesoNum = 1) => {
  let totalSets = 0;
  let totalTonnage = 0;
  
  Object.keys(workoutLogs || {}).forEach(key => {
    const parts = key.split("-");
    if (parts[0] === String(mesoNum) && parts[1] === String(weekNum)) {
      const log = workoutLogs[key];
      if (log.completed && log.weight && log.reps) {
        totalSets += 1;
        totalTonnage += parseFloat(log.weight) * parseInt(log.reps, 10);
      }
    }
  });

  const weekRecLogs = recoveryLogs.filter(log => {
    let logWeek = 1;
    let minDiff = Infinity;
    Object.entries(workoutLogs || {}).forEach(([wKey, wLog]) => {
      if (wLog.timestamp && log.timestamp) {
        const diff = Math.abs(wLog.timestamp - log.timestamp);
        if (diff < minDiff) {
          minDiff = diff;
          logWeek = parseInt(wKey.split("-")[1], 10);
        }
      }
    });
    return logWeek === weekNum;
  });

  const avgSleep = weekRecLogs.length > 0 
    ? (weekRecLogs.reduce((acc, l) => acc + l.sleep, 0) / weekRecLogs.length).toFixed(1) 
    : "N/A";
    
  const rhrLogs = weekRecLogs.filter(l => l.rhr);
  const avgRHR = rhrLogs.length > 0 
    ? Math.round(rhrLogs.reduce((acc, l) => acc + l.rhr, 0) / rhrLogs.length) + " bpm"
    : "N/A";
    
  const hrvLogs = weekRecLogs.filter(l => l.hrv);
  const avgHRV = hrvLogs.length > 0 
    ? Math.round(hrvLogs.reduce((acc, l) => acc + l.hrv, 0) / hrvLogs.length) + " ms"
    : "N/A";

  let wtChange = "N/A";
  const weightLogs = weekRecLogs
    .filter(l => l.weight)
    .sort((a, b) => (a.timestamp || new Date(a.date).getTime()) - (b.timestamp || new Date(b.date).getTime()));
  if (weightLogs.length >= 2) {
    const diff = parseFloat(weightLogs[weightLogs.length - 1].weight) - parseFloat(weightLogs[0].weight);
    wtChange = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)} lbs`;
  } else if (weightLogs.length === 1) {
    wtChange = `${weightLogs[0].weight} lbs (1 entry)`;
  }

  let cardioSessions = 0;
  let cardioDuration = 0;
  for (let s = 1; s <= 3; s++) {
    const key = `m${mesoNum}_w${weekNum}_s${s}`;
    const oldKey = `w${weekNum}_s${s}`;
    const log = (cardioLogs?.[key] || cardioLogs?.[oldKey]);
    if (log?.completed) {
      cardioSessions += 1;
      cardioDuration += log.duration || 0;
    }
  }

  return `📊 Home Gym Hypertrophy - Meso ${mesoNum} Week ${weekNum} Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏋️ LIFTING
  • Completed Sets: ${totalSets}
  • Estimated Tonnage: ${totalTonnage.toLocaleString()} lbs

🏃 CARDIO
  • Completed Sessions: ${cardioSessions}/3
  • Total Duration: ${cardioDuration} mins

😴 HEALTH & RECOVERY
  • Avg Sleep Quality: ${avgSleep}/5
  • Avg Resting HR: ${avgRHR}
  • Avg HRV: ${avgHRV}
  • Weight Change: ${wtChange}

Cleared for progression. Keep pushing!`;
};

// --- ROUND 6 ADDITIONS ---

// 1. PR Detection
export const detectPRs = (workoutLogs, exerciseName, targetKey, targetLog) => {
  const currentWeight = parseFloat(targetLog.weight);
  const currentReps = parseInt(targetLog.reps, 10);
  if (!currentWeight || !currentReps || !targetLog.completed) {
    return { isWeightPR: false, isRepPR: false, isVolumePR: false };
  }

  let isWeightPR = false;
  let isRepPR = false;
  let isVolumePR = false;

  const keyParts = targetKey.split("-");
  const targetSessionPrefix = keyParts.slice(0, 3).join("-"); // e.g. "1-2-1"

  const otherSets = [];
  const sessionTonnages = {};

  Object.entries(workoutLogs).forEach(([key, log]) => {
    if (key === targetKey || !log.completed) return;
    const parts = key.split("-");
    const exName = parts.slice(3, -1).join("-");
    if (exName !== exerciseName) return;

    const w = parseFloat(log.weight);
    const r = parseInt(log.reps, 10);
    if (!w || !r) return;

    otherSets.push({ weight: w, reps: r, key });

    const sessionPrefix = parts.slice(0, 3).join("-");
    sessionTonnages[sessionPrefix] = (sessionTonnages[sessionPrefix] || 0) + (w * r);
  });

  // Calculate current session tonnage including the new set
  let currentSessionTonnage = currentWeight * currentReps;
  Object.entries(workoutLogs).forEach(([key, log]) => {
    if (key !== targetKey && log.completed) {
      const parts = key.split("-");
      const sessionPrefix = parts.slice(0, 3).join("-");
      if (sessionPrefix === targetSessionPrefix) {
        const exName = parts.slice(3, -1).join("-");
        if (exName === exerciseName) {
          const w = parseFloat(log.weight);
          const r = parseInt(log.reps, 10);
          if (w && r) {
            currentSessionTonnage += w * r;
          }
        }
      }
    }
  });

  if (otherSets.length === 0 || currentWeight > Math.max(...otherSets.map(s => s.weight))) {
    isWeightPR = true;
  }

  const setsAtSameWeight = otherSets.filter(s => s.weight === currentWeight);
  if (setsAtSameWeight.length === 0 || currentReps > Math.max(...setsAtSameWeight.map(s => s.reps))) {
    isRepPR = true;
  }

  const otherSessions = Object.keys(sessionTonnages).filter(s => s !== targetSessionPrefix);
  const maxOtherSessionTonnage = otherSessions.length > 0 
    ? Math.max(...otherSessions.map(s => sessionTonnages[s])) 
    : 0;

  if (otherSessions.length === 0 || currentSessionTonnage > maxOtherSessionTonnage) {
    isVolumePR = true;
  }

  return { isWeightPR, isRepPR, isVolumePR };
};

// 2. Count Total PRs in History
export const countTotalPRs = (workoutLogs) => {
  const sortedSets = [];
  Object.entries(workoutLogs).forEach(([key, log]) => {
    if (!log.completed) return;
    const parts = key.split("-");
    const exerciseName = parts.slice(3, -1).join("-");
    const w = parseFloat(log.weight);
    const r = parseInt(log.reps, 10);
    if (!w || !r) return;
    const sessionPrefix = parts.slice(0, 3).join("-");
    sortedSets.push({
      key,
      exerciseName,
      weight: w,
      reps: r,
      timestamp: log.timestamp || 0,
      sessionPrefix
    });
  });

  sortedSets.sort((a, b) => a.timestamp - b.timestamp);

  const history = {};
  let totalPRCount = 0;

  sortedSets.forEach(set => {
    const { exerciseName, weight, reps, sessionPrefix } = set;
    if (!history[exerciseName]) {
      history[exerciseName] = {
        maxWeight: 0,
        repsAtWeight: {},
        maxSessionTonnage: 0,
        sessionTonnages: {}
      };
    }

    const exHistory = history[exerciseName];
    let isPR = false;

    if (weight > exHistory.maxWeight) {
      exHistory.maxWeight = weight;
      isPR = true;
    }

    const maxRepsAtWeight = exHistory.repsAtWeight[weight] || 0;
    if (reps > maxRepsAtWeight) {
      exHistory.repsAtWeight[weight] = reps;
      isPR = true;
    }

    const prevTonnage = exHistory.sessionTonnages[sessionPrefix] || 0;
    exHistory.sessionTonnages[sessionPrefix] = prevTonnage + (weight * reps);
    const currentTonnage = exHistory.sessionTonnages[sessionPrefix];

    if (currentTonnage > exHistory.maxSessionTonnage) {
      exHistory.maxSessionTonnage = currentTonnage;
      isPR = true;
    }

    if (isPR) {
      totalPRCount++;
    }
  });

  return totalPRCount;
};

// 3. Get e1RM History
export const getE1RMHistory = (workoutLogs, exerciseName) => {
  const sessionE1rm = {};
  
  Object.entries(workoutLogs).forEach(([key, log]) => {
    if (!log.completed) return;
    const parts = key.split("-");
    const exName = parts.slice(3, -1).join("-");
    if (exName !== exerciseName) return;

    const w = parseFloat(log.weight);
    const r = parseInt(log.reps, 10);
    if (!w || !r) return;

    const e1RM = w * (1 + r / 30);
    const sessionPrefix = parts.slice(0, 3).join("-");
    const date = log.date || (log.timestamp ? new Date(log.timestamp).toISOString().split("T")[0] : "");
    const timestamp = log.timestamp || (log.date ? new Date(log.date).getTime() : 0);

    if (!sessionE1rm[sessionPrefix] || e1RM > sessionE1rm[sessionPrefix].e1RM) {
      sessionE1rm[sessionPrefix] = { e1RM, date, timestamp };
    }
  });

  return Object.values(sessionE1rm).sort((a, b) => a.timestamp - b.timestamp);
};

// 4. Mesocycle Comparison
export const compareMesocycles = (workoutLogs, recoveryLogs, sessionLogs, cardioLogs, meso1, meso2) => {
  const getMesoMetrics = (meso) => {
    let totalTonnage = 0;
    const activeWeeks = new Set();
    Object.entries(workoutLogs).forEach(([key, log]) => {
      if (!log.completed) return;
      const parts = key.split("-");
      if (parts[0] === String(meso)) {
        activeWeeks.add(parts[1]);
        const w = parseFloat(log.weight);
        const r = parseInt(log.reps, 10);
        if (w && r) {
          totalTonnage += w * r;
        }
      }
    });
    const weeksCount = activeWeeks.size || 1;
    const avgWeeklyTonnage = totalTonnage / weeksCount;

    let minTime = Infinity;
    let maxTime = -Infinity;
    Object.entries(workoutLogs).forEach(([key, log]) => {
      if (key.startsWith(`${meso}-`) && log.timestamp) {
        if (log.timestamp < minTime) minTime = log.timestamp;
        if (log.timestamp > maxTime) maxTime = log.timestamp;
      }
    });

    let mesoRecLogs = [];
    if (minTime !== Infinity) {
      const buffer = 24 * 60 * 60 * 1000;
      mesoRecLogs = recoveryLogs.filter(log => {
        const logTime = log.timestamp || new Date(log.date).getTime();
        return logTime >= (minTime - buffer) && logTime <= (maxTime + buffer);
      });
    }

    const readinessScores = mesoRecLogs.map(log => calculateReadiness(log, recoveryLogs).score);
    const avgReadiness = readinessScores.length > 0 ? readinessScores.reduce((a, b) => a + b, 0) / readinessScores.length : 0;

    const sleepScores = mesoRecLogs.map(log => log.sleep).filter(s => s !== undefined && s !== null);
    const avgSleep = sleepScores.length > 0 ? sleepScores.reduce((a, b) => a + b, 0) / sleepScores.length : 0;

    const weightLogs = mesoRecLogs
      .filter(l => l.weight)
      .sort((a, b) => (a.timestamp || new Date(a.date).getTime()) - (b.timestamp || new Date(b.date).getTime()));
    let weightChange = 0;
    if (weightLogs.length >= 2) {
      weightChange = parseFloat(weightLogs[weightLogs.length - 1].weight) - parseFloat(weightLogs[0].weight);
    }

    const anchorLifts = [
      "Incline Barbell Bench Press",
      "High Bar Barbell Squat",
      "One-Arm Dumbbell Row",
      "Conventional Barbell Deadlift",
      "Standing Barbell Overhead Press"
    ];
    let sumBestE1rm = 0;
    let anchorCount = 0;
    anchorLifts.forEach(exName => {
      let maxE1rm = 0;
      Object.keys(workoutLogs).forEach((key) => {
        const parts = key.split("-");
        if (parts[0] === String(meso) && parts.slice(3, -1).join("-") === exName) {
          const log = workoutLogs[key];
          if (log.completed && log.weight && log.reps > 0) {
            const e1rm = parseFloat(log.weight) * (1 + parseInt(log.reps) / 30);
            if (e1rm > maxE1rm) maxE1rm = e1rm;
          }
        }
      });
      if (maxE1rm > 0) {
        sumBestE1rm += maxE1rm;
        anchorCount++;
      }
    });
    const avgE1RM = anchorCount > 0 ? sumBestE1rm / anchorCount : 0;

    let totalCardioMin = 0;
    Object.entries(cardioLogs || {}).forEach(([key, log]) => {
      if (log.completed) {
        if (key.startsWith(`m${meso}_`)) {
          totalCardioMin += parseFloat(log.duration) || 0;
        } else if (meso === 1 && !key.includes("_w") && key.startsWith("w")) {
          totalCardioMin += parseFloat(log.duration) || 0;
        }
      }
    });

    return {
      avgWeeklyTonnage,
      avgReadiness,
      avgSleep,
      weightChange,
      avgE1RM,
      totalCardioMin
    };
  };

  const m1 = getMesoMetrics(meso1);
  const m2 = getMesoMetrics(meso2);

  const calculateDelta = (v1, v2) => {
    if (!v1) return { pct: 0, text: "—", direction: "flat" };
    const diff = v2 - v1;
    const pct = (diff / v1) * 100;
    const text = `${diff >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
    const direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
    return { pct, text, direction };
  };

  return {
    m1,
    m2,
    deltas: {
      tonnage: calculateDelta(m1.avgWeeklyTonnage, m2.avgWeeklyTonnage),
      readiness: calculateDelta(m1.avgReadiness, m2.avgReadiness),
      sleep: calculateDelta(m1.avgSleep, m2.avgSleep),
      e1rm: calculateDelta(m1.avgE1RM, m2.avgE1RM),
      cardio: calculateDelta(m1.totalCardioMin, m2.totalCardioMin),
      weightChangeDiff: m2.weightChange - m1.weightChange
    }
  };
};

// 5. Linear Regression Readiness Prediction
export const predictNextReadiness = (recoveryLogs) => {
  const sortedLogs = [...recoveryLogs]
    .filter(log => log.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const last7Logs = sortedLogs.slice(-7);
  if (last7Logs.length < 3) {
    return {
      slope: 0,
      predictedScore: 70,
      text: "Awaiting more recovery logs to predict tomorrow's readiness.",
      status: "stable"
    };
  }

  const dataPoints = last7Logs.map((log, index) => {
    const { score } = calculateReadiness(log, recoveryLogs);
    return { x: index, y: score };
  });

  const n = dataPoints.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  dataPoints.forEach(p => {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const predictedScore = Math.min(100, Math.max(0, Math.round(slope * n + intercept)));

  let text = "✅ Recovery trend stable. Continue training as programmed.";
  let status = "stable";

  if (slope <= -1.5) {
    text = `⚠️ Readiness declining ${Math.abs(slope).toFixed(1)} pts/day — consider scheduling a rest day this week.`;
    status = "declining";
  } else if (slope >= 1.5) {
    text = `🚀 Recovery trend rising (+${slope.toFixed(1)} pts/day). Great adaptation!`;
    status = "rising";
  }

  return {
    slope,
    predictedScore,
    text,
    status
  };
};

// 6. Smart Weight Suggestions
export const getSmartWeightSuggestion = (workoutLogs, exerciseName, readinessScore) => {
  const completedSets = [];
  Object.entries(workoutLogs).forEach(([key, log]) => {
    if (!log.completed) return;
    const parts = key.split("-");
    const exName = parts.slice(3, -1).join("-");
    if (exName !== exerciseName) return;
    const w = parseFloat(log.weight);
    const r = parseInt(log.reps, 10);
    const rir = parseInt(log.rir, 10);
    if (!w || isNaN(r)) return;
    completedSets.push({
      weight: w,
      reps: r,
      rir: isNaN(rir) ? null : rir,
      timestamp: log.timestamp || 0,
      key
    });
  });

  if (completedSets.length === 0) return null;

  completedSets.sort((a, b) => b.timestamp - a.timestamp);
  const lastSet = completedSets[0];

  const lastWeight = lastSet.weight;
  const lastRIR = lastSet.rir;

  let isCompound = false;
  const name = exerciseName.toLowerCase();
  if (
    name.includes("squat") ||
    name.includes("press") ||
    name.includes("deadlift") ||
    name.includes("row") ||
    name.includes("pull-up") ||
    name.includes("chin-up")
  ) {
    isCompound = true;
  }

  let suggestion;

  if (readinessScore < 50) {
    suggestion = Math.max(0, lastWeight - 5);
  } else if (lastRIR !== null && lastRIR >= 3) {
    suggestion = lastWeight + (isCompound ? 5 : 2.5);
  } else {
    suggestion = lastWeight;
  }

  return suggestion;
};

