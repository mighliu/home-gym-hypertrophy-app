# Home Gym Hypertrophy Tracker 🏋️‍♂️

A premium, fully autoregulated training macrocycle tracker designed for home gym lifters. The application leverages smartwatch health data (sleep architecture, resting heart rate, HRV, active workout heart rate, body weight) to construct a comprehensive recovery coach engine. This engine drives prescriptive training auto-regulation, interactive analytics charts, and custom UX configurations, syncing seamlessly with Firestore and functioning fully offline.

---

## 🌟 Key Modules & Features

### 1. Workout Logger & Progressive Overload Intelligence (Round 6)
- **Smart Weight Suggestions**: Pre-fills weight input fields with calculated recommendations based on your previous set's Reps-in-Reserve (RIR) and today's recovery readiness.
- **PR Tracking & e1RM Sparklines**: Automatically detects Weight, Rep, and Volume PRs during logging. Celebrates records with inline animated badges and maps historical Estimated 1RM ($e1RM$) progression via inline SVG sparklines in the History tab.
- **Superset Sequence Grouping**: Visually groups contiguous superset exercise blocks with purple borders and indicators.
- **Jaccard Exercise Substitution**: Upgrades exercise swapping with Jaccard-like muscle activation similarity overlap rankings, displaying match percentages (e.g., `92% match`) and primary muscle tags.

### 2. Smartwatch Syncing & Health Analytics Tab (Round 5)
- **Daily Readiness Index (0-100)**: Consolidates sleep rating (30%), HRV deviation (25%), RHR deviation (20%), fatigue (15%), and soreness (10%) into a continuous readiness score with prescriptive workout guidelines. Degrades gracefully if smartwatch HRV or RHR data is unavailable by dynamically re-weighting the remaining parameters.
- **Sleep Architecture Breakdown**: Parses deep, light, REM, and awake segments from Health Connect, rendering a stacked horizontal progress bar with calculated Sleep Efficiency.
- **Workout Heart Rate Zones**: Synchronizes average and peak heart rate from workouts, categorizing active time in Zones 1 to 5 to evaluate cardio threshold stress.
- **Bodyweight EWMA & Caloric Balance**: Smooths weight weigh-ins using a 7-day exponentially weighted moving average ($\alpha = 0.25$) and infers weekly caloric surplus/deficit.
- **Recovery Score Prediction**: Applies 7-day linear regression forecasting to predict tomorrow's recovery score and alert you when rest days are required.

### 3. Interactive Data Visualizations (SVG-Rendered)
- **Cardio Load vs. Recovery Impact Chart**: Dual-axis line chart overlaying calculated cardio TRIMP (duration $\times$ intensity) with next-day sleep quality and fatigue levels.
- **Muscle Volume Radar (Spider) Chart**: 10-spoke spider chart normalizing weekly sets completed against individualized MEV (Minimum Effective Volume) and MRV (Maximum Recoverable Volume) targets.
- **Sleep vs. Performance Correlation**: 2D scatter plot correlating prior night's sleep ratings with workout tonnage.
- **Fatigue Accumulation Timeline**: Visualizes subjective fatigue accumulation waves against weekly total sets completed.
- **Recovery Heatmap**: A calendar contribution-style grid mapping 6 weeks of daily readiness scores.

### 4. PWA Offline & Hybrid System
- **PWA Standalone Mode**: Installable as a native app on iOS, Android, and Desktop viewports.
- **Offline Service Worker**: Employs a Network-First caching strategy to run without cellular service.
- **Zero-Friction Cloud Sync (Firebase)**: Features Firestore syncing with background write debouncing (1.5s) and local-cloud timestamp echo loops prevention.

