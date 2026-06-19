import { Capacitor } from "@capacitor/core";
import { Health } from "@capgo/capacitor-health";

export const isNativeMobile = () => {
  return Capacitor.isNativePlatform();
};

export const syncSmartwatchData = async () => {
  if (!isNativeMobile()) {
    return {
      success: false,
      message: "Smartwatch synchronization is only available when running inside the native mobile app container."
    };
  }

  try {
    // 1. Check availability
    const checkAvailable = await Health.isAvailable();
    if (!checkAvailable.available) {
      return {
        success: false,
        message: "Health Connect (Android) or HealthKit (iOS) is not available or enabled on this device."
      };
    }

    // 2. Request authorization with correct camelCase types
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

    // Calculate total sleep duration in hours from the samples
    let totalSleepMinutes = 0;
    if (sleepResult && sleepResult.samples && sleepResult.samples.length > 0) {
      sleepResult.samples.forEach(sample => {
        const start = new Date(sample.startDate).getTime();
        const end = new Date(sample.endDate).getTime();
        if (start && end && end > start) {
          totalSleepMinutes += (end - start) / (1000 * 60);
        }
      });
    }
    const sleepHours = totalSleepMinutes > 0 ? totalSleepMinutes / 60 : null;

    // Map sleep hours to our 1-5 rating pill scale:
    let sleepRating = 3; // default average
    if (sleepHours !== null) {
      if (sleepHours >= 8) sleepRating = 5;
      else if (sleepHours >= 7) sleepRating = 4;
      else if (sleepHours >= 6) sleepRating = 3;
      else if (sleepHours >= 4) sleepRating = 2;
      else sleepRating = 1;
    }

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
