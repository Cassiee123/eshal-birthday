// ============================================================
// photobooth.js — the Magic Photo Booth stage.
// Pure HTML/CSS/JS + GSAP (no Three.js scene needed here, same as
// feedback.js/music.js elsewhere in this project).
//
// STORAGE ARCHITECTURE (see firebase-config.js for the full why/how):
//   1. Each captured photo uploads to CLOUDINARY -> gives a permanent
//      secure_url for the actual image file.
//   2. That URL gets written to FIRESTORE as a tiny record
//      { url, emotion, createdAt }. Firestore is what lets EVERY
//      device that opens the site see the SAME accumulated gallery -
//      Cloudinary alone has no safe way for a static site to "ask"
//      what it uploaded before.
//   3. localStorage still caches the current attempt's 3 photos
//      locally too, purely as an instant fallback if Firestore isn't
//      configured yet or a network hiccup happens.
// ============================================================

import { FIREBASE_ENABLED, db } from './firebase-config.js?v=4';
import {
  collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs
} from 'firebase/firestore';

const STORAGE_KEY = 'boothPhotos_v1';
const GALLERY_SIZE = 9; // the memory wall holds this many frames, FIFO after that

// ---------- CLOUDINARY CONFIG ----------
const CLOUDINARY_CLOUD_NAME = 'kdzum760';
const CLOUDINARY_UPLOAD_PRESET = 'eshal_birthday';
const CLOUD_ENABLED = true;

const EMOTIONS = [
  { key: 'happy', emoji: '😁', label: 'Happy' },
  { key: 'angry', emoji: '😠', label: 'Angry' },
  { key: 'sad',   emoji: '🥺', label: 'Sad' }
];

// 9 unique decorative "memory board" styles - each carries its own
// theme, tiny rotation, and mount style (pin / tape / hanging string)
// so the wall reads as a real scrapbook, not a repeating CSS grid.
const FRAME_THEMES = [
  { name: 'panda',    emoji: '🐼', corner: '🐾', mount: 'pin',    rotate: -6  },
  { name: 'cat',      emoji: '🐱', corner: '🐟', mount: 'tape',   rotate: 4   },
  { name: 'ribbon',   emoji: '🎀', corner: '💗', mount: 'string', rotate: -3  },
  { name: 'teddy',    emoji: '🧸', corner: '🍯', mount: 'tape',   rotate: 7   },
  { name: 'sakura',   emoji: '🌸', corner: '🌷', mount: 'pin',    rotate: -4  },
  { name: 'birthday', emoji: '🎂', corner: '🎉', mount: 'string', rotate: 5   },
  { name: 'cloud',    emoji: '☁️', corner: '🌈', mount: 'tape',   rotate: -7  },
  { name: 'heart',    emoji: '💖', corner: '✨', mount: 'pin',    rotate: 3   },
  { name: 'star',     emoji: '⭐', corner: '🌟', mount: 'string', rotate: -2  }
];

