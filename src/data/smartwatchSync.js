import { Capacitor } from "@capacitor/core";
import { Health } from "@capgo/capacitor-health";

export const isNativeMobile = () => {
  return Capacitor.isNativePlatform();
};

export const syncSmartwatchData = async () => {
  if (!isNativeMobile()) {
    // Generate realistic mockup sleep stages for web testing
    const totalSleepMinutes = 440 + Math.random() * 60; // ~7-8 hours
    const deepMinutes = totalSleepMinutes * 0.20;
    const remMinutes = totalSleepMinutes * 0.22;
    const awakeMinutes = totalSleepMinutes * 0.05;
    const lightMinutes = totalSleepMinutes * 0.53;
    const sleepHours = totalSleepMinutes / 60;

    return {
      success: true,
      sleepHours,
      sleepRating: 4,
      weight: 178.5,
      rhr: 58,
      hrv: 62,
      sleepStages: {
        deep: Math.round(deepMinutes),
        rem: Math.round(remMinutes),
        light: Math.round(lightMinutes),
        awake: Math.round(awakeMinutes),
        hasStages: true
      },
      sleepEfficiency: 95,
      message: "Web mode: Generated simulated smartwatch data."
    };
  }

  try {
    const checkAvailable = await Health.isAvailable();
    if (!checkAvailable.available) {
      return {
        success: false,
        message: "Health Connect (Android) or HealthKit (iOS) is not available or enabled on this device."
      };
    }

    await Health.requestAuthorization({
      read: ["sleep", "weight", "restingHeartRate", "heartRateVariability"],
    });

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // 3. Read sleep data for the last 24 hours
    const sleepResult = await Health.readSamples({
      startDate: oneDayAgo,
      endDate: now,
      dataType: "sleep"
    });

    let totalSleepMinutes = 0;
    let deepMinutes = 0;
    let remMinutes = 0;
    let lightMinutes = 0;
    let awakeMinutes = 0;

    if (sleepResult && sleepResult.samples && sleepResult.samples.length > 0) {
      sleepResult.samples.forEach(sample => {
        const start = new Date(sample.startDate).getTime();
        const end = new Date(sample.endDate).getTime();
        if (start && end && end > start) {
          const duration = (end - start) / (1000 * 60);
          totalSleepMinutes += duration;

          const stage = (sample.stage || sample.value || sample.sleepStage || "").toLowerCase();
          if (stage.includes("deep")) {
            deepMinutes += duration;
          } else if (stage.includes("rem")) {
            remMinutes += duration;
          } else if (stage.includes("awake") || stage.includes("outOfBed") || stage.includes("wake")) {
            awakeMinutes += duration;
          } else {
            lightMinutes += duration;
          }
        }
      });
    }

    const sleepHours = totalSleepMinutes > 0 ? totalSleepMinutes / 60 : null;

    let sleepRating = 3;
    if (sleepHours !== null) {
      if (sleepHours >= 8) sleepRating = 5;
      else if (sleepHours >= 7) sleepRating = 4;
      else if (sleepHours >= 6) sleepRating = 3;
      else if (sleepHours >= 4) sleepRating = 2;
      else sleepRating = 1;
    }

    let hasStages = (deepMinutes > 0 || remMinutes > 0);
    if (!hasStages && totalSleepMinutes > 0) {
      deepMinutes = totalSleepMinutes * 0.20;
      remMinutes = totalSleepMinutes * 0.22;
      awakeMinutes = totalSleepMinutes * 0.05;
      lightMinutes = totalSleepMinutes * 0.53;
    }

    const sleepStages = {
      deep: Math.round(deepMinutes),
      rem: Math.round(remMinutes),
      light: Math.round(lightMinutes),
      awake: Math.round(awakeMinutes),
      hasStages
    };

    const sleepEfficiency = totalSleepMinutes > 0
      ? Math.round(((totalSleepMinutes - awakeMinutes) / totalSleepMinutes) * 100)
      : 100;

    // 4. Read body weight data (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const weightResult = await Health.readSamples({
      startDate: thirtyDaysAgo,
      endDate: now,
      dataType: "weight"
    });

    let latestWeight = null;
    if (weightResult && weightResult.samples && weightResult.samples.length > 0) {
      const sortedWeights = [...weightResult.samples].sort((a, b) => {
        return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
      });
      latestWeight = sortedWeights[0].value;
      if (latestWeight && latestWeight < 120) {
        latestWeight = Math.round(latestWeight * 2.20462 * 10) / 10;
      } else if (latestWeight) {
        latestWeight = Math.round(latestWeight * 10) / 10;
      }
    }

    // 5. Read Resting Heart Rate (RHR)
    const rhrResult = await Health.readSamples({
      startDate: oneDayAgo,
      endDate: now,
      dataType: "restingHeartRate"
    });

    let latestRHR = null;
    if (rhrResult && rhrResult.samples && rhrResult.samples.length > 0) {
      const sortedRHR = [...rhrResult.samples].sort((a, b) => {
        return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
      });
      latestRHR = Math.round(sortedRHR[0].value);
    }

    // 6. Read HRV
    const hrvResult = await Health.readSamples({
      startDate: oneDayAgo,
      endDate: now,
      dataType: "heartRateVariability"
    });

    let latestHRV = null;
    if (hrvResult && hrvResult.samples && hrvResult.samples.length > 0) {
      const sortedHRV = [...hrvResult.samples].sort((a, b) => {
        return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
      });
      latestHRV = Math.round(sortedHRV[0].value);
    }

    return {
      success: true,
      sleepHours,
      sleepRating,
      weight: latestWeight,
      rhr: latestRHR,
      hrv: latestHRV,
      sleepStages,
      sleepEfficiency,
      message: "Successfully synchronized sleep, weight, resting heart rate, and HRV from your smartwatch!"
    };

  } catch (err) {
    console.error("Smartwatch health sync error:", err);
    return {
      success: false,
      message: "Sync failed: " + (err.message || err)
    };
  }
};