### 5. Advanced UX Customization
- **Theme Swatch Selector**: Supports Midnight OLED (pure black backgrounds for AMOLED screen power savings), Forest Iron (earthy green), Arctic Frost (light mode), and legacy Cyber Neon.
- **Rest Timer Sound & Vibe Pickers**: Select between synthesized chime, bell, buzzer, or silent completes with native Capacitor Haptics and web vibration.
- **Workout Reminders**: Schedules training days reminders, dynamically suppressed if workouts are already logged or if recovery is critical (readiness < 30).

---

## 📐 Mathematical Formulas & Algorithms

### 1. Daily Readiness Index
Consolidates subjective ratings and objective smartwatch readings:
$$\text{Readiness} = \frac{\sum (S_i \times W_i)}{\sum W_i}$$
Where:
- **Sleep Rating ($30\%$ weight)**: 5 $\rightarrow$ 100, 4 $\rightarrow$ 85, 3 $\rightarrow$ 60, 2 $\rightarrow$ 30, 1 $\rightarrow$ 10.
- **HRV Deviation ($25\%$ weight)**: Compares against 30-day baseline.
  $$\text{Score}_{\text{HRV}} = \begin{cases} 100 & \text{if } \text{HRV} \ge \text{HRV}_{\text{30d}} \\ \max\left(0, 100 + \frac{\text{HRV} - \text{HRV}_{\text{30d}}}{\text{HRV}_{\text{30d}}} \times 300\right) & \text{if } \text{HRV} < \text{HRV}_{\text{30d}} \end{cases}$$
- **RHR Deviation ($20\%$ weight)**: Compares against 30-day baseline.
  $$\text{Score}_{\text{RHR}} = \begin{cases} 100 & \text{if } \text{RHR} \le \text{RHR}_{\text{30d}} \\ \max\left(0, 100 - (\text{RHR} - \text{RHR}_{\text{30d}}) \times 8\right) & \text{if } \text{RHR} > \text{RHR}_{\text{30d}} \end{cases}$$
- **Fatigue Rating ($15\%$ weight)**: 1 $\rightarrow$ 100, 2 $\rightarrow$ 85, 3 $\rightarrow$ 60, 4 $\rightarrow$ 30, 5 $\rightarrow$ 10.
- **Soreness Rating ($10\%$ weight)**: 1 $\rightarrow$ 100, 2 $\rightarrow$ 85, 3 $\rightarrow$ 60, 4 $\rightarrow$ 30, 5 $\rightarrow$ 10.

*If smartwatch parameters (HRV or RHR) are absent, the equation dynamically recalibrates the sum of active weights ($W_i$) to guarantee an accurate score.*

### 2. Exponentially Weighted Moving Average (EWMA) for Bodyweight
Daily weigh-ins are smoothed to account for water retention noise:
$$\text{EWMA}_t = \alpha \cdot \text{Weight}_t + (1 - \alpha) \cdot \text{EWMA}_{t-1}$$
*(where $\alpha = 0.25$ represents a 7-day smoothing scale)*

### 3. Estimated 1-Rep Max (e1RM)
Calculated using the Epley formula:
$$e1RM = \text{Weight} \times \left(1 + \frac{\text{Reps}}{30}\right)$$

### 4. Cardio Training Impulse (TRIMP) Load
Quantified as:
$$\text{TRIMP} = \text{Duration (minutes)} \times \text{Logged Intensity (1-5 scale)}$$

### 5. Recovery Score Prediction (7-Day Linear Regression)
Utilizes ordinary least squares regression over the past 7 days of readiness scores:
$$\hat{y} = m \cdot x + b$$
Where:
- $x$ represents the day offset (0 to 6).
- $y$ is the calculated readiness score.
- The slope $m$ indicates the direction of recovery. A slope $m \le -1.5$ alerts the user to schedule a deload or recovery day.

### 6. Jaccard Exercise Substitution Similarity
Quantifies muscle activation overlap between a logged exercise ($A$) and alternatives ($B$):
$$J(A, B) = \frac{\text{Score Activation}}{\text{Total Max Activation}}$$
Primary muscles are weighted at $1.0$ and secondary muscles at $0.5$ during intersect comparisons.

