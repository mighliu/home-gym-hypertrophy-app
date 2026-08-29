import { useState, useEffect, useRef } from "react";
import Dashboard from "./components/Dashboard";
import WorkoutLogger from "./components/WorkoutLogger";
import RecoveryLog from "./components/RecoveryLog";
import RestTimer from "./components/RestTimer";
import CardioLog from "./components/CardioLog";
import History from "./components/History";
import Settings from "./components/Settings";
import Insights from "./components/Insights";
import { 
  initFirebase, 
  loginUser, 
  registerUser, 
  logoutUser, 
  subscribeToCloudData, 
  saveToCloud, 
  unsubscribeFromCloud,
  onAuthChange,
  resetPassword
} from "./data/firebaseSync";
import { calculateReadiness } from "./data/analytics";

function playTimerAlert(soundType = "chime", enableVibration = true) {
  if (enableVibration) {
    try {
      import("@capacitor/haptics").then(({ Haptics }) => {
        Haptics.vibrate({ duration: 500 }).catch(() => {
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(500);
          }
        });
      }).catch(() => {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(500);
        }
      });
    } catch {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(500);
      }
    }
  }

  if (soundType === "silent") return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (soundType === "chime") {
      const playTone = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      playTone(523.25, 0, 0.4);   // C5
      playTone(659.25, 0.15, 0.5); // E5
    } else if (soundType === "bell") {
      const now = ctx.currentTime;
      const freqs = [440, 554.37, 659.25, 880];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.08 / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2 - idx * 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2 - idx * 0.2);
      });
    } else if (soundType === "buzzer") {
      const playBuzz = (start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(120, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + start + duration - 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      playBuzz(0, 0.3);
      playBuzz(0.4, 0.3);
    }
  } catch (e) {
    console.warn("Audio Context failed to play alert: ", e);
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState("workout"); // default tab is workout

  // Meso, Week, Day active tracking (pulled up for cross-tab sync)
  const [meso, setMeso] = useState(() => {
    const data = localStorage.getItem("hgh_active_meso");
    return data ? parseInt(data, 10) : 1;
  });
  const [week, setWeek] = useState(() => {
    const data = localStorage.getItem("hgh_active_week");
    return data ? parseInt(data, 10) : 1;
  });
  const [day, setDay] = useState(() => {
    const data = localStorage.getItem("hgh_active_day");
    return data ? parseInt(data, 10) : 1;
  });

  // Mobility guide checklist states (persisted)
  const [checkedMobility, setCheckedMobility] = useState(() => {
    const data = localStorage.getItem("hgh_checked_mobility");
    return data ? JSON.parse(data) : {};
  });

  // Individualized Volume Landmarks (MEV / MRV targets)
  const [volumeLandmarks, setVolumeLandmarks] = useState(() => {
    const data = localStorage.getItem("hgh_volume_landmarks");
    return data ? JSON.parse(data) : {
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
    };
  });

  // Global states loaded from LocalStorage
  const [workoutLogs, setWorkoutLogs] = useState(() => {
    const data = localStorage.getItem("hgh_workout_logs");
    return data ? JSON.parse(data) : {};
  });

  const [recoveryLogs, setRecoveryLogs] = useState(() => {
    const data = localStorage.getItem("hgh_recovery_logs");
    return data ? JSON.parse(data) : [];
  });

  const [cardioLogs, setCardioLogs] = useState(() => {
    const data = localStorage.getItem("hgh_cardio_logs");
    return data ? JSON.parse(data) : {};
  });

  const [plateInventory, setPlateInventory] = useState(() => {
    const data = localStorage.getItem("hgh_plate_inventory");
    return data ? JSON.parse(data) : {
      45: 1,
      35: 1,
      25: 1,
      10: 2,
      5: 2,
      2.5: 1,
      1.25: 1
    };
  });

  const [settings, setSettings] = useState(() => {
    const data = localStorage.getItem("hgh_settings");
    const defaults = {
      bbWeight: 45,
      ezWeight: 14,
      dbWeight: 12,
      rackSquat: "6",
      rackBench: "4",
      rackIncline: "8",
      rackSafety: "5",
      theme: "cyber-neon",
      timerSound: "chime",
      timerVibration: true,
      reminderDays: [],
      reminderTime: "16:00"
    };
    if (data) {
      try {
        const parsed = JSON.parse(data);
        return { ...defaults, ...parsed };
      } catch (e) {
        console.warn("Failed to parse settings:", e);
      }
    }
    return defaults;
  });

  // Firebase Sync Configuration & User States
  const [firebaseConfig] = useState(() => {
    const data = localStorage.getItem("hgh_firebase_config");
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed && parsed.apiKey && parsed.projectId && parsed.appId) {
          return parsed;
        }
      } catch (e) {
        console.warn("Failed to parse firebase config from localStorage:", e);
      }
    }
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
      appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
    };
  });

  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(() => {
    const data = localStorage.getItem("hgh_cloud_sync_enabled");
    if (data !== null) {
      return data === "true";
    }
    return !!(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID);
  });

  const [firebaseUser, setFirebaseUser] = useState(null);

  const [slotOverrides, setSlotOverrides] = useState(() => {
    const overridesData = localStorage.getItem("hgh_slot_overrides");
    const swapsData = localStorage.getItem("hgh_swaps");
    if (overridesData) {
      return JSON.parse(overridesData);
    } else if (swapsData) {
      const oldSwaps = JSON.parse(swapsData);
      const migrated = {};
      Object.keys(oldSwaps).forEach((key) => {
        migrated[key] = { exercise: oldSwaps[key] };
      });
      return migrated;
    }
    return {};
  });

  const [sessionLogs, setSessionLogs] = useState(() => {
    const data = localStorage.getItem("hgh_session_logs");
    return data ? JSON.parse(data) : {};
  });

  // Rest Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerMax, setTimerMax] = useState(0);
  const [timerExercise, setTimerExercise] = useState("");
  const [timerActive, setTimerActive] = useState(false);

  // Quick-Log Widget State
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [quickSleep, setQuickSleep] = useState(3);
  const [quickFatigue, setQuickFatigue] = useState(3);
  const [quickSoreness, setQuickSoreness] = useState(1);
  const [quickWeight, setQuickWeight] = useState("");

  const handleQuickLogSubmit = (e) => {
    if (e) e.preventDefault();
    const dateObj = new Date();
    const key = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD
    
    const newLog = {
      date: key,
      timestamp: dateObj.getTime(),
      displayDate: dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      sleep: parseInt(quickSleep, 10),
      fatigue: parseInt(quickFatigue, 10),
      soreness: parseInt(quickSoreness, 10),
      weight: quickWeight ? parseFloat(quickWeight) : null,
      notes: "Quick check-in via widget",
      rhr: null,
      hrv: null
    };

    handleAddLog(newLog);
    setShowQuickLog(false);
    
    // Reset defaults
    setQuickSleep(3);
    setQuickFatigue(3);
    setQuickSoreness(1);
    setQuickWeight("");
  };

  // Sync refs to prevent recursive update loops
  const lastLocalChangeRef = useRef(0);
  const lastSyncedTimestampRef = useRef(0);

  const updateLocalChange = () => {
    lastLocalChangeRef.current = Date.now();
  };

  const applyBackupData = (data) => {
    if (!data || typeof data !== "object") return;
    if (data.workoutLogs) setWorkoutLogs(data.workoutLogs);
    if (data.recoveryLogs) setRecoveryLogs(data.recoveryLogs);
    if (data.slotOverrides) setSlotOverrides(data.slotOverrides);
    if (data.cardioLogs) setCardioLogs(data.cardioLogs);
    if (data.checkedMobility) setCheckedMobility(data.checkedMobility);
    if (data.volumeLandmarks) setVolumeLandmarks(data.volumeLandmarks);
    if (data.plateInventory) setPlateInventory(data.plateInventory);
    if (data.settings) setSettings(data.settings);
    if (data.sessionLogs) setSessionLogs(data.sessionLogs);
  };

  const handleCloudLogin = async (email, password) => {
    return loginUser(email, password);
  };

  const handleCloudRegister = async (email, password) => {
    return registerUser(email, password);
  };

  const handleCloudLogout = async () => {
    return logoutUser();
  };

  const handleCloudResetPassword = async (email) => {
    return resetPassword(email);
  };

  // Firebase Auth & Firestore Subscription hook
  useEffect(() => {
    let unsubscribeAuth = null;
    let unsubscribeDb = null;

    const isConfigComplete = firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId;

    if (cloudSyncEnabled && isConfigComplete) {
      const initOk = initFirebase(firebaseConfig);
      if (initOk) {
        unsubscribeAuth = onAuthChange((user) => {
          setFirebaseUser(user);
          if (user) {
            unsubscribeDb = subscribeToCloudData(user.uid, (cloudBackup, lastUpdated) => {
              if (lastUpdated > lastSyncedTimestampRef.current) {
                if (lastLocalChangeRef.current > lastUpdated) {
                  return;
                }
                lastSyncedTimestampRef.current = lastUpdated;
                applyBackupData(cloudBackup);
              }
            });
          } else {
            setFirebaseUser(null);
            if (unsubscribeDb) {
              unsubscribeDb();
              unsubscribeDb = null;
            }
          }
        });
      }
    } else {
      unsubscribeFromCloud();
      Promise.resolve().then(() => {
        setFirebaseUser(null);
      });
    }

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeDb) unsubscribeDb();
      unsubscribeFromCloud();
    };
  }, [cloudSyncEnabled, firebaseConfig]);

  // Debounced cloud synchronization upload
  useEffect(() => {
    if (!cloudSyncEnabled || !firebaseUser) return;

    if (lastLocalChangeRef.current <= lastSyncedTimestampRef.current) {
      return;
    }

    const targetTime = lastLocalChangeRef.current;

    const timer = setTimeout(() => {
      const backup = {
        workoutLogs,
        recoveryLogs,
        slotOverrides,
        cardioLogs,
        plateInventory,
        settings,
        checkedMobility,
        volumeLandmarks,
        sessionLogs
      };

      saveToCloud(firebaseUser.uid, backup)
        .then(() => {
          lastSyncedTimestampRef.current = Math.max(lastSyncedTimestampRef.current, targetTime);
        })
        .catch((err) => {
          console.error("Failed to sync data to cloud:", err);
        });
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    cloudSyncEnabled,
    firebaseUser,
    workoutLogs,
    recoveryLogs,
    slotOverrides,
    cardioLogs,
    plateInventory,
    settings,
    checkedMobility,
    volumeLandmarks,
    sessionLogs
  ]);

  // Sync states to LocalStorage
  useEffect(() => {
    localStorage.setItem("hgh_workout_logs", JSON.stringify(workoutLogs));
  }, [workoutLogs]);

  useEffect(() => {
    localStorage.setItem("hgh_recovery_logs", JSON.stringify(recoveryLogs));
  }, [recoveryLogs]);

  useEffect(() => {
    localStorage.setItem("hgh_cardio_logs", JSON.stringify(cardioLogs));
  }, [cardioLogs]);

  useEffect(() => {
    localStorage.setItem("hgh_plate_inventory", JSON.stringify(plateInventory));
  }, [plateInventory]);

  useEffect(() => {
    localStorage.setItem("hgh_settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("hgh_active_meso", meso);
  }, [meso]);

  useEffect(() => {
    localStorage.setItem("hgh_active_week", week);
  }, [week]);

  useEffect(() => {
    localStorage.setItem("hgh_active_day", day);
  }, [day]);

  useEffect(() => {
    localStorage.setItem("hgh_checked_mobility", JSON.stringify(checkedMobility));
  }, [checkedMobility]);

  useEffect(() => {
    localStorage.setItem("hgh_volume_landmarks", JSON.stringify(volumeLandmarks));
  }, [volumeLandmarks]);

  useEffect(() => {
    localStorage.setItem("hgh_firebase_config", JSON.stringify(firebaseConfig));
  }, [firebaseConfig]);

  useEffect(() => {
    localStorage.setItem("hgh_cloud_sync_enabled", cloudSyncEnabled.toString());
  }, [cloudSyncEnabled]);

  // Synchronize CSS class on document body when theme changes
  useEffect(() => {
    const activeThemeSetting = settings?.theme || "cyber-neon";

    const getResolvedTheme = (themeName) => {
      if (themeName === "system") {
        return window.matchMedia("(prefers-color-scheme: light)").matches
          ? "spreadsheet-light"
          : "cyber-neon";
      }
      return themeName;
    };

    const applyTheme = () => {
      const activeTheme = getResolvedTheme(activeThemeSetting);
      const classesToRemove = [];
      document.body.classList.forEach(className => {
        if (className.startsWith("theme-")) {
          classesToRemove.push(className);
        }
      });
      classesToRemove.forEach(className => document.body.classList.remove(className));
      document.body.classList.add(`theme-${activeTheme}`);
    };

    applyTheme();

    if (activeThemeSetting === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
      const handler = () => applyTheme();
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [settings?.theme]);

  useEffect(() => {
    localStorage.setItem("hgh_slot_overrides", JSON.stringify(slotOverrides));
  }, [slotOverrides]);

  useEffect(() => {
    localStorage.setItem("hgh_session_logs", JSON.stringify(sessionLogs));
  }, [sessionLogs]);

  const handleSaveSession = (sessionKey, sessionData) => {
    updateLocalChange();
    setSessionLogs((prev) => ({
      ...prev,
      [sessionKey]: sessionData
    }));
  };

  // Timer Ticking Loop
  useEffect(() => {
    let interval = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerActive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimerActive(false);
      playTimerAlert(settings?.timerSound, settings?.timerVibration);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds, settings?.timerSound, settings?.timerVibration]);

  // Workout reminders scheduling
  useEffect(() => {
    const syncRemindersResult = async () => {
      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        
        // request permissions
        const permission = await LocalNotifications.checkPermissions();
        if (permission.display !== "granted") {
          await LocalNotifications.requestPermissions();
        }

        // Clear existing
        const pending = await LocalNotifications.getPending();
        if (pending.notifications && pending.notifications.length > 0) {
          await LocalNotifications.cancel(pending);
        }

        const reminderDays = settings.reminderDays || [];
        if (reminderDays.length === 0) {
          console.log("No reminder days set. Cleared all reminders.");
          return;
        }

        const [hourStr, minStr] = (settings.reminderTime || "16:00").split(":");
        const hour = parseInt(hourStr, 10);
        const minute = parseInt(minStr, 10);

        const daysMap = { "Sun": 1, "Mon": 2, "Tue": 3, "Wed": 4, "Thu": 5, "Fri": 6, "Sat": 7 };
        const now = new Date();
        const todayNum = now.getDay() + 1; // 1=Sun, 2=Mon...
        const todayDateStr = now.toISOString().split("T")[0];

        // Check if workout is logged today
        let workoutLoggedToday = false;
        Object.keys(workoutLogs || {}).forEach((key) => {
          const log = workoutLogs[key];
          if (log && log.completed && log.date === todayDateStr) {
            workoutLoggedToday = true;
          }
        });
        Object.values(sessionLogs || {}).forEach((log) => {
          if (log.completedAt) {
            const d = new Date(log.completedAt).toISOString().split("T")[0];
            if (d === todayDateStr) {
              workoutLoggedToday = true;
            }
          }
        });

        // Check today's readiness
        const todayRecoveryLog = recoveryLogs.find((l) => l.date === todayDateStr);
        let lowReadiness = false;
        if (todayRecoveryLog) {
          const { score } = calculateReadiness(todayRecoveryLog, recoveryLogs);
          if (score < 30) {
            lowReadiness = true;
          }
        }

        const list = [];
        reminderDays.forEach((dayName, idx) => {
          const weekdayNum = daysMap[dayName];
          if (!weekdayNum) return;

          let title = "Time to Train! 🏋️";
          let body = "Consistency is key. Tap to open your workout log.";

          if (weekdayNum === todayNum) {
            if (workoutLoggedToday) {
              console.log("Workout already completed today. Skipping today's reminder scheduling.");
              return;
            }
            if (lowReadiness) {
              title = "Recovery Day Advised 😴";
              body = "Your readiness score is critically low. Consider a rest/recovery day today.";
            }
          }

          list.push({
            id: 200 + idx,
            title,
            body,
            schedule: {
              on: {
                weekday: weekdayNum,
                hour,
                minute
              },
              repeats: true
            }
          });
        });

        if (list.length > 0) {
          await LocalNotifications.schedule({ notifications: list });
          console.log(`Successfully scheduled ${list.length} workout reminders.`);
        }
      } catch (err) {
        console.log("Capacitor local notifications not available on web, skipping notification scheduling:", err);
      }
    };

    syncRemindersResult();
  }, [settings?.reminderDays, settings?.reminderTime, workoutLogs, recoveryLogs, sessionLogs]);

  // Global Actions
  const handleSaveSet = (logKey, setData) => {
    updateLocalChange();
    setWorkoutLogs((prev) => ({
      ...prev,
      [logKey]: {
        ...prev[logKey],
        ...setData
      }
    }));
  };

  const handleSaveCardio = (key, sessionData) => {
    updateLocalChange();
    setCardioLogs((prev) => ({
      ...prev,
      [key]: sessionData
    }));
  };

  const handleUpdateSlotOverride = (mesoVal, dayVal, idx, field, value) => {
    updateLocalChange();
    const key = `${mesoVal}-${dayVal}-${idx}`;
    setSlotOverrides((prev) => {
      const current = prev[key] || {};
      let finalValue = value;
      if (field === "baseline") {
        finalValue = value === "" ? "" : parseFloat(value);
      }
      return {
        ...prev,
        [key]: {
          ...current,
          [field]: finalValue
        }
      };
    });
  };

  const handleAddLog = (newLog) => {
    updateLocalChange();
    // If a log for this date already exists, replace it
    setRecoveryLogs((prev) => {
      const filtered = prev.filter((log) => log.date !== newLog.date);
      return [newLog, ...filtered];
    });
  };

  const handleUpdatePlateInventory = (valOrFunc) => {
    updateLocalChange();
    setPlateInventory(valOrFunc);
  };

  const handleUpdateSettings = (valOrFunc) => {
    updateLocalChange();
    setSettings(valOrFunc);
  };

  const handleUpdateVolumeLandmarks = (valOrFunc) => {
    updateLocalChange();
    setVolumeLandmarks(valOrFunc);
  };

  const handleUpdateCheckedMobility = (valOrFunc) => {
    updateLocalChange();
    setCheckedMobility(valOrFunc);
  };

  const triggerRestTimer = (seconds, exName) => {
    setTimerSeconds(seconds);
    setTimerMax(seconds);
    setTimerExercise(exName);
    setTimerActive(true);
  };

  const dismissTimer = () => {
    setTimerSeconds(0);
    setTimerMax(0);
    setTimerActive(false);
  };

  // Import / Export backup utilities
  const handleExportData = () => {
    const backup = {
      workoutLogs,
      recoveryLogs,
      slotOverrides,
      cardioLogs,
      plateInventory,
      settings,
      checkedMobility,
      volumeLandmarks,
      sessionLogs
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `hgh_backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportData = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          
          if (!data || typeof data !== "object") {
            throw new Error("Invalid backup file: Must be a JSON object.");
          }
          
          const importedWorkoutLogs = data.workoutLogs || {};
          const importedRecoveryLogs = data.recoveryLogs || [];
          const importedSlotOverrides = data.slotOverrides || {};
          const importedCardioLogs = data.cardioLogs || {};
          const importedCheckedMobility = data.checkedMobility || {};
          const importedSessionLogs = data.sessionLogs || {};
          const importedVolumeLandmarks = data.volumeLandmarks || {
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
          };
          const importedPlateInventory = data.plateInventory || {
            45: 1,
            35: 1,
            25: 1,
            10: 2,
            5: 2,
            2.5: 1,
            1.25: 1
          };
          const defaultSettings = {
            bbWeight: 45,
            ezWeight: 14,
            dbWeight: 12,
            rackSquat: "6",
            rackBench: "4",
            rackIncline: "8",
            rackSafety: "5",
            theme: "cyber-neon",
            timerSound: "chime",
            timerVibration: true,
            reminderDays: [],
            reminderTime: "16:00"
          };
          const importedSettings = { ...defaultSettings, ...(data.settings || {}) };
          
          // Save to state
          updateLocalChange();
          setWorkoutLogs(importedWorkoutLogs);
          setRecoveryLogs(importedRecoveryLogs);
          setSlotOverrides(importedSlotOverrides);
          setCardioLogs(importedCardioLogs);
          setCheckedMobility(importedCheckedMobility);
          setVolumeLandmarks(importedVolumeLandmarks);
          setPlateInventory(importedPlateInventory);
          setSettings(importedSettings);
          setSessionLogs(importedSessionLogs);
          
          // Save to local storage
          localStorage.setItem("hgh_workout_logs", JSON.stringify(importedWorkoutLogs));
          localStorage.setItem("hgh_recovery_logs", JSON.stringify(importedRecoveryLogs));
          localStorage.setItem("hgh_slot_overrides", JSON.stringify(importedSlotOverrides));
          localStorage.setItem("hgh_cardio_logs", JSON.stringify(importedCardioLogs));
          localStorage.setItem("hgh_checked_mobility", JSON.stringify(importedCheckedMobility));
          localStorage.setItem("hgh_volume_landmarks", JSON.stringify(importedVolumeLandmarks));
          localStorage.setItem("hgh_plate_inventory", JSON.stringify(importedPlateInventory));
          localStorage.setItem("hgh_settings", JSON.stringify(importedSettings));
          localStorage.setItem("hgh_session_logs", JSON.stringify(importedSessionLogs));
          
          resolve(true);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("File reading error."));
      reader.readAsText(file);
    });
  };

  return (
    <div className="app-container">
      <>
          {/* HEADER */}
          <header className="app-header">
            <div className="brand-section">
              <h1 className="app-title">Home Gym Hypertrophy</h1>
              <p className="app-subtitle">Premium Autoregulated Macrocycle Tracker</p>
            </div>
          </header>

          {/* NAVIGATION TABS */}
          <nav className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              <span className="nav-tab-icon">📊</span>
              <span>Dashboard</span>
            </button>
            <button
              className={`nav-tab ${activeTab === "insights" ? "active" : ""}`}
              onClick={() => setActiveTab("insights")}
            >
              <span className="nav-tab-icon">📈</span>
              <span>Insights</span>
            </button>
            <button
              className={`nav-tab ${activeTab === "workout" ? "active" : ""}`}
              onClick={() => setActiveTab("workout")}
            >
              <span className="nav-tab-icon">🏋️</span>
              <span>Workout Log</span>
            </button>
            <button
              className={`nav-tab ${activeTab === "history" ? "active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              <span className="nav-tab-icon">📅</span>
              <span>History</span>
            </button>
            <button
              className={`nav-tab ${activeTab === "cardio" ? "active" : ""}`}
              onClick={() => setActiveTab("cardio")}
            >
              <span className="nav-tab-icon">🏃</span>
              <span>Cardio Log</span>
            </button>
            <button
              className={`nav-tab ${activeTab === "recovery" ? "active" : ""}`}
              onClick={() => setActiveTab("recovery")}
            >
              <span className="nav-tab-icon">😴</span>
              <span>Recovery</span>
            </button>
            <button
              className={`nav-tab ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              <span className="nav-tab-icon">⚙️</span>
              <span>Settings</span>
            </button>
          </nav>

          {/* ACTIVE CONTENT VIEW */}
          <main className="app-main">
            {activeTab === "dashboard" && (
              <Dashboard
                workoutLogs={workoutLogs}
                recoveryLogs={recoveryLogs}
                cardioLogs={cardioLogs}
                slotOverrides={slotOverrides}
                currentWeek={week}
                currentMeso={meso}
                volumeLandmarks={volumeLandmarks}
                sessionLogs={sessionLogs}
              />
            )}
            {activeTab === "insights" && (
              <Insights
                workoutLogs={workoutLogs}
                recoveryLogs={recoveryLogs}
                cardioLogs={cardioLogs}
                sessionLogs={sessionLogs}
                currentWeek={week}
                currentMeso={meso}
              />
            )}
            {activeTab === "workout" && (
              <WorkoutLogger
                meso={meso}
                setMeso={setMeso}
                week={week}
                setWeek={setWeek}
                day={day}
                setDay={setDay}
                workoutLogs={workoutLogs}
                recoveryLogs={recoveryLogs}
                slotOverrides={slotOverrides}
                onSaveSet={handleSaveSet}
                onUpdateSlotOverride={handleUpdateSlotOverride}
                triggerRestTimer={triggerRestTimer}
                plateInventory={plateInventory}
                settings={settings}
                checkedMobility={checkedMobility}
                setCheckedMobility={handleUpdateCheckedMobility}
                onSaveSession={handleSaveSession}
              />
            )}
            {activeTab === "history" && (
              <History
                workoutLogs={workoutLogs}
                slotOverrides={slotOverrides}
                sessionLogs={sessionLogs}
              />
            )}
            {activeTab === "cardio" && (
              <CardioLog
                cardioLogs={cardioLogs}
                onSaveCardio={handleSaveCardio}
                currentWeek={week}
                recoveryLogs={recoveryLogs}
                workoutLogs={workoutLogs}
                currentMeso={meso}
              />
            )}
            {activeTab === "recovery" && (
              <RecoveryLog
                recoveryLogs={recoveryLogs}
                onAddLog={handleAddLog}
              />
            )}
            {activeTab === "settings" && (
              <Settings
                plateInventory={plateInventory}
                onUpdatePlateInventory={handleUpdatePlateInventory}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                volumeLandmarks={volumeLandmarks}
                onUpdateVolumeLandmarks={handleUpdateVolumeLandmarks}
                onExportData={handleExportData}
                onImportData={handleImportData}
                firebaseConfig={firebaseConfig}
                cloudSyncEnabled={cloudSyncEnabled}
                setCloudSyncEnabled={setCloudSyncEnabled}
                firebaseUser={firebaseUser}
                onLogin={handleCloudLogin}
                onRegister={handleCloudRegister}
                onLogout={handleCloudLogout}
                onResetPassword={handleCloudResetPassword}
              />
            )}
          </main>

          {/* PERSISTENT FLOATING REST TIMER */}
          <RestTimer
            timerSeconds={timerSeconds}
            timerMax={timerMax}
            timerExercise={timerExercise}
            timerActive={timerActive}
            setTimerActive={setTimerActive}
            setTimerSeconds={setTimerSeconds}
            dismissTimer={dismissTimer}
          />

          {/* FLOATING QUICK-LOG WIDGET */}
          <button
            type="button"
            className="floating-quick-log-btn"
            onClick={() => setShowQuickLog(true)}
            title="Quick Daily Readiness Log"
            style={{
              bottom: timerActive ? "95px" : "20px"
            }}
          >
            📝
          </button>

          {showQuickLog && (
            <div className="modal-overlay" onClick={() => setShowQuickLog(false)}>
              <div className="modal-card quick-log-modal animated" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>⚡ Quick Daily Check-In</h3>
                  <button type="button" className="btn-close-modal" onClick={() => setShowQuickLog(false)}>×</button>
                </div>
                <form onSubmit={handleQuickLogSubmit}>
                  <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div className="quick-log-field">
                      <label className="form-label">Sleep Quality ({quickSleep}/5)</label>
                      <div className="quick-log-pills-row">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            className={`pill-btn ${quickSleep === num ? "active-sleep" : ""}`}
                            onClick={() => setQuickSleep(num)}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="quick-log-field">
                      <label className="form-label">Fatigue Level ({quickFatigue}/5)</label>
                      <div className="quick-log-pills-row">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            className={`pill-btn ${quickFatigue === num ? "active-fatigue" : ""}`}
                            onClick={() => setQuickFatigue(num)}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="quick-log-field">
                      <label className="form-label">Muscle Soreness ({quickSoreness}/5)</label>
                      <div className="quick-log-pills-row">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            className={`pill-btn ${quickSoreness === num ? "active-soreness" : ""}`}
                            onClick={() => setQuickSoreness(num)}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Weight (lbs)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 180.2"
                        className="form-input"
                        value={quickWeight}
                        onChange={(e) => setQuickWeight(e.target.value)}
                        style={{ background: "var(--bg-input)" }}
                      />
                    </div>
                  </div>
                  <div className="modal-footer" style={{ display: "flex", gap: "0.5rem" }}>
                    <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowQuickLog(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-full">
                      Save Log
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
    </div>
  );
}
