// ============================================================
// letter.js — Stage 4.
// Builds a 3D envelope with a hinged flap and a wax seal.
// Clicking the seal cracks it, the flap swings open, the
// envelope fades away, and an HTML "paper" card slides in
// with your written message (real text, so it's crisp to read).
// ============================================================

import * as THREE from 'three';

export function initLetter({ scene, camera, registerUpdate }) {

  const letterGroup = new THREE.Group();
  letterGroup.visible = false;
  scene.add(letterGroup);

  // ---------- ENVELOPE BODY ----------
  const envelopeMaterial = new THREE.MeshStandardMaterial({
    color: 0xff8fb0,
    roughness: 0.5,
    emissive: 0xff5d8f,
    emissiveIntensity: 0.15
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 0.05), envelopeMaterial);
  letterGroup.add(body);

  // Soft pink point light so the envelope actually glows, not just its material
  const envelopeGlow = new THREE.PointLight(0xff8fb0, 1.4, 6, 2);
  envelopeGlow.position.set(0, 0.2, 1.2);
  letterGroup.add(envelopeGlow);

  // ---------- STAMP-STYLE STICKERS ON THE COVER ----------
  // Flat, postage-stamp-style decals (dashed border + simple art),
  // drawn on canvas — NOT 3D shapes, just like a real sticker on paper.
  function createStampTexture(draw) {
    const size = 160;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fffaf3';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#e8a4bd';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(6, 6, size - 12, size - 12);
    draw(ctx, size);
    return new THREE.CanvasTexture(canvas);
  }

  const forYouTexture = createStampTexture((ctx, size) => {
    ctx.fillStyle = '#ff5d8f';
    ctx.font = 'bold 22px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('FOR', size / 2, size / 2 - 6);
    ctx.fillText('YOU', size / 2, size / 2 + 24);
    ctx.font = '20px serif';
    ctx.fillText('💌', size / 2, size / 2 - 40);
  });

  const pandaStampTexture = createStampTexture((ctx, size) => {
    const c = size / 2;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(c, c, size * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a2a2a';
    [[-1, -1], [1, -1]].forEach(([sx, sy]) => {
      ctx.beginPath(); ctx.arc(c + sx * size * 0.18, c + sy * size * 0.2, size * 0.075, 0, Math.PI * 2); ctx.fill();
    });
    ctx.beginPath(); ctx.arc(c - size * 0.09, c - size * 0.01, size * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(c + size * 0.09, c - size * 0.01, size * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb3c6'; // chubby pink cheeks
    ctx.beginPath(); ctx.arc(c - size * 0.14, c + size * 0.08, size * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(c + size * 0.14, c + size * 0.08, size * 0.05, 0, Math.PI * 2); ctx.fill();
  });

  function addStamp(texture, x, y, rotation) {
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const stamp = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), mat);
    stamp.position.set(x, y, 0.028);
    stamp.rotation.z = rotation;
    letterGroup.add(stamp);
  }
  addStamp(forYouTexture, -0.75, -0.45, -0.08);
  addStamp(pandaStampTexture, 0.75, -0.45, 0.1);

  // ---------- FLAP (the triangular part that folds down) ----------
  // Drawn as a 2D triangle with THREE.Shape, then given a tiny bit
  // of depth with ExtrudeGeometry so it catches light like paper.
  const flapShape = new THREE.Shape();
  flapShape.moveTo(-1.1, 0);
  flapShape.lineTo(1.1, 0);
  flapShape.lineTo(0, -0.85);
  flapShape.lineTo(-1.1, 0);

  const flapGeo = new THREE.ExtrudeGeometry(flapShape, { depth: 0.03, bevelEnabled: false });
  const flapMaterial = new THREE.MeshStandardMaterial({ color: 0xffb3c6, roughness: 0.45, emissive: 0xff5d8f, emissiveIntensity: 0.1 });

  // Same hinge trick as the door: pivot Group at the top edge,
  // flap mesh offset so its straight edge lines up with the pivot.
  const flapPivot = new THREE.Group();
  flapPivot.position.set(0, 0.75, 0.03);
  letterGroup.add(flapPivot);

  const flapMesh = new THREE.Mesh(flapGeo, flapMaterial);
  flapMesh.rotation.x = Math.PI / 2; // lay it flat, pointing down over the envelope
  flapPivot.add(flapMesh);

  // ---------- WAX SEAL ----------
  const sealMaterial = new THREE.MeshStandardMaterial({
    color: 0xe8b24d,
    emissive: 0x7a4a12,
    emissiveIntensity: 0.4,
    roughness: 0.4,
    metalness: 0.2
  });
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 20), sealMaterial);
  seal.rotation.x = Math.PI / 2;
  seal.position.set(0, 0.2, 0.06);
  letterGroup.add(seal);

  letterGroup.position.set(0, 0, 0);

  // ---------- SHOW WHEN STAGE BECOMES ACTIVE ----------
  const letterStageEl = document.getElementById('stage-letter');
  const observer = new MutationObserver(() => {
    if (letterStageEl.classList.contains('active')) {
      letterGroup.visible = true;
      letterGroup.scale.set(0.01, 0.01, 0.01);
      gsap.to(letterGroup.scale, { x: 1, y: 1, z: 1, duration: 1, ease: 'back.out(1.4)' });
      gsap.fromTo(camera.position, { z: 6 }, { z: 4, duration: 1.4, ease: 'power2.out' });
    }
  });
  observer.observe(letterStageEl, { attributes: true, attributeFilter: ['class'] });

  // ---------- HIDE INSTANTLY THE MOMENT WE START LEAVING (fixes the bug) ----------
  // The old approach hid the envelope in the MutationObserver's "else"
  // branch above, but that only fires once main.js finishes REMOVING the
  // "active" class — which happens in the onComplete of a 0.5s fade-out.
  // For that entire 0.5s, the envelope and opened paper-card were still
  // fully visible while the About page was already fading in on top of
  // them. main.js fires a synchronous "stage-leaving" event the INSTANT
  // a transition starts (before any fade begins) — listening for that
  // here hides everything immediately, with zero lingering overlap.
  window.addEventListener('stage-leaving', (e) => {
    if (e.detail.id !== 'stage-letter') return;

    letterGroup.visible = false;
    gsap.killTweensOf(letterGroup.scale);
    gsap.killTweensOf(letterGroup.position);

    const card = document.getElementById('paper-card');
    gsap.killTweensOf(card);
    card.style.opacity = 0;
    card.style.transform = 'scale(0.85) translateY(30px)';
    card.style.pointerEvents = 'none';
    opened = false; // allow the seal to be opened again if she revisits this stage
  });

  // Gentle idle float so it doesn't feel static
  // ALSO a self-correcting safety net: every single frame (roughly every
  // 16ms), check whether the letter is marked visible but the Letter
  // stage is no longer the active one. If so, force it hidden right
  // here. This exists IN ADDITION to the 'stage-leaving' event listener
  // below — the event listener should already handle this instantly,
  // but if there's ever a timing edge case where that event doesn't
  // fire correctly, this check guarantees the letter can never stay
  // visible for more than one frame after you've actually left the page.
  registerUpdate((delta, elapsed) => {
    if (letterGroup.visible) {
      letterGroup.rotation.y = Math.sin(elapsed * 0.4) * 0.08;
      letterGroup.position.y = Math.sin(elapsed * 0.8) * 0.04;

      if (!letterStageEl.classList.contains('active')) {
        letterGroup.visible = false;
        const card = document.getElementById('paper-card');
        gsap.killTweensOf(card);
        card.style.opacity = 0;
        card.style.transform = 'scale(0.85) translateY(30px)';
        card.style.pointerEvents = 'none';
        opened = false;
      }
    }
  });

  // ---------- TAP THE SEAL SPECIFICALLY TO OPEN (not just anywhere) ----------
  let opened = false;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function tryOpen(clientX, clientY) {
    if (opened) return;
    if (!letterStageEl.classList.contains('active')) return;

    pointer.x = (clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(seal);
    if (hits.length === 0) return; // missed the seal — nothing happens

    opened = true;

    document.getElementById('letter-hint').style.opacity = 0;
    document.getElementById('letter-hint').style.animation = 'none';

    // The seal "cracks": quick squash then shrink away
    gsap.to(seal.scale, {
      x: 1.3, y: 1, z: 1.3, duration: 0.15, ease: 'power1.out',
      onComplete: () => {
        gsap.to(seal.scale, { x: 0, y: 0, z: 0, duration: 0.25, ease: 'power2.in' });
      }
    });

    // The flap swings open like a real envelope flap lifting up
    gsap.to(flapPivot.rotation, { x: -2.6, duration: 1, delay: 0.2, ease: 'power2.inOut' });

    // The whole envelope fades and drops away
    gsap.to(letterGroup.scale, { x: 0.7, y: 0.7, z: 0.7, duration: 0.9, delay: 0.9, ease: 'power2.in' });
    gsap.to(letterGroup.position, {
      y: -1.5, duration: 0.9, delay: 0.9, ease: 'power2.in',
      onComplete: () => {
        // THE ACTUAL BUG: shrinking/moving the envelope down never made
        // it invisible — it was just a smaller pink shape sitting lower
        // on screen, still fully rendered. That's why it kept showing
        // up on later pages regardless of any stage-transition logic.
        // Now it's explicitly hidden once its own animation finishes.
        letterGroup.visible = false;
      }
    });

    // The HTML paper card slides/scales in with your actual message
    const card = document.getElementById('paper-card');
    gsap.to(card, {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 1,
      delay: 1.3,
      ease: 'power3.out',
      onStart: () => { card.style.pointerEvents = 'auto'; }
    });
  }

  window.addEventListener('click', (e) => tryOpen(e.clientX, e.clientY));

  document.getElementById('btn-continue-letter').addEventListener('click', () => {
    window.goToStage('stage-about');
  });
}
