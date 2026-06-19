import { useState, useEffect, useRef } from "react";
import Dashboard from "./components/Dashboard";
import WorkoutLogger from "./components/WorkoutLogger";
import RecoveryLog from "./components/RecoveryLog";
import RestTimer from "./components/RestTimer";
import CardioLog from "./components/CardioLog";
import History from "./components/History";
import Settings from "./components/Settings";
import AuthScreen from "./components/AuthScreen";
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

function playChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
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
  } catch (e) {
    console.warn("Audio Context failed to play chime: ", e);
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
      2.5: 1
    };
  });

  const [settings, setSettings] = useState(() => {
    const data = localStorage.getItem("hgh_settings");
    return data ? JSON.parse(data) : {
      bbWeight: 45,
      ezWeight: 14,
      dbWeight: 12,
      rackSquat: "6",
      rackBench: "4",
      rackIncline: "8",
      rackSafety: "5",
      theme: "cyber-neon"
    };
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
      playChime();
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

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
            2.5: 1
          };
          const importedSettings = data.settings || {
            bbWeight: 45,
            ezWeight: 14,
            dbWeight: 12,
            rackSquat: "6",
            rackBench: "4",
            rackIncline: "8",
            rackSafety: "5",
            theme: "cyber-neon"
          };
          if (!importedSettings.theme) {
            importedSettings.theme = "cyber-neon";
          }
          
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
      {cloudSyncEnabled && !firebaseUser ? (
        <AuthScreen
          onLogin={handleCloudLogin}
          onRegister={handleCloudRegister}
          onResetPassword={handleCloudResetPassword}
        />
      ) : (
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
                slotOverrides={slotOverrides}
                currentWeek={week}
                currentMeso={meso}
                volumeLandmarks={volumeLandmarks}
                sessionLogs={sessionLogs}
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
              />
            )}
            {activeTab === "cardio" && (
              <CardioLog
                cardioLogs={cardioLogs}
                onSaveCardio={handleSaveCardio}
                currentWeek={week}
                recoveryLogs={recoveryLogs}
                workoutLogs={workoutLogs}
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
        </>
      )}
    </div>
  );
}
