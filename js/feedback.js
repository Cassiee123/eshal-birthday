// ============================================================
// feedback.js — the very last stage. Lets her type how she felt
// after seeing everything.
//
// Now saved to FIRESTORE (collection "feedback", one fixed
// document called "main") instead of just localStorage — so
// whatever she writes shows up for BOTH of you, on any device,
// any time you reopen the site. localStorage is only used as a
// same-device fallback if Firebase isn't configured yet.
// ============================================================

import { FIREBASE_ENABLED, db } from './firebase-config.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export function initFeedback() {
  document.getElementById('btn-continue-celebrate').addEventListener('click', () => {
    window.goToStage('stage-feedback');
  });

  const textarea = document.getElementById('feedback-text');
  const confirmMsg = document.getElementById('feedback-confirm');
  const feedbackRef = FIREBASE_ENABLED ? doc(db, 'feedback', 'main') : null;

  // Load whatever was saved before — from Firestore if it's configured
  // (shared, works on any device), otherwise from this browser only.
  async function loadExisting() {
    if (FIREBASE_ENABLED) {
      try {
        const snap = await getDoc(feedbackRef);
        if (snap.exists() && snap.data().text) textarea.value = snap.data().text;
      } catch (err) {
        console.warn('Could not load saved feedback from Firestore:', err);
      }
    } else {
      const saved = localStorage.getItem('birthday-feedback');
      if (saved) textarea.value = saved;
    }
  }
  loadExisting();

  document.getElementById('btn-feedback-save').addEventListener('click', async () => {
    if (FIREBASE_ENABLED) {
      try {
        await setDoc(feedbackRef, { text: textarea.value, updatedAt: serverTimestamp() });
        confirmMsg.textContent = 'Saved 💙 — thank you for sharing that';
      } catch (err) {
        console.warn('Could not save feedback to Firestore, saving locally instead:', err);
        localStorage.setItem('birthday-feedback', textarea.value);
        confirmMsg.textContent = 'Saved on this device 💙 (could not reach the server)';
      }
    } else {
      localStorage.setItem('birthday-feedback', textarea.value);
      confirmMsg.textContent = 'Saved 💙 — thank you for sharing that';
    }
    gsap.fromTo(confirmMsg, { opacity: 0 }, { opacity: 1, duration: 0.6 });
  });

  document.getElementById('btn-feedback-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(textarea.value);
      confirmMsg.textContent = 'Copied 📋 — paste it back to him!';
      gsap.fromTo(confirmMsg, { opacity: 0 }, { opacity: 1, duration: 0.6 });
    } catch (err) {
      confirmMsg.textContent = 'Could not copy — select the text and copy manually';
      gsap.fromTo(confirmMsg, { opacity: 0 }, { opacity: 1, duration: 0.6 });
    }
  });
}
