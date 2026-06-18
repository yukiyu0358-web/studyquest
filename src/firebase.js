// ============ Firebase Initialization (compat) ============
// フェーズAでは元コードと同じ compat API を維持し、書き換えを最小化する。
// modular SDK への移行はフェーズC（任意）で段階的に行う。
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD-3GEV9Zu_l94Mh13nMwxOTWjzj8Ww82o",
  authDomain: "my-study-app-75ff1.firebaseapp.com",
  projectId: "my-study-app-75ff1",
  storageBucket: "my-study-app-75ff1.firebasestorage.app",
  messagingSenderId: "786454097245",
  appId: "1:786454097245:web:2204cdf7a1bb957536ccb4",
};

firebase.initializeApp(firebaseConfig);

export const fbAuth = firebase.auth();
export const fbDb = firebase.firestore();
// FieldValue.serverTimestamp() を App.jsx 側で使うために再エクスポート
export const fbFieldValue = firebase.firestore.FieldValue;

// Enable offline persistence
fbDb
  .enablePersistence({ synchronizeTabs: true })
  .catch((err) => {
    console.warn("Offline persistence not available:", err.code);
  });

export default firebase;
