// ============================================================
// welcome.js — Stage 1.
// Creates soft floating "firefly" particles for atmosphere,
// and fades in the welcome text + button.
// ============================================================

import * as THREE from 'three';
import { playSplitTransition } from './transition.js?v=4';

export function initWelcome({ scene, registerUpdate }) {

  // ---------- FLOATING PARTICLES ----------
  // We're making hundreds of tiny glowing dots and scattering
  // them randomly in a cube of space around the camera.

  const particleCount = 300;
  const positions = new Float32Array(particleCount * 3); // x,y,z for each particle

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 14; // x: -7 to 7
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10; // y: -5 to 5
    positions[i * 3 + 2] = (Math.random() - 0.5) * 14; // z: -7 to 7
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xe8b24d,
    size: 0.045,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending, // makes overlapping particles glow brighter, like light
    depthWrite: false
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // ---------- ANIMATE THE PARTICLES ----------
  // Every frame, drift them very slowly so it feels alive,
  // not like a static photo of dots.

  registerUpdate((delta, elapsed) => {
    particles.rotation.y = elapsed * 0.02;   // whole field slowly spins
    particles.position.y = Math.sin(elapsed * 0.15) * 0.3; // gentle bob up/down
  });

  // ---------- TEXT + BUTTON FADE-IN ----------
  // GSAP timeline = a sequence of animations that play one after
  // another automatically. Much cleaner than manual setTimeouts.

  const tl = gsap.timeline({ delay: 0.5 });
  tl.to('#stage-welcome .display-text', { opacity: 1, y: -10, duration: 1.4, ease: 'power2.out' })
    .to('#friend-name-text', { opacity: 1, duration: 1.2, ease: 'power2.out' }, '-=0.8')
    .to('#btn-start', { opacity: 1, duration: 1, ease: 'power2.out' }, '-=0.6');

  // ---------- BUTTON CLICK -> SPLIT SCREEN -> CAKE STAGE ----------
  document.getElementById('btn-start').addEventListener('click', () => {
    // Fade the welcome text out at the same moment the curtains start moving
    gsap.to('#stage-welcome', { opacity: 0, duration: 0.6 });

    playSplitTransition(() => {
      window.goToStage('stage-cake');
    });
  });
}