export function initPhotobooth() {
  const video = document.getElementById('booth-video');
  const canvas = document.getElementById('booth-canvas');
  const statusEl = document.getElementById('booth-status');
  const captureBtn = document.getElementById('btn-booth-capture');
  const countdownEl = document.getElementById('booth-countdown');
  const flashEl = document.getElementById('booth-flash');
  const emojiPromptEl = document.getElementById('booth-emoji-prompt');
  const analyzingEl = document.getElementById('booth-analyzing');
  const analyzingTextEl = document.getElementById('booth-analyzing-text');
  const galleryGrid = document.getElementById('booth-gallery-grid');
  const retakeBtn = document.getElementById('btn-booth-retake');
  const continueBtn = document.getElementById('btn-continue-photobooth');

  let stream = null;
  let emotionIndex = 0;
  let attempt = 1;
  const MAX_ATTEMPTS = 3;
  let photos = {};         // this attempt's 3 photos: { happy: url-or-dataURL, ... }
  let pendingUploads = []; // Cloudinary upload promises for the current attempt
  let galleryMemories = []; // the accumulated up-to-9 memories shown in the wall
  // ALL photos captured during THIS run — 3 attempts × 3 emotions = 9.
  // This is what fills the 9-frame wall, so every single shot she takes
  // is kept, not just the final attempt's 3.
  let capturedThisRun = [];

  initGalleryFromCloud();
  setupAmbientAnimation();
  spawnGalleryMagic();

  function setupAmbientAnimation() {
    // Multi-layer parallax drift — back layer (blobs/ribbons) moves
    // slow & wide, mid layer (clouds/butterflies/balloons) moves
    // faster & smaller, giving real depth instead of a flat backdrop.
    gsap.utils.toArray('#booth-bg-back .blob').forEach((el, i) => {
      gsap.to(el, {
        x: `+=${60 + i * 20}`, y: `+=${-40 - i * 10}`,
        duration: 14 + i * 3, ease: 'sine.inOut', yoyo: true, repeat: -1
      });
    });
    gsap.utils.toArray('#booth-bg-back .ribbon-stroke').forEach((el, i) => {
      gsap.to(el, {
        x: `+=${i % 2 === 0 ? 40 : -40}`, rotation: `+=${i % 2 === 0 ? 6 : -6}`,
        duration: 10 + i * 2, ease: 'sine.inOut', yoyo: true, repeat: -1
      });
    });
    gsap.utils.toArray('#booth-bg-mid .drift-emoji').forEach((el, i) => {
      gsap.set(el, { x: `${10 + i * 22}%`, y: `${15 + (i % 3) * 25}%` });
      gsap.to(el, {
        x: `+=${i % 2 === 0 ? 90 : -90}`, y: '+=30', rotation: `+=${10}`,
        duration: 8 + i * 2.5, ease: 'sine.inOut', yoyo: true, repeat: -1
      });
    });
    // Gentle "breathing" glow on the whole booth stage area
    gsap.to('.booth-stage-area', { boxShadow: '0 0 44px rgba(255,170,85,0.55), inset 0 0 40px rgba(0,0,0,0.4)', duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }

  // Load the newest 9 photos from Firebase (permanent, cross-device).
  // Falls back to empty frames if Firebase isn't configured.
  async function initGalleryFromCloud() {
    galleryMemories = [];
    if (FIREBASE_ENABLED) {
      try {
        const q = query(collection(db, 'photos'), orderBy('createdAt', 'desc'), limit(GALLERY_SIZE));
        const snap = await getDocs(q);
        snap.forEach(doc => {
          const d = doc.data();
          if (d.url) galleryMemories.push({ emotion: d.emotion || '', url: d.url });
        });
        galleryMemories.reverse(); // oldest first so newest are at the end
      } catch (err) {
        console.warn('Could not load photos from Firebase:', err);
      }
    }
    if (galleryMemories.length === 0 && !FIREBASE_ENABLED) {
      // Only ever touches localStorage if Firebase isn't configured at all
      galleryMemories = loadLocalPhotos().slice(-GALLERY_SIZE);
    }
    buildGallery(galleryMemories);
  }

  // Spawn magical floating particles for the gallery background
  function spawnGalleryMagic() {
    const sparklesEl = document.getElementById('gallery-sparkles');
    const petalsEl = document.getElementById('gallery-petals');
    if (!sparklesEl || !petalsEl) return;

    // Sparkles
    for (let i = 0; i < 25; i++) {
      const s = document.createElement('div');
      s.className = 'gallery-sparkle';
      s.style.left = `${Math.random() * 100}%`;
      s.style.top = `${Math.random() * 100}%`;
      s.style.setProperty('--dur', `${2 + Math.random() * 4}s`);
      s.style.setProperty('--delay', `${Math.random() * 5}s`);
      s.style.width = s.style.height = `${2 + Math.random() * 4}px`;
      sparklesEl.appendChild(s);
    }

    // Twinkling stars
    const starChars = ['✦', '✧', '⋆', '✵'];
    for (let i = 0; i < 12; i++) {
      const s = document.createElement('span');
      s.className = 'gallery-star';
      s.textContent = starChars[i % starChars.length];
      s.style.left = `${5 + Math.random() * 90}%`;
      s.style.top = `${5 + Math.random() * 90}%`;
      s.style.fontSize = `${0.5 + Math.random() * 0.8}rem`;
      s.style.setProperty('--dur', `${3 + Math.random() * 4}s`);
      s.style.setProperty('--delay', `${Math.random() * 6}s`);
      sparklesEl.appendChild(s);
    }

    // Sakura petals
    const petalEmoji = ['🌸', '🩷', '✿'];
    for (let i = 0; i < 8; i++) {
      const p = document.createElement('span');
      p.className = 'gallery-petal';
      p.textContent = petalEmoji[i % petalEmoji.length];
      p.style.left = `${Math.random() * 100}%`;
      p.style.setProperty('--size', `${0.7 + Math.random() * 0.8}rem`);
      p.style.setProperty('--dur', `${10 + Math.random() * 10}s`);
      p.style.setProperty('--delay', `${Math.random() * 12}s`);
      p.style.setProperty('--drift', `${-40 + Math.random() * 80}px`);
      p.style.setProperty('--spin', `${180 + Math.random() * 360}deg`);
      petalsEl.appendChild(p);
    }

    // Floating hearts
    for (let i = 0; i < 6; i++) {
      const h = document.createElement('span');
      h.className = 'gallery-heart';
      h.textContent = ['💖', '💗', '💕', '🤍', '💜', '💙'][i];
      h.style.left = `${10 + Math.random() * 80}%`;
      h.style.bottom = '-20px';
      h.style.fontSize = `${0.8 + Math.random() * 0.6}rem`;
      h.style.setProperty('--dur', `${8 + Math.random() * 8}s`);
      h.style.setProperty('--delay', `${Math.random() * 10}s`);
      petalsEl.appendChild(h);
    }

    // Butterflies
    for (let i = 0; i < 3; i++) {
      const b = document.createElement('span');
      b.className = 'gallery-butterfly';
      b.textContent = '🦋';
      b.style.left = `${Math.random() * 30}%`;
      b.style.top = `${20 + Math.random() * 60}%`;
      b.style.setProperty('--size', `${1 + Math.random() * 0.5}rem`);
      b.style.setProperty('--dur', `${14 + Math.random() * 8}s`);
      b.style.setProperty('--delay', `${Math.random() * 8}s`);
      b.style.setProperty('--dx', `${150 + Math.random() * 200}px`);
      b.style.setProperty('--dy', `${-80 + Math.random() * 60}px`);
      b.style.setProperty('--ex', `${300 + Math.random() * 200}px`);
      b.style.setProperty('--ey', `${-30 + Math.random() * 80}px`);
      petalsEl.appendChild(b);
    }

    // Theme icons (panda/cat/ribbon/teddy/etc.) as side decorations —
    // kept out of the center so they never compete with the frames,
    // just drifting gently along the left/right margins like little
    // stickers scattered around the memory wall.
    FRAME_THEMES.forEach((theme, i) => {
      const icon = document.createElement('span');
      icon.className = 'gallery-star gallery-theme-icon';
      icon.textContent = theme.emoji;
      const onLeft = i % 2 === 0;
      icon.style.left = onLeft ? `${2 + Math.random() * 12}%` : `${86 + Math.random() * 12}%`;
      icon.style.top = `${8 + (i / FRAME_THEMES.length) * 84 + Math.random() * 6}%`;
      icon.style.fontSize = `${1.1 + Math.random() * 0.6}rem`;
      icon.style.setProperty('--dur', `${4 + Math.random() * 3}s`);
      icon.style.setProperty('--delay', `${Math.random() * 5}s`);
      sparklesEl.appendChild(icon);
    });

    // Ribbon light trails
    const ribbonColors = ['rgba(255,182,213,0.4)', 'rgba(167,139,250,0.35)', 'rgba(129,212,250,0.3)', 'rgba(255,200,150,0.3)'];
    for (let i = 0; i < 4; i++) {
      const r = document.createElement('div');
      r.className = 'gallery-ribbon';
      r.style.top = `${15 + i * 20}%`;
      r.style.left = '0';
      r.style.width = `${80 + Math.random() * 120}px`;
      r.style.background = `linear-gradient(90deg, transparent, ${ribbonColors[i]}, transparent)`;
      r.style.setProperty('--dur', `${7 + Math.random() * 6}s`);
      r.style.setProperty('--delay', `${i * 3 + Math.random() * 3}s`);
      petalsEl.appendChild(r);
    }
  }

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      video.srcObject = stream;
      return true;
    } catch (err) {
      statusEl.textContent = "Couldn't access your camera 😢 (check browser permissions)";
      return false;
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  captureBtn.addEventListener('click', async () => {
    captureBtn.disabled = true;
    captureBtn.style.opacity = 0.5;

    const ok = await startCamera();
    if (!ok) { captureBtn.disabled = false; captureBtn.style.opacity = 1; return; }

    captureBtn.style.display = 'none';
    emotionIndex = 0;
    pendingUploads = [];
    runNextEmotion();
  });

  function runNextEmotion() {
    if (emotionIndex >= EMOTIONS.length) {
      finishAttempt();
      return;
    }
    const emo = EMOTIONS[emotionIndex];
    emojiPromptEl.textContent = emo.emoji;
    emojiPromptEl.style.opacity = 1;
    statusEl.textContent = `Make a ${emo.label} face! ${emo.emoji}`;
    gsap.fromTo(emojiPromptEl, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2)' });

    let count = 3;
    countdownEl.style.opacity = 1;
    countdownEl.className = 'booth-countdown pulse-ring';
    countdownEl.textContent = count;
    const tick = setInterval(() => {
      count -= 1;
      if (count > 0) {
        countdownEl.textContent = count;
        gsap.fromTo(countdownEl, { scale: 1.5, opacity: 0.6 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.5)' });
      } else {
        clearInterval(tick);
        countdownEl.textContent = '📸';
        capturePhoto(emo);
      }
    }, 800);
  }

  function capturePhoto(emo) {
    flashEl.style.opacity = 1;
    gsap.to(flashEl, { opacity: 0, duration: 0.4, delay: 0.05 });

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 360;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    photos[emo.key] = dataUrl;

    // Keep EVERY captured shot for the 9-frame wall (not just the last
    // attempt). We hold a reference to this entry so that when its
    // Cloudinary upload finishes, we can swap the heavy local dataURL
    // for the permanent hosted URL in place.
    const capturedEntry = { emotion: emo.key, url: dataUrl };
    capturedThisRun.push(capturedEntry);

    countdownEl.style.opacity = 0;

    const frame = document.getElementById(`frame-${emo.key}`);
    const videoRect = video.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();

    const flyer = document.createElement('img');
    flyer.src = dataUrl;
    flyer.className = 'booth-flying-photo';
    flyer.style.left = `${videoRect.left + videoRect.width / 2 - 60}px`;
    flyer.style.top = `${videoRect.top + videoRect.height / 2 - 45}px`;
    document.body.appendChild(flyer);

    gsap.to(flyer, {
      left: frameRect.left + frameRect.width / 2 - 60,
      top: frameRect.top + frameRect.height / 2 - 45,
      scale: 0.35,
      rotation: (Math.random() * 30 - 15),
      duration: 0.9,
      ease: 'power2.inOut',
      onComplete: () => {
        frame.style.backgroundImage = `url(${dataUrl})`;
        frame.classList.add('filled');
        gsap.fromTo(frame, { scale: 1.15 }, { scale: 1, duration: 0.4, ease: 'back.out(2)' });
        flyer.remove();

        if (CLOUD_ENABLED) {
          const uploadPromise = uploadToCloudinary(dataUrl)
            .then((secureUrl) => {
              photos[emo.key] = secureUrl;
              capturedEntry.url = secureUrl; // swap local preview for permanent hosted URL
              frame.style.backgroundImage = `url(${secureUrl})`;
            })
            .catch((err) => {
              console.warn(`Cloudinary upload failed for "${emo.key}", keeping local preview instead:`, err);
            });
          pendingUploads.push(uploadPromise);
        }

        emotionIndex += 1;
        setTimeout(runNextEmotion, 500);
      }
    });
  }

  // Two distinct "doesn't match" messages (one per rejected attempt),
  // each with a different funny emoji, so it doesn't feel repetitive.
  const REJECT_MESSAGES = [
    "Hmm...<br>This doesn't match the emoji challenge 🙁",
    "Nope...<br>Still not convinced 🫥"
  ];

  function finishAttempt() {
    emojiPromptEl.style.opacity = 0;
    statusEl.textContent = '';
    analyzingEl.style.display = 'flex';
    analyzingTextEl.textContent = 'Analyzing your photos...';

    setTimeout(() => {
      if (attempt < MAX_ATTEMPTS) {
        analyzingTextEl.innerHTML = REJECT_MESSAGES[attempt - 1] || REJECT_MESSAGES[0];
        setTimeout(() => {
          attempt += 1;
          analyzingEl.style.display = 'none';
          statusEl.textContent = `Try again — attempt ${attempt} of ${MAX_ATTEMPTS} 🔁`;
          captureBtn.style.display = 'inline-block';
          captureBtn.textContent = 'Retry 🎬';
          captureBtn.disabled = false;
          captureBtn.style.opacity = 1;
          EMOTIONS.forEach(e => {
            const f = document.getElementById(`frame-${e.key}`);
            f.style.backgroundImage = '';
            f.classList.remove('filled');
          });
        }, 2000);
      } else {
        analyzingTextEl.innerHTML = "Okay...<br>You're simply too cute to reject ❤️";

        Promise.allSettled(pendingUploads).then(async () => {
          // The wall shows exactly THIS run's photos — all 9 of them
          // (3 attempts × 3 emotions). We show them immediately so she
          // always sees the pictures she just took, never stale ones.
          galleryMemories = capturedThisRun.slice(-GALLERY_SIZE);
          buildGallery(galleryMemories);

          if (FIREBASE_ENABLED) {
            analyzingTextEl.innerHTML += "<br><span style='font-size:0.85em; opacity:0.8;'>Saving to your permanent memory wall... 💾</span>";
            // Save every one of this run's 9 shots, not just the last 3.
            await saveRunToFirestore(capturedThisRun);
          } else {
            // No Firestore yet — persist this run's 9 locally so they're
            // still here if she reopens the site on this device.
            appendLocalPhotos(capturedThisRun);
          }
          // Give her a moment to actually READ "too cute to reject"
          // before the page moves on — this was previously missing,
          // which is why it looked like it "skipped" straight to the
          // gallery.
          setTimeout(proceedToGallery, 2200);
        });
      }
    }, 1800);
  }

  async function saveRunToFirestore(runEntries) {
    try {
      await Promise.all(runEntries.map(({ emotion, url }) =>
        addDoc(collection(db, 'photos'), { url, emotion, createdAt: serverTimestamp() })
      ));
    } catch (err) {
      console.warn('Could not save this run to Firestore (gallery may not persist across devices):', err);
    }
  }

  function proceedToGallery() {
    stopCamera();
    window.goToStage('stage-photobooth-gallery');
  }

  // Builds the scrapbook-style memory wall from an array of
  // { emotion, url } objects, oldest first, newest last - new
  // memories simply push older ones off the 9-frame wall over time.
  function buildGallery(memories) {
    galleryGrid.innerHTML = '';
    const slots = memories.slice(-GALLERY_SIZE);
    console.assert(FRAME_THEMES.length === GALLERY_SIZE, `Expected ${GALLERY_SIZE} frame themes, found ${FRAME_THEMES.length}`);
    FRAME_THEMES.forEach((theme, i) => {
      const memory = slots[i];
      const card = document.createElement('div');
      card.className = `booth-deco-frame theme-${theme.name} holder-${theme.mount}${memory && memory.url ? ' filled' : ''}`;
      card.style.setProperty('--rot', `${theme.rotate}deg`);
      card.style.animationDelay = `${i * 0.12}s`;
      card.innerHTML = `
        ${theme.mount === 'string' ? '<span class="mount-string"></span>' : ''}
        ${theme.mount === 'tape' ? '<span class="washi-tape"></span>' : ''}
        ${theme.mount === 'pin' ? '<span class="pin-dot"></span>' : ''}
        <span class="deco-corner tl">${theme.emoji}</span>
        <span class="deco-corner br">${theme.corner}</span>
        <div class="deco-photo" style="${memory && memory.url ? `background-image:url(${memory.url})` : ''}"></div>
      `;
      galleryGrid.appendChild(card);
    });
  }

  retakeBtn.addEventListener('click', () => {
    photos = {};
    attempt = 1;
    capturedThisRun = []; // fresh run — start collecting a new set of 9
    EMOTIONS.forEach(e => {
      const f = document.getElementById(`frame-${e.key}`);
      f.style.backgroundImage = '';
      f.classList.remove('filled');
    });
    captureBtn.style.display = 'inline-block';
    captureBtn.textContent = 'Start 🎬';
    captureBtn.disabled = false;
    captureBtn.style.opacity = 1;
    statusEl.textContent = 'Allow camera access to begin 🎬';
    window.goToStage('stage-photobooth');
  });

  continueBtn.addEventListener('click', () => {
    window.goToStage('stage-gift');
  });

  window.addEventListener('stage-leaving', (e) => {
    if (e.detail && e.detail.id === 'stage-photobooth') stopCamera();
  });

  // ---------- CLOUDINARY (stores the actual image files, permanently) ----------
  async function uploadToCloudinary(dataUrl) {
    const form = new FormData();
    form.append('file', dataUrl);
    form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form
    });
    if (!res.ok) throw new Error(`Cloudinary upload failed: ${res.status}`);
    const json = await res.json();
    return json.secure_url;
  }

  // ---------- LOCAL FALLBACK (instant, same-device only) ----------
  // FIX: this used to save `photos` — an object with exactly 3 fixed
  // keys (happy/angry/sad) — which got fully OVERWRITTEN every single
  // attempt. That meant only the most recent 3 photos could ever exist
  // locally, no matter how many times the challenge was completed. Now
  // this stores a growing ARRAY of individual photo entries and simply
  // adds the newest 3 to it each time, keeping only the last 9 overall —
  // matching "every captured photo fills the next frame" correctly.
  function appendLocalPhotos(newEntries) {
    let existing = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      existing = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(existing)) existing = []; // old-format data from before this fix — safely discard it
    } catch (e) { existing = []; }

    const updated = [...existing, ...newEntries].slice(-GALLERY_SIZE);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch (e) { /* storage full - non-fatal */ }
    return updated;
  }
  function loadLocalPhotos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : []; // old-format data from before this fix — safely discard it
    } catch (e) { return []; }
  }
}
