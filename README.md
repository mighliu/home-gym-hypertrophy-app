# Home Gym Hypertrophy Tracker 🏋️‍♂️

A premium, fully autoregulated training macrocycle tracker designed for home gym lifters. The application includes dynamic progressive overload calculations, personal record badges, muscle volume landmark analytics, PWA offline support, and automatic real-time cloud syncing across devices.

---

## 🌟 Key Features

### 1. Workout Logger & Autoregulation
- **Per-Set RIR Selection**: Structured set-by-set Reps-in-Reserve (0 to 5+ RIR) tracking.
- **Form/Fatigue Notes**: Expandable notes field per set for tracking execution cues, fatigue, or gear details.
- **Dynamic Overload Progressions**: Automatic target weights and reps suggested based on performance in preceding sessions.
- **Timer & Superset Grouping**: Custom rest timers per exercise and clean visual grouping borders for contiguous supersets.
- **PR Trophy Badges (🏆)**: Automatic Estimated 1RM (e1RM) calculation that checks records across your history, awarding trophy badges instantly.
- **Demonstration Links**: Direct Youtube demo searches for every exercise slot.

### 2. Muscle Volume Landmarks & Analytics
- **MEV / MRV Tuning**: Custom Minimum Effective Volume and Maximum Recoverable Volume targets per muscle group.
- **Dashboard Progression Charts**: 30-day interactive SVG bodyweight trend lines.
- **Volume Heatmaps**: Dynamic progress bars comparing actual weekly sets against MEV/MRV sweet spots.

### 3. PWA Offline & Service Worker
- **PWA Standalone Display**: Fully installable on iOS, Android, and desktop devices.
- **Network-First Service Worker**: Instantly caches static assets so the app works flawlessly in underground or steel-framed gym environments.
- **LocalStorage Parity**: Keeps 100% of data saved locally first, queuing updates to sync automatically once reconnected.

### 4. Real-Time Cloud Syncing (Firebase)
- **Zero-Friction Sync**: Background synchronization automatically pushes modifications to Firestore with 1.5s write debouncing to avoid API throttling.
- **Loop Prevention Engine**: Smart client-side timestamp comparison avoids recursive syncing updates.
- **Secure Auth Overlay**: Dedicated Auth landing page restricting app access for unregistered or unauthenticated visitors.

---

## 🛠️ Local Installation & Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Kasdu/home-gym-hypertrophy-app.git
   cd home-gym-hypertrophy-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure your Local Environment Keys**:
   - Duplicate the template file `.env.example` and name the copy `.env.local` (this file is ignored by Git to secure credentials).
   - Enter your Firebase Web app keys inside `.env.local`:
     ```env
     VITE_FIREBASE_API_KEY=your_apiKey
     VITE_FIREBASE_AUTH_DOMAIN=your_authDomain
     VITE_FIREBASE_PROJECT_ID=your_projectId
     VITE_FIREBASE_APP_ID=your_appId
     ```

4. **Launch dev environment**:
   ```bash
   npm run dev
   ```

---

## 🚀 Hosting Online (Vercel)

1. Create a project on [Vercel](https://vercel.com) and import your GitHub repository.
2. In the Vercel Project settings, go to **Environment Variables** and add:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
3. Click **Deploy**. Vercel will build your app and deploy it on a public domain.

---

## 🔒 Firestore Security Rules

To ensure that users can only read and write their own training documents, configure the following rules in your **Firebase Console -> Firestore Database -> Rules** tab:

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

## 📦 Tech Stack
- **Frontend Framework**: React 19 + Vite
- **Styling**: Vanilla CSS (Cyber Neon & Spreadsheet Light themes)
- **Database & Sync**: Firebase Auth & Firestore
- **State Management**: React Hooks + LocalStorage
