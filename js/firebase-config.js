// ============================================================
// firebase-config.js
//
// WHY THIS FILE EXISTS (read this before touching anything):
// Cloudinary permanently stores your image FILES — but listing/reading
// them back later requires a SIGNED, authenticated API call, which
// means a secret key. You can't safely put a secret key in a public
// GitHub Pages site (anyone could steal it from the page source).
//
// Firestore solves exactly this one problem: it's a tiny free database
// where the website can safely WRITE a small text record after every
// upload ("here's a photo URL, here's when it was taken"), and safely
// READ all those records back later — from any device, any time. It
// doesn't store the images themselves (Cloudinary still does that),
// it just remembers the list of URLs.
//
// ---------- SETUP (one-time, ~5 minutes) ----------
// 1. Go to https://console.firebase.google.com → "Add project" → give it
//    any name (e.g. "eshal-birthday") → you can skip Google Analytics.
// 2. In the left sidebar: Build → Firestore Database → "Create database"
//    → choose "Start in test mode" for now (see the security note below)
//    → pick any region close to you.
// 3. Click the gear icon (Project settings) → scroll to "Your apps" →
//    click the "</>" (web) icon → register the app (any nickname) →
//    Firebase shows you a `firebaseConfig` object. Paste its values below.
// 4. That's it — no npm install, no build step, this file is the only
//    thing that needs your real values.
//
// ---------- SECURITY NOTE ----------
// "Test mode" makes the database open to anyone for 30 days, which is
// fine while you're building. Before the 30 days are up (or right now,
// if you want to be safe immediately), go to Firestore → Rules and set:
//
//   rules_version = '2';
//   service cloud.firestore {
//     match /databases/{database}/documents {
//       match /photos/{docId} {
//         allow read: if true;                 // anyone can VIEW the gallery
//         allow create: if request.resource.data.keys().hasAll(['url','emotion','createdAt'])
//                       && request.resource.data.url is string;
//         allow update, delete: if false;       // nobody can edit/delete existing memories
//       }
//     }
//   }
//
// This keeps it beginner-friendly (no login system needed) while still
// stopping anyone from deleting or corrupting her memories.
// ============================================================

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDK0HN40L0fQ_VMShwuirzbgL0CMsioe4I',
  authDomain: 'eshal-birthday-1e73d.firebaseapp.com',
  projectId: 'eshal-birthday-1e73d',
  storageBucket: 'eshal-birthday-1e73d.firebasestorage.app',
  messagingSenderId: '1088360679881',
  appId: '1:1088360679881:web:fee49606cefce95cc08018'
};

export const FIREBASE_ENABLED = firebaseConfig.apiKey !== 'YOUR_API_KEY';

let db = null;
if (FIREBASE_ENABLED) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}
export { db };