---

## 📱 Mobile Hybrid Architecture & Native Sync

The app is built using a hybrid web-native approach:
- **Client Web/PWA**: Uses standard React 19, Vanilla CSS, and LocalStorage. It works completely in browser sandboxes.
- **CapacitorJS Bridge**: Wraps web assets into a native Android container.
- **Native Health Integration**: Connects to Android **Health Connect** using `@capgo/capacitor-health` to read steps, weight, resting heart rate, sleep samples, and HRV.
- **Web Fallback Safeguard**: Native plugin triggers are wrapped in environment check blocks:
  ```javascript
  import { Capacitor } from "@capacitor/core";
  if (Capacitor.isNativePlatform()) {
    // Call native Android/iOS SDKs
  } else {
    // Gracefully degrade to mockup state values
  }
  ```

---

## 🛠️ Local Installation & Development

### 1. Clone & Install
```bash
git clone https://github.com/Kasdu/home-gym-hypertrophy-app.git
cd home-gym-hypertrophy-app
npm install
```

### 2. Configure Local Environment Keys
Duplicate `.env.example` as `.env.local` and add your Firebase credentials:
```env
VITE_FIREBASE_API_KEY=your_apiKey
VITE_FIREBASE_AUTH_DOMAIN=your_authDomain
VITE_FIREBASE_PROJECT_ID=your_projectId
VITE_FIREBASE_APP_ID=your_appId
```

### 3. Run Dev Server
```bash
npm run dev
```

### 4. Build and Code Quality Audits
- **Linter Check**: `npm run lint`
- **Compile Production Bundle**: `npm run build`

### 5. Build and Synchronize Mobile Assets (Capacitor)
- Build the web assets and sync with the Android project:
  ```bash
  npm run build:cap
  ```
- Launch Android Studio to build the APK/Bundle:
  ```bash
  npm run cap:open-android
  ```

---

## 🔒 Firestore Security Rules

To enforce secure data isolation between users, apply the following rules in your **Firebase Console -> Firestore Database -> Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 📦 Project Architecture
```
home-gym-hypertrophy-app/
├── android/                   # Native Android studio project files
├── public/                    # PWA icons and manifest assets
├── src/
│   ├── assets/                # App design graphics and icons
│   ├── components/            # UI components
│   │   ├── AuthScreen.jsx     # Firebase Auth overlay login interface
│   │   ├── Dashboard.jsx      # Progress gauges & meso comparisons
│   │   ├── WorkoutLogger.jsx  # Weight suggestions, logging, HR sync
│   │   ├── CardioLog.jsx      # Cardio TRIMP logs & recovery overlay
│   │   ├── RecoveryLog.jsx    # Stacked sleep bar & recovery heatmap
│   │   ├── Insights.jsx       # Consolidated SVGs, correlations, forecasts
│   │   ├── History.jsx        # Meso logs history & e1RM sparklines
│   │   ├── RestTimer.jsx      # Rest timer synthesizer
│   │   ├── Settings.jsx       # Sound/timer picks, reminder schedules
│   │   └── SwapModal.jsx      # Jaccard muscle similarity swaps picker
│   ├── data/                  # Operations, calculations & sync handlers
│   │   ├── database.js        # Muscle activation values & Jaccard index
│   │   ├── analytics.js       # Readiness index, regressions, EWMAs
│   │   ├── firebaseSync.js    # Firestore async sync and loop prevention
│   │   └── smartwatchSync.js  # Capacitor-health sync & web fallbacks
│   ├── App.jsx                # Router, global navigation state, theme engine
│   ├── main.jsx               # Entry-point bootstrap
│   └── index.css              # Custom styling & Midnight/Forest variables
├── capacitor.config.json      # Capacitor project configuration
├── vite.config.js             # Vite compiler config
└── package.json               # Dependencies list
```
