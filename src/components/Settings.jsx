import { useState } from "react";

export default function Settings({
  plateInventory,
  onUpdatePlateInventory,
  settings,
  onUpdateSettings,
  volumeLandmarks,
  onUpdateVolumeLandmarks,
  onExportData,
  onImportData,
  firebaseConfig,
  setFirebaseConfig,
  cloudSyncEnabled,
  setCloudSyncEnabled,
  firebaseUser,
  onLogin,
  onRegister,
  onLogout
}) {
  const [importStatus, setImportStatus] = useState("");
  
  const [syncEmail, setSyncEmail] = useState("");
  const [syncPassword, setSyncPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [showCustomConfig, setShowCustomConfig] = useState(false);

  const handleSettingChange = (field, val) => {
    let finalVal = val;
    if (["bbWeight", "ezWeight", "dbWeight"].includes(field)) {
      finalVal = val === "" ? "" : parseFloat(val);
    }
    onUpdateSettings((prev) => ({
      ...prev,
      [field]: finalVal
    }));
  };

  const handleUpdatePlateQty = (wt, newQty) => {
    if (newQty < 0) return;
    onUpdatePlateInventory((prev) => ({
      ...prev,
      [wt]: newQty
    }));
  };

  const applyPreset = (presetType) => {
    let presetObj = {};
    if (presetType === "standard") {
      presetObj = { 45: 1, 35: 1, 25: 1, 10: 2, 5: 2, 2.5: 1 };
    } else if (presetType === "heavy") {
      presetObj = { 45: 2, 35: 1, 25: 1, 10: 2, 5: 2, 2.5: 1 };
    } else if (presetType === "olympic") {
      presetObj = { 45: 2, 35: 0, 25: 2, 10: 2, 5: 2, 2.5: 1 };
    } else if (presetType === "light") {
      presetObj = { 45: 1, 35: 0, 25: 1, 10: 1, 5: 2, 2.5: 1 };
    }
    onUpdatePlateInventory(presetObj);
  };

  const getPlateColor = (wt) => {
    switch (wt) {
      case 45: return "#ff3860";
      case 35: return "#2575fc";
      case 25: return "#ffb800";
      case 10: return "#39ff14";
      case 5: return "#ffffff";
      case 2.5: return "#7f8c8d";
      default: return "#cccccc";
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const confirmImport = window.confirm("This will overwrite all your current data, settings, and logs. Are you sure you want to proceed?");
    if (!confirmImport) {
      e.target.value = "";
      return;
    }
    setImportStatus("Importing database backup...");
    onImportData(file)
      .then(() => {
        setImportStatus("Backup restored successfully! All logs updated.");
        setTimeout(() => setImportStatus(""), 4000);
      })
      .catch((err) => {
        setImportStatus(`Import failed: ${err.message || "Invalid file format"}`);
        setTimeout(() => setImportStatus(""), 5000);
      });
    e.target.value = ""; // reset
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    try {
      await onLogin(syncEmail, syncPassword);
      setAuthSuccess("Successfully signed in! Real-time syncing active.");
      setSyncPassword("");
    } catch (err) {
      setAuthError(err.message || "Login failed.");
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    if (!syncEmail || !syncPassword) {
      setAuthError("Email and Password are required to register.");
      return;
    }
    try {
      await onRegister(syncEmail, syncPassword);
      setAuthSuccess("Successfully registered user! Cloud synchronization active.");
      setSyncPassword("");
    } catch (err) {
      setAuthError(err.message || "Registration failed.");
    }
  };

  const handleLogoutClick = async () => {
    setAuthError("");
    setAuthSuccess("");
    try {
      await onLogout();
      setAuthSuccess("Signed out successfully.");
    } catch (err) {
      setAuthError(err.message || "Sign out failed.");
    }
  };

  const isConfigComplete = firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId;

  return (
    <div className="settings-tab animated">
      <div className="grid-2" style={{ gridTemplateColumns: "1fr" }}>
        
        {/* PLATE INVENTORY EDITOR CARD WITH PRESETS */}
        <div className="card">
          <div className="card-title">Weight Plate Inventory</div>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "1rem", lineHeight: "1.4" }}>
            Adjust the number of plates you have available <strong>per side</strong>. The barbell plate calculator will automatically adapt to these settings.
          </p>

          <div className="inventory-grid">
            {Object.keys(plateInventory).sort((a, b) => b - a).map((wt) => {
              const qty = plateInventory[wt];
              return (
                <div key={wt} className="inventory-item">
                  <div className="inventory-label-group">
                    <span className="plate-color-dot" style={{ backgroundColor: getPlateColor(parseFloat(wt)) }}></span>
                    <span className="inventory-wt-label">{wt} lb plate</span>
                  </div>
                  <div className="inventory-controls">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => handleUpdatePlateQty(wt, qty - 1)}
                      disabled={qty <= 0}
                    >
                      -
                    </button>
                    <span className="qty-val">{qty}</span>
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => handleUpdatePlateQty(wt, qty + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="inventory-presets">
            <span className="presets-label">Apply Stock Preset:</span>
            <div className="preset-buttons">
              <button type="button" className="btn btn-secondary btn-preset-action" onClick={() => applyPreset("standard")}>
                Standard Set (1x45, 1x35, 1x25, 2x10, 2x5, 1x2.5)
              </button>
              <button type="button" className="btn btn-secondary btn-preset-action" onClick={() => applyPreset("heavy")}>
                Heavy Powerlifting (2x45, 1x35, 1x25, 2x10, 2x5, 1x2.5)
              </button>
              <button type="button" className="btn btn-secondary btn-preset-action" onClick={() => applyPreset("olympic")}>
                Olympic (No 35s) (2x45, 0x35, 2x25, 2x10, 2x5, 1x2.5)
              </button>
              <button type="button" className="btn btn-secondary btn-preset-action" onClick={() => applyPreset("light")}>
                Basic Light Set (1x45, 0x35, 1x25, 1x10, 2x5, 1x2.5)
              </button>
            </div>
          </div>
        </div>

        {/* EQUIPMENT, RACK & THEME SETTINGS CARD */}
        <div className="card">
          <div className="card-title">
            <span>Equipment, Rack & Theme Settings</span>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "1.25rem", lineHeight: "1.4" }}>
            Configure the baseline weights for your barbells/dumbbells, record power rack pin settings, and customize the application's visual theme.
          </p>

          <div className="settings-section-title">Equipment Baseline Weights (lbs)</div>
          <div className="settings-inputs-grid-3">
            <div className="form-group">
              <label className="form-label-small">Standard Barbell (BB)</label>
              <input
                type="number"
                step="0.5"
                className="form-input"
                value={settings?.bbWeight ?? 45}
                onChange={(e) => handleSettingChange("bbWeight", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label-small">EZ Curl Bar (EZ)</label>
              <input
                type="number"
                step="0.5"
                className="form-input"
                value={settings?.ezWeight ?? 14}
                onChange={(e) => handleSettingChange("ezWeight", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label-small">Dumbbell Handle (DB)</label>
              <input
                type="number"
                step="0.5"
                className="form-input"
                value={settings?.dbWeight ?? 12}
                onChange={(e) => handleSettingChange("dbWeight", e.target.value)}
              />
            </div>
          </div>

          <div className="settings-section-title" style={{ marginTop: "1.25rem" }}>Power Rack Pin Settings</div>
          <div className="settings-inputs-grid-4">
            <div className="form-group">
              <label className="form-label-small">Squat Pin</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Pin 6"
                value={settings?.rackSquat ?? "6"}
                onChange={(e) => handleSettingChange("rackSquat", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label-small">Bench Pin</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Pin 4"
                value={settings?.rackBench ?? "4"}
                onChange={(e) => handleSettingChange("rackBench", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label-small">Incline Bench Pin</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Pin 8"
                value={settings?.rackIncline ?? "8"}
                onChange={(e) => handleSettingChange("rackIncline", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label-small">Safety Bar Pin</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Pin 5"
                value={settings?.rackSafety ?? "5"}
                onChange={(e) => handleSettingChange("rackSafety", e.target.value)}
              />
            </div>
          </div>

          <div className="settings-section-title" style={{ marginTop: "1.25rem" }}>App Styling Theme</div>
          <div className="form-group">
            <label className="form-label-small">Select Active Theme</label>
            <select
              className="form-select"
              value={settings?.theme ?? "cyber-neon"}
              onChange={(e) => handleSettingChange("theme", e.target.value)}
            >
              <option value="cyber-neon">Cyber Neon (Teal / Lime / Purple)</option>
              <option value="solar-flare">Solar Flare (Orange / Gold / Magenta)</option>
              <option value="deep-ocean">Deep Ocean (Ocean Blue / Aqua / Violet)</option>
              <option value="toxic-wasteland">Toxic Wasteland (Acid Green / Radioactive Yellow)</option>
              <option value="obsidian-crimson">Obsidian Crimson (Obsidian Black / Crimson Red)</option>
              <option value="spreadsheet-light">Spreadsheet Light (Google Sheets Green / Excel Blue)</option>
              <option value="system">System Default (Auto-Detect Dark/Light)</option>
            </select>
          </div>

          <div className="settings-section-title" style={{ marginTop: "1.25rem" }}>Individualized Muscle Volume Landmarks (Weekly Sets)</div>
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "0.75rem", lineHeight: "1.4" }}>
            Customize your Minimum Effective Volume (MEV) and Maximum Recoverable Volume (MRV) targets per muscle group.
          </p>
          <div className="landmarks-settings-grid">
            {Object.entries(volumeLandmarks || {}).map(([muscle, values]) => (
              <div key={muscle} className="landmark-setting-item">
                <span className="landmark-setting-muscle">{muscle}</span>
                <div className="landmark-setting-inputs">
                  <div className="landmark-setting-field">
                    <span className="landmark-setting-label">MEV:</span>
                    <input
                      type="number"
                      className="form-input landmark-setting-input"
                      value={values.mev}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        onUpdateVolumeLandmarks(prev => ({
                          ...prev,
                          [muscle]: { ...prev[muscle], mev: val }
                        }));
                      }}
                    />
                  </div>
                  <div className="landmark-setting-field">
                    <span className="landmark-setting-label">MRV:</span>
                    <input
                      type="number"
                      className="form-input landmark-setting-input"
                      value={values.mrv}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        onUpdateVolumeLandmarks(prev => ({
                          ...prev,
                          [muscle]: { ...prev[muscle], mrv: val }
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* REAL-TIME CLOUD SYNC (FIREBASE) CARD */}
        <div className="card">
          <div className="card-title">Real-Time Cloud Sync (Firebase)</div>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "1rem", lineHeight: "1.4" }}>
            Sync your workout logs, inventory, and volume targets dynamically across all mobile and desktop devices. Create a free Firebase project and paste your credentials below.
          </p>

          <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <input
              type="checkbox"
              id="cloudSyncToggle"
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
              checked={cloudSyncEnabled}
              onChange={(e) => setCloudSyncEnabled(e.target.checked)}
            />
            <label htmlFor="cloudSyncToggle" style={{ fontSize: "0.9rem", fontWeight: "600", cursor: "pointer", color: "var(--color-text-main)" }}>
              Enable Firebase Cloud Sync
            </label>
          </div>

          {cloudSyncEnabled && (
            <div className="firebase-config-fields animated" style={{ borderTop: "1px dashed var(--border-color)", paddingTop: "1rem" }}>
              
              {!!(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID) && (
                <div style={{ marginBottom: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <p style={{ fontSize: "0.85rem", color: "var(--color-primary)", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span>✓ Connected to default cloud server</span>
                  </p>
                  <div>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem" }}
                      onClick={() => setShowCustomConfig(!showCustomConfig)}
                    >
                      {showCustomConfig ? "🙈 Hide Configuration Details" : "🔧 Edit Custom Configuration"}
                    </button>
                  </div>
                </div>
              )}

              {(!import.meta.env.VITE_FIREBASE_API_KEY || !import.meta.env.VITE_FIREBASE_PROJECT_ID || showCustomConfig) && (
                <div className="animated" style={{ marginBottom: "1rem" }}>
                  <span className="presets-label" style={{ marginBottom: "0.75rem" }}>Firebase Project Credentials</span>
                  
                  <div className="settings-inputs-grid-2">
                    <div className="form-group">
                      <label className="form-label-small">Firebase API Key</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Paste apiKey"
                        value={firebaseConfig.apiKey || ""}
                        onChange={(e) => setFirebaseConfig(prev => ({ ...prev, apiKey: e.target.value.trim() }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label-small">Auth Domain</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. project-id.firebaseapp.com"
                        value={firebaseConfig.authDomain || ""}
                        onChange={(e) => setFirebaseConfig(prev => ({ ...prev, authDomain: e.target.value.trim() }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label-small">Project ID</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. my-project-123"
                        value={firebaseConfig.projectId || ""}
                        onChange={(e) => setFirebaseConfig(prev => ({ ...prev, projectId: e.target.value.trim() }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label-small">App ID</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Paste appId (1:1234:web:...)"
                        value={firebaseConfig.appId || ""}
                        onChange={(e) => setFirebaseConfig(prev => ({ ...prev, appId: e.target.value.trim() }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="firebase-auth-section" style={{ marginTop: "1.25rem", borderTop: "1px dashed var(--border-color)", paddingTop: "1rem" }}>
                <span className="presets-label">User Account Authentication</span>
                
                {firebaseUser ? (
                  <div className="sync-status-indicator animated" style={{ borderLeft: "3px solid var(--color-primary)", paddingLeft: "0.75rem", margin: "0.75rem 0" }}>
                    <p style={{ fontSize: "0.85rem", color: "var(--color-text-main)", fontWeight: "600" }}>
                      Connected to Cloud Sync 🌐
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.15rem" }}>
                      Signed in as: <strong>{firebaseUser.email}</strong>
                    </p>
                    <button type="button" className="btn btn-secondary" style={{ marginTop: "0.75rem", padding: "0.35rem 0.75rem", fontSize: "0.75rem" }} onClick={handleLogoutClick}>
                      🚪 Sign Out
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleLoginSubmit} style={{ marginTop: "0.75rem" }}>
                    {!isConfigComplete && (
                      <p className="sync-warn-text">⚠️ Configure Firebase credentials first to enable user authentication.</p>
                    )}
                    
                    <div className="settings-inputs-grid-2" style={{ opacity: isConfigComplete ? 1 : 0.5 }}>
                      <div className="form-group">
                        <label className="form-label-small">Sync Email Address</label>
                        <input
                          type="email"
                          className="form-input"
                          placeholder="e.g. gym@sync.com"
                          disabled={!isConfigComplete}
                          value={syncEmail}
                          onChange={(e) => setSyncEmail(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label-small">Password</label>
                        <input
                          type="password"
                          className="form-input"
                          placeholder="••••••••"
                          disabled={!isConfigComplete}
                          value={syncPassword}
                          onChange={(e) => setSyncPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    {authError && (
                      <div className="import-status-banner status-error" style={{ fontSize: "0.80rem", margin: "0.5rem 0" }}>
                        {authError}
                      </div>
                    )}
                    {authSuccess && (
                      <div className="import-status-banner status-success" style={{ fontSize: "0.80rem", margin: "0.5rem 0" }}>
                        {authSuccess}
                      </div>
                    )}

                    <div className="sync-buttons-row">
                      <button
                        type="submit"
                        className="btn btn-primary sync-btn-auth"
                        disabled={!isConfigComplete || !syncEmail || !syncPassword}
                      >
                        🔑 Sign In
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary sync-btn-auth"
                        disabled={!isConfigComplete || !syncEmail || !syncPassword}
                        onClick={handleRegisterSubmit}
                      >
                        📝 Create Account
                      </button>
                    </div>
                  </form>
                )}
              </div>

            </div>
          )}
        </div>

        {/* BACKUP & SETTINGS CARD */}
        <div className="card">
          <div className="card-title">Backup & Settings</div>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "1.25rem", lineHeight: "1.4" }}>
            Export your entire training database (workout logs, swaps, daily readiness scores, and cardio records) as a JSON backup.
            You can restore all your data on this or another device by importing the file.
          </p>

          {importStatus && (
            <div className={`import-status-banner ${importStatus.includes("failed") ? "status-error" : "status-success"}`}>
              {importStatus}
            </div>
          )}

          <div className="settings-actions-row">
            <button type="button" className="btn btn-secondary btn-settings-action" onClick={onExportData}>
              📥 Export Backup (.json)
            </button>
            <label className="btn btn-primary btn-settings-action file-label-btn">
              📤 Import Backup (.json)
              <input
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </label>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        /* INVENTORY EDIT STYLES */
        .inventory-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        @media (min-width: 768px) {
          .inventory-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }
        }
        .inventory-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.02);
          padding: 0.6rem 0.8rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }
        .inventory-label-group {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .plate-color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
          border: 1px solid rgba(0, 0, 0, 0.3);
        }
        .inventory-wt-label {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--color-text-main);
        }
        .inventory-controls {
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }
        .qty-val {
          font-weight: 700;
          font-size: 1.05rem;
          min-width: 15px;
          text-align: center;
          color: var(--color-text-main);
        }
        .qty-btn {
          height: 28px;
          width: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          background: var(--bg-input);
          color: var(--color-text-main);
          font-weight: bold;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .qty-btn:hover:not(:disabled) {
          background: var(--color-primary);
          color: var(--bg-dark);
          border-color: var(--color-primary);
        }
        .qty-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .inventory-presets {
          margin-top: 1.25rem;
          border-top: 1px dashed var(--border-color);
          padding-top: 1rem;
        }
        .presets-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--color-text-muted);
          display: block;
          margin-bottom: 0.6rem;
          letter-spacing: 0.03em;
        }
        .preset-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .btn-preset-action {
          font-size: 0.75rem !important;
          padding: 0.4rem 0.8rem !important;
          text-transform: none !important;
          letter-spacing: normal !important;
          font-weight: 500 !important;
        }

        /* EQUIPMENT & RACK SETTINGS STYLES */
        .settings-section-title {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-primary);
          margin-bottom: 0.75rem;
          border-bottom: 1px dashed rgba(0, 242, 254, 0.15);
          padding-bottom: 0.25rem;
        }
        .form-label-small {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text-muted);
          margin-bottom: 0.25rem;
          display: block;
        }
        .settings-inputs-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 0.5rem;
        }
        .settings-inputs-grid-4 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        @media (min-width: 768px) {
          .settings-inputs-grid-3 {
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
          }
          .settings-inputs-grid-4 {
            grid-template-columns: repeat(4, 1fr);
            gap: 1.5rem;
          }
        }

        /* LANDMARKS SETTINGS STYLES */
        .landmarks-settings-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        @media (min-width: 768px) {
          .landmarks-settings-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }
        }
        .landmark-setting-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.01);
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .landmark-setting-muscle {
          font-weight: 600;
          font-size: 0.85rem;
          min-width: 120px;
          color: var(--color-text-main);
        }
        .landmark-setting-inputs {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .landmark-setting-field {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .landmark-setting-label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        .landmark-setting-input {
          width: 50px !important;
          height: 24px !important;
          padding: 0 0.25rem !important;
          font-size: 0.8rem !important;
          text-align: center;
          background: var(--bg-input) !important;
          border: 1px solid var(--border-color) !important;
          color: var(--color-text-main) !important;
          border-radius: 4px !important;
        }

        /* BACKUP AND SETTINGS STYLES */
        .settings-actions-row {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .btn-settings-action {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 180px;
          height: 42px;
          cursor: pointer;
          font-family: var(--font-family);
          font-size: 0.85rem;
          font-weight: 600;
          transition: var(--transition);
        }
        .file-label-btn {
          margin: 0;
        }
        .import-status-banner {
          padding: 0.75rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          text-align: center;
          margin-bottom: 1rem;
        }
        .status-success {
          background: color-mix(in srgb, var(--color-primary) 10%, transparent);
          border: 1px solid var(--color-primary);
          color: var(--color-primary);
        }
        .status-error {
          background: rgba(255, 56, 96, 0.1);
          border: 1px solid var(--color-error);
          color: var(--color-error);
        }

        /* FIREBASE CLOUD SYNC STYLES */
        .settings-inputs-grid-2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        @media (min-width: 768px) {
          .settings-inputs-grid-2 {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
          }
        }
        .sync-buttons-row {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-top: 1rem;
        }
        .sync-btn-auth {
          flex: 1;
          min-width: 140px;
        }
        .sync-warn-text {
          font-size: 0.8rem;
          color: var(--color-warning);
          margin-top: 0.5rem;
        }
        .sync-status-indicator {
          margin-top: 0.75rem;
          font-size: 0.85rem;
          padding: 0.75rem;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
        }
      ` }} />
    </div>
  );
}