export const syncSmartwatchWorkouts = async (startDate, endDate) => {
  if (!isNativeMobile()) {
    return {
      success: false,
      message: "Workout synchronization is only available when running inside the native mobile app container."
    };
  }

  try {
    const checkAvailable = await Health.isAvailable();
    if (!checkAvailable.available) {
      return {
        success: false,
        message: "Health Connect/HealthKit not available."
      };
    }

    await Health.requestAuthorization({
      read: ["workouts"]
    });

    const startISO = new Date(startDate).toISOString();
    const endISO = new Date(endDate).toISOString();

    const result = await Health.queryWorkouts({
      startDate: startISO,
      endDate: endISO,
      limit: 20
    });

    return {
      success: true,
      workouts: result.workouts || [],
      message: `Successfully synchronized ${result.workouts ? result.workouts.length : 0} workouts from your smartwatch!`
    };

  } catch (err) {
    console.error("Smartwatch workout sync error:", err);
    return {
      success: false,
      message: "Sync failed: " + (err.message || err)
    };
  }
};

export const syncWorkoutHeartRate = async (startTimestamp, endTimestamp) => {
  if (!isNativeMobile()) {
    const avgHr = Math.round(115 + Math.random() * 20); // 115-135
    const peakHr = Math.round(155 + Math.random() * 25); // 155-180
    return {
      success: true,
      avgHr,
      peakHr,
      zones: {
        zone1: 10,
        zone2: 20,
        zone3: 15,
        zone4: 5,
        zone5: 0
      },
      message: "Web fallback: Generated heart rate data."
    };
  }

  try {
    const checkAvailable = await Health.isAvailable();
    if (!checkAvailable.available) {
      return {
        success: false,
        message: "Health Connect/HealthKit not available."
      };
    }

    await Health.requestAuthorization({
      read: ["heartRate"]
    });

    const startISO = new Date(startTimestamp).toISOString();
    const endISO = new Date(endTimestamp).toISOString();

    const hrResult = await Health.readSamples({
      startDate: startISO,
      endDate: endISO,
      dataType: "heartRate"
    });

    if (!hrResult || !hrResult.samples || hrResult.samples.length === 0) {
      return {
        success: false,
        message: "No heart rate samples found for this workout window."
      };
    }

    const hrValues = hrResult.samples.map(s => s.value).filter(v => v > 0);
    if (hrValues.length === 0) {
      return {
        success: false,
        message: "No valid heart rate values found."
      };
    }

    const sum = hrValues.reduce((a, b) => a + b, 0);
    const avgHr = Math.round(sum / hrValues.length);
    const peakHr = Math.max(...hrValues);

    const totalDurationMin = (endTimestamp - startTimestamp) / (1000 * 60);
    const minPerSample = totalDurationMin / hrValues.length;

    let z1 = 0, z2 = 0, z3 = 0, z4 = 0, z5 = 0;
    hrValues.forEach(hr => {
      if (hr < 114) z1 += minPerSample;
      else if (hr < 133) z2 += minPerSample;
      else if (hr < 152) z3 += minPerSample;
      else if (hr < 171) z4 += minPerSample;
      else z5 += minPerSample;
    });

    return {
      success: true,
      avgHr,
      peakHr,
      zones: {
        zone1: Math.round(z1),
        zone2: Math.round(z2),
        zone3: Math.round(z3),
        zone4: Math.round(z4),
        zone5: Math.round(z5)
      },
      message: "Successfully synchronized workout heart rate!"
    };

  } catch (err) {
    console.error("Smartwatch heart rate sync error:", err);
    return {
      success: false,
      message: "Heart rate sync failed: " + (err.message || err)
    };
  }
};
