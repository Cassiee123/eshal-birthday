// ============================================================
// main.js — the "director" of the whole experience.
// It sets up the 3D world once, then hands control to each
// stage file (welcome.js, cake.js, ...) when it's their turn.
//
// CACHE-BUSTING NOTE: every local import below has "?v=4" appended.
// Browsers (and GitHub Pages' CDN) aggressively cache .js files by
// URL. Without this, updating a file like letter.js on the server
// doesn't guarantee a visitor's browser actually re-downloads it —
// it can keep silently running an old cached copy indefinitely,
// which looks EXACTLY like "the fix didn't work" even though the
// server has the correct file. Adding "?v=4" makes this a brand new
// URL as far as the browser's cache is concerned, forcing a fresh
// download. Bump this number (v=4, v=5, ...) any time you want to
// force every visitor to get the latest files again.
// ============================================================

import * as THREE from 'three';
import { initWelcome } from './welcome.js?v=4';
import { initCake } from './cake.js?v=4';
import { initLetter } from './letter.js?v=4';
import { initAbout } from './about.js?v=4';
import { initGift } from './giftbox.js?v=4';
import { initPhotobooth } from './photobooth.js?v=4';
import { initFavorites } from './favorites.js?v=4';
import { initGallery } from './gallery.js?v=4';
import { initPropose } from './propose.js?v=4';
import { initFeedback } from './feedback.js?v=4';
import { initHearts } from './hearts.js?v=4';
import { initMusic } from './music.js?v=4';

// ---------- 1. BASIC THREE.JS SETUP ----------
// Every Three.js app needs 3 things: a Scene (the world),
// a Camera (the eye), and a Renderer (draws it onto the canvas).

// VERSION CHECK: open your browser's DevTools console (F12, or right-click
// -> Inspect -> Console tab) and reload the page. If you do NOT see this
// exact message, your browser is running a cached/old copy of main.js and
// none of the fixes below are actually active yet — try a hard refresh
// (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac) or an incognito window.
console.log('%c🎂 Birthday site running: main.js v4 (photobooth 9-frames + colorful balloons)', 'color:#f5b942; font-weight:bold; font-size:14px;');

const canvas = document.getElementById('bg-canvas');

const scene = new THREE.Scene();
scene.background = null; // transparent — the warm gradient behind it comes from CSS, showing through on every stage

const camera = new THREE.PerspectiveCamera(
  45,                                   // field of view (how "zoomed" it feels)
  window.innerWidth / window.innerHeight, // aspect ratio, matches the screen
  0.1,                                   // nearest distance it will render
  100                                    // farthest distance it will render
);
camera.position.set(0, 1.4, 6); // slightly up, pulled back so we can see things

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,   // smooths jagged edges
  alpha: true         // lets the CSS background gradient show through the canvas
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // sharp on phones without killing performance

// ---------- 2. LIGHTING ----------
// Without lights, 3D objects look flat and black. Warm-toned lights
// match the coral/red background instead of looking mismatched.

const ambientLight = new THREE.AmbientLight(0x4a7fc7, 0.65);
scene.add(ambientLight);

const warmLight = new THREE.PointLight(0xffaa55, 2.2, 20, 2);
warmLight.position.set(0, 2, 3);
scene.add(warmLight);

const rimLight = new THREE.PointLight(0x6ec6ff, 1.3, 20, 2);
rimLight.position.set(-3, 3, -2);
scene.add(rimLight);

// ---------- 3. HANDLE WINDOW RESIZING ----------
// If someone resizes their browser (or rotates their phone),
// the camera and renderer need to know the new size.

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- 4. THE ANIMATION LOOP ----------
// This function runs ~60 times per second, forever. Each stage
// can register a function here (via registerUpdate) if it needs
// to animate something every frame (like rotating particles).

const updateCallbacks = [];
export function registerUpdate(fn) {
  updateCallbacks.push(fn);
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();       // time since last frame
  const elapsed = clock.getElapsedTime();
  updateCallbacks.forEach(fn => fn(delta, elapsed));
  renderer.render(scene, camera);
}
animate();

// ---------- 5. STAGE MANAGER ----------
// This is the simple system that moves the story forward.
// Each stage is an HTML section. We fade the old one out,
// swap the "active" class, and fade the new one in.

function goToStage(stageId) {
  const current = document.querySelector('.stage.active');
  const next = document.getElementById(stageId);
  if (current === next) return;

  if (current) {
    window.dispatchEvent(new CustomEvent('stage-leaving', { detail: { id: current.id } }));
  }

  // Kill any leftover tweens on either element — this is what was causing
  // stages to look "stuck" for a second before abruptly disappearing:
  // a stray tween from a stage's own reveal animation could still be
  // running and fighting this fade.
  gsap.killTweensOf(current);
  gsap.killTweensOf(next);

  next.style.opacity = 0;
  next.classList.add('active');

  if (current) {
    gsap.to(current, {
      opacity: 0,
      duration: 0.5,
      ease: 'power1.out',
      onComplete: () => {
        current.classList.remove('active');
        current.style.opacity = ''; // reset for next time
      }
    });
  }

  // Both fade at the same time now — a real crossfade, no gap in between
  gsap.to(next, { opacity: 1, duration: 0.7, ease: 'power1.out' });
}

// Make it available to other files without complicated imports everywhere
window.goToStage = goToStage;

// ---------- 6. KICK OFF STAGE 1 ----------
// Each init function receives the shared scene/camera so it can
// add its own 3D objects to the same world.

initWelcome({ scene, camera, registerUpdate });
initCake({ scene, camera, registerUpdate });
initLetter({ scene, camera, registerUpdate });
initAbout({ scene, camera, registerUpdate });
initGift({ scene, camera, registerUpdate });
initPhotobooth();
initFavorites({ scene, camera, registerUpdate });
initGallery({ scene, camera, registerUpdate });
initPropose({ scene, camera, registerUpdate });
initFeedback();
initHearts();
initMusic();
