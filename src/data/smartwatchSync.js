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

    // 2. Request authorization
    await Health.requestAuthorization({
      read: ["sleep", "weight"],
    });

    // 3. Read sleep data for the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const sleepResult = await Health.querySamples({
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
    // 1: Terrible (<4h)
    // 2: Poor (4-5h)
    // 3: Adequate (6-7h)
    // 4: Good (7-8h)
    // 5: Excellent (8h+)
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
    const weightResult = await Health.querySamples({
      startDate: thirtyDaysAgo,
      endDate: now,
      dataType: "weight"
    });

    let latestWeight = null;
    if (weightResult && weightResult.samples && weightResult.samples.length > 0) {
      // Sort by end date descending
      const sortedWeights = [...weightResult.samples].sort((a, b) => {
        return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
      });
      
      latestWeight = sortedWeights[0].value;
      
      // Heuristic: If weight value is < 120, it is likely in kg; convert to lbs
      if (latestWeight && latestWeight < 120) {
        latestWeight = Math.round(latestWeight * 2.20462 * 10) / 10;
      } else if (latestWeight) {
        latestWeight = Math.round(latestWeight * 10) / 10;
      }
    }

    return {
      success: true,
      sleepHours,
      sleepRating,
      weight: latestWeight,
      message: "Successfully synchronized sleep and weight data from your smartwatch!"
    };

  } catch (err) {
    console.error("Smartwatch health sync error:", err);
    return {
      success: false,
      message: "Sync failed: " + (err.message || err)
    };
  }
};
