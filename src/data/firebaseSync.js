import { initializeApp, getApp, getApps } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot
} from "firebase/firestore";

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let unsubscribeSnapshot = null;

export function initFirebase(config) {
  if (!config || !config.apiKey || !config.projectId || !config.appId) {
    return false;
  }
  try {
    if (getApps().length === 0) {
      firebaseApp = initializeApp(config);
    } else {
      firebaseApp = getApp();
    }
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = getFirestore(firebaseApp);
    return true;
  } catch (err) {
    console.error("Firebase initialization failed:", err);
    return false;
  }
}

export function getFirebaseAuth() {
  return firebaseAuth;
}

export function getFirebaseDb() {
  return firebaseDb;
}

export function onAuthChange(callback) {
  if (!firebaseAuth) return () => {};
  return onAuthStateChanged(firebaseAuth, callback);
}

export async function loginUser(email, password) {
  if (!firebaseAuth) throw new Error("Firebase not initialized");
  return signInWithEmailAndPassword(firebaseAuth, email, password);
}

export async function registerUser(email, password) {
  if (!firebaseAuth) throw new Error("Firebase not initialized");
  return createUserWithEmailAndPassword(firebaseAuth, email, password);
}

export async function logoutUser() {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
  if (!firebaseAuth) return;
  return signOut(firebaseAuth);
}

export async function resetPassword(email) {
  if (!firebaseAuth) throw new Error("Firebase not initialized");
  return sendPasswordResetEmail(firebaseAuth, email);
}

export function subscribeToCloudData(uid, onDataReceived) {
  if (!firebaseDb) return null;
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
  }
  const docRef = doc(firebaseDb, "users", uid);
  unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && data.backup) {
        onDataReceived(data.backup, data.lastUpdated);
      }
    }
  }, (err) => {
    console.error("Firestore subscription error:", err);
  });
  return unsubscribeSnapshot;
}

export async function saveToCloud(uid, backupData) {
  if (!firebaseDb) return;
  const docRef = doc(firebaseDb, "users", uid);
  await setDoc(docRef, {
    backup: backupData,
    lastUpdated: Date.now()
  }, { merge: true });
}

export function unsubscribeFromCloud() {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
}
