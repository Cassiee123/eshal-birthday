// ============================================================
// gallery.js — Stage 5.
// Arranges all her photos as flat 3D planes around a circle
// (like a carousel), auto-rotates gently, and lets her drag to
// spin it manually. Handles missing images gracefully so the
// site doesn't break before real photos are added.
// ============================================================

import * as THREE from 'three';
import { photoList } from './photos-config.js';

export function initGallery({ scene, camera, registerUpdate }) {

  const galleryGroup = new THREE.Group();
  galleryGroup.visible = false;
  scene.add(galleryGroup);

  const textureLoader = new THREE.TextureLoader();

  // How wide the circle of photos is. More photos = slightly
  // bigger circle so they don't overlap.
  const radius = Math.max(3.2, photoList.length * 0.22);
  const photoWidth = 1.3;
  const photoHeight = 1.6;

  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xf7efe0, roughness: 0.6, side: THREE.DoubleSide });

  photoList.forEach((filename, i) => {
    const angle = (i / photoList.length) * Math.PI * 2;

    // A small white "frame" behind each photo, like a printed photo border
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(photoWidth + 0.12, photoHeight + 0.12, 0.04),
      frameMaterial
    );

    // The photo itself: a flat plane with the image as its texture.
    // We start with a plain placeholder color material so nothing
    // is invisible/broken while the real image file loads (or if
    // it's missing entirely).
    const placeholderMat = new THREE.MeshStandardMaterial({ color: 0x2e1a47, side: THREE.DoubleSide });
    const photoPlane = new THREE.Mesh(new THREE.PlaneGeometry(photoWidth, photoHeight), placeholderMat);
    photoPlane.position.z = 0.03;

    textureLoader.load(
      `images/memories/${filename}`,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;

        // "Cover" fit — crop to fill the frame using the photo's real
        // aspect ratio instead of stretching it to match the frame's
        // shape. Portrait phone photos and landscape screenshots both
        // end up looking correct, never squished or distorted.
        const frameAspect = photoWidth / photoHeight;
        const imgAspect = texture.image.width / texture.image.height;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        if (imgAspect > frameAspect) {
          texture.repeat.set(frameAspect / imgAspect, 1);
          texture.offset.set((1 - texture.repeat.x) / 2, 0);
        } else {
          texture.repeat.set(1, imgAspect / frameAspect);
          texture.offset.set(0, (1 - texture.repeat.y) / 2);
        }

        photoPlane.material = new THREE.MeshStandardMaterial({
          map: texture, roughness: 0.5, side: THREE.DoubleSide,
          emissiveMap: texture, emissive: 0xffffff, emissiveIntensity: 0.35   // brightness lift that follows the photo's own colors, not a flat white wash
        });
      },
      undefined,
      () => {
        // Runs if the image fails to load (e.g. you haven't added it yet).
        // We just leave the placeholder color so the layout still looks fine.
        console.warn(`Could not load images/memories/${filename} — add this file or update photos-config.js`);
      }
    );

    // Group each photo + frame together, position around the circle,
    // and rotate it to face the center (like photos on a carousel wall).
    const photoGroup = new THREE.Group();
    photoGroup.add(frame, photoPlane);
    photoGroup.position.set(
      Math.sin(angle) * radius,
      Math.sin(i * 1.3) * 0.35, // slight height variation, feels more organic than a flat ring
      Math.cos(angle) * radius
    );
    photoGroup.rotation.y = angle + Math.PI; // faces inward toward the center (was pointing outward, away from camera)

    // Store the base angle so our update loop can add a gentle
    // individual bob to each photo without fighting the ring rotation.
    photoGroup.userData.baseY = photoGroup.position.y;
    photoGroup.userData.phase = i * 0.6;

    galleryGroup.add(photoGroup);
  });

  // ---------- AUTO-ROTATE + PER-PHOTO FLOATING ----------
  let autoRotateSpeed = 0.08;
  registerUpdate((delta, elapsed) => {
    if (!galleryGroup.visible) return;
    galleryGroup.rotation.y += autoRotateSpeed * delta;

    galleryGroup.children.forEach((photoGroup) => {
      photoGroup.position.y = photoGroup.userData.baseY + Math.sin(elapsed * 0.6 + photoGroup.userData.phase) * 0.06;
    });
  });

  // ---------- DRAG TO ROTATE MANUALLY ----------
  const galleryStageEl = document.getElementById('stage-gallery');
  let isDragging = false;
  let lastX = 0;

  function onDragStart(x) {
    isDragging = true;
    lastX = x;
    autoRotateSpeed = 0; // stop auto-rotate while she's controlling it
  }
  function onDragMove(x) {
    if (!isDragging) return;
    const deltaX = x - lastX;
    galleryGroup.rotation.y += deltaX * 0.005;
    lastX = x;
  }
  function onDragEnd() {
    isDragging = false;
    // resume gentle auto-rotate a moment after she lets go
    gsap.delayedCall(1.2, () => {
      if (!isDragging) autoRotateSpeed = 0.08;
    });
  }

  galleryStageEl.addEventListener('mousedown', (e) => onDragStart(e.clientX));
  window.addEventListener('mousemove', (e) => onDragMove(e.clientX));
  window.addEventListener('mouseup', onDragEnd);

  galleryStageEl.addEventListener('touchstart', (e) => onDragStart(e.touches[0].clientX));
  window.addEventListener('touchmove', (e) => onDragMove(e.touches[0].clientX));
  window.addEventListener('touchend', onDragEnd);

  // ---------- LEFT / RIGHT NAV BUTTONS ----------
  // Dragging can accidentally select page text instead of rotating the
  // ring, especially on desktop — these buttons rotate by exactly one
  // photo's worth of angle, no dragging required.
  const stepAngle = (Math.PI * 2) / Math.max(photoList.length, 1);
  function stepGallery(direction) {
    autoRotateSpeed = 0;
    gsap.to(galleryGroup.rotation, {
      y: galleryGroup.rotation.y + direction * stepAngle,
      duration: 0.5,
      ease: 'power2.out'
    });
    gsap.delayedCall(1.2, () => { if (!isDragging) autoRotateSpeed = 0.08; });
  }
  document.getElementById('btn-gallery-prev').addEventListener('click', () => stepGallery(-1));
  document.getElementById('btn-gallery-next').addEventListener('click', () => stepGallery(1));

  // ---------- SHOW WHEN STAGE BECOMES ACTIVE ----------
  const observer = new MutationObserver(() => {
    if (galleryStageEl.classList.contains('active')) {
      galleryGroup.visible = true;
      gsap.fromTo(camera.position, { y: 0.6, z: 4.2 }, { y: 0.3, z: 2, duration: 1.8, ease: 'power2.out' });
      gsap.to(camera.rotation, { x: 0, duration: 1.4 });

      const btn = document.getElementById('btn-continue-gallery');
      gsap.delayedCall(3, () => {
        btn.style.pointerEvents = 'auto';
        gsap.to(btn, { opacity: 1, duration: 0.8 });
      });
    } else {
      // Hide once we've moved past this stage
      galleryGroup.visible = false;
    }
  });
  observer.observe(galleryStageEl, { attributes: true, attributeFilter: ['class'] });

  document.getElementById('btn-continue-gallery').addEventListener('click', () => {
    window.goToStage('stage-propose');
  });
}
