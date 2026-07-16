// ============================================================
// about.js — Stage 4.5 (REWRITTEN).
// A softly glowing moon (real gradient texture, not a flat
// purple ball), a small floating panda, and text lines that are
// driven DIRECTLY by scroll/swipe progress — so the motion feels
// like a real 3D scene responding to her, not a fixed animation.
// ============================================================

import * as THREE from 'three';

function createMoonTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size * 0.38, size * 0.36, size * 0.04, size * 0.5, size * 0.5, size * 0.56);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.45, '#eef6ff');
  gradient.addColorStop(0.75, '#c9def5');
  gradient.addColorStop(1, '#93b8e0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  // more visible, varied craters for real texture instead of a flat ball
  const craterSpots = [[0.35,0.3,0.07],[0.6,0.42,0.05],[0.45,0.62,0.09],[0.68,0.25,0.04],[0.3,0.55,0.045],[0.58,0.68,0.06],[0.72,0.55,0.035]];
  craterSpots.forEach(([fx, fy, fr]) => {
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#7fa3d4';
    ctx.beginPath();
    ctx.arc(size * fx, size * fy, size * fr, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(size * fx - size * fr * 0.25, size * fy - size * fr * 0.25, size * fr * 0.35, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  return new THREE.CanvasTexture(canvas);
}

function createGlowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(200,225,255,0.8)');
  gradient.addColorStop(0.55, 'rgba(200,225,255,0.25)');
  gradient.addColorStop(0.8, 'rgba(200,225,255,0)'); // fully transparent well before the canvas edge, so no square boundary is ever visible
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function buildPanda(opts = {}) {
  const panda = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const black = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 20), white);
  panda.add(head);

  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), black);
    ear.position.set(side * 0.18, 0.19, 0);
    panda.add(ear);

    const eyePatch = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), black);
    eyePatch.position.set(side * 0.1, 0.02, 0.16);
    eyePatch.scale.set(0.8, 1.1, 0.5);
    panda.add(eyePatch);
  });

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), black);
  nose.position.set(0, -0.05, 0.21);
  panda.add(nose);

  // Chubby pink cheeks — for the "cute funny panda" variants
  if (opts.cheeks) {
    const cheekMat = new THREE.MeshStandardMaterial({ color: 0xffb3c6, roughness: 0.6 });
    [-1, 1].forEach((side) => {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), cheekMat);
      cheek.position.set(side * 0.15, -0.03, 0.18);
      panda.add(cheek);
    });
  }

  // A little bow on top — for a girlier/funnier variant
  if (opts.bow) {
    const bowMat = new THREE.MeshStandardMaterial({ color: opts.bowColor || 0xff5d8f, roughness: 0.4 });
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), bowMat);
    knot.position.set(0.1, 0.24, 0.06);
    panda.add(knot);
    [-1, 1].forEach((side) => {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.016, 8, 16), bowMat);
      loop.position.set(0.1 + side * 0.05, 0.24, 0.06);
      loop.rotation.z = side * 0.6;
      panda.add(loop);
    });
  }

  return panda;
}

export function initAbout({ scene, camera, registerUpdate }) {

  const aboutGroup = new THREE.Group();
  aboutGroup.visible = false;
  scene.add(aboutGroup);

  // ---------- FLOATING PANDAS (3 cute variants, not just one) ----------
  const pandaConfigs = [
    { opts: {}, position: [-1.4, -0.6, -1.5], scale: 0.9 },
    { opts: { cheeks: true }, position: [1.7, 1.2, -2], scale: 0.55 },
    { opts: { bow: true, bowColor: 0xffe066 }, position: [1.3, -1.4, -1], scale: 0.65 }
  ];
  const pandas = pandaConfigs.map((cfg, i) => {
    const p = buildPanda(cfg.opts);
    p.position.set(...cfg.position);
    p.scale.setScalar(cfg.scale);
    p.userData.phase = i * 1.7;
    aboutGroup.add(p);
    return p;
  });
  const panda = pandas[0]; // kept for compatibility with the existing swing/bob logic below

  // ---------- DRAWING & INTERIOR-DESIGN THEMED STICKERS ----------
  // A little nod to her — she loves drawing and dreams of becoming an
  // interior designer — floating softly like the hearts do.
  function createEmojiTexture(emoji) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.font = '76px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2 + 6);
    return new THREE.CanvasTexture(canvas);
  }
  const designEmojis = ['🎨', '✏️', '📐', '🖌️'];
  const designSprites = designEmojis.map((emoji, i) => {
    const mat = new THREE.SpriteMaterial({ map: createEmojiTexture(emoji), transparent: true, opacity: 0.4, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    const scale = 0.22 + Math.random() * 0.1;
    sprite.scale.set(scale, scale, 1);
    sprite.position.set((Math.random() - 0.5) * 6.5, (Math.random() - 0.5) * 5 - 1, (Math.random() - 0.5) * 4 - 1.5);
    sprite.userData.speed = 0.04 + Math.random() * 0.05;
    sprite.userData.phase = i * 1.3;
    sprite.userData.baseX = sprite.position.x;
    aboutGroup.add(sprite);
    return sprite;
  });

  // ---------- DRIFTING PARTICLES ----------
  const particleCount = 120;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: 0xcfe3ff,
    size: 0.045,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const particles = new THREE.Points(geometry, particleMaterial);
  aboutGroup.add(particles);

  // ---------- SUBTLE FLOATING HEARTS ----------
  // Small heart-shaped sprites (always face the camera automatically,
  // since Sprites are billboards) drifting slowly upward — kept dim
  // and small so they read as ambient atmosphere, not a focal point.
  function createHeartTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff8fb0';
    ctx.beginPath();
    const topY = size * 0.32;
    ctx.moveTo(size / 2, topY + size * 0.12);
    ctx.bezierCurveTo(size * 0.1, topY - size * 0.25, size * -0.05, topY + size * 0.28, size / 2, size * 0.86);
    ctx.bezierCurveTo(size * 1.05, topY + size * 0.28, size * 0.9, topY - size * 0.25, size / 2, topY + size * 0.12);
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
  }
  const heartTexture = createHeartTexture();
  const heartCount = 10;
  const hearts = [];
  for (let i = 0; i < heartCount; i++) {
    const mat = new THREE.SpriteMaterial({
      map: heartTexture,
      transparent: true,
      opacity: 0.16 + Math.random() * 0.14,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(mat);
    const scale = 0.12 + Math.random() * 0.14;
    sprite.scale.set(scale, scale, 1);
    sprite.position.set((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 6 - 1, (Math.random() - 0.5) * 5 - 1);
    sprite.userData.speed = 0.05 + Math.random() * 0.06;
    sprite.userData.driftPhase = Math.random() * Math.PI * 2;
    sprite.userData.baseX = sprite.position.x;
    aboutGroup.add(sprite);
    hearts.push(sprite);
  }

  // ---------- TINY GLOWING DUST ----------
  // A second, denser particle layer of much smaller, twinkling points —
  // distinct from the larger slow-drifting particles above.
  const dustCount = 160;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3 + 0] = (Math.random() - 0.5) * 9;
    dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 7;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMaterial = new THREE.PointsMaterial({
    color: 0xffe6b3,
    size: 0.018,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  aboutGroup.add(dust);

  registerUpdate((delta, elapsed) => {
    if (!aboutGroup.visible) return;
    particles.rotation.y = elapsed * 0.015;
    //glowPlane.scale.setScalar(1 + Math.sin(elapsed * 0.6) * 0.06); // gentle "breathing" glow
    // The panda gently swings side to side, like floating in zero gravity
    pandas.forEach((p, i) => {
      p.rotation.z = Math.sin(elapsed * 0.7 + i) * 0.15;
      p.position.y = p.userData.baseY ?? (p.position.y);
      p.userData.baseY = p.userData.baseY ?? p.position.y;
      p.position.y = p.userData.baseY + Math.sin(elapsed * 0.5 + i * 1.3) * 0.15;
    });
    designSprites.forEach((s) => {
      s.position.y += s.userData.speed * delta;
      s.position.x = s.userData.baseX + Math.sin(elapsed * 0.35 + s.userData.phase) * 0.3;
      s.rotation.z = Math.sin(elapsed * 0.3 + s.userData.phase) * 0.2;
      if (s.position.y > 3.5) s.position.y = -3.5;
    });

    // Hearts drift upward and gently sway, looping back to the bottom
    hearts.forEach((h) => {
      h.position.y += h.userData.speed * delta;
      h.position.x = h.userData.baseX + Math.sin(elapsed * 0.4 + h.userData.driftPhase) * 0.25;
      if (h.position.y > 4) h.position.y = -4;
    });

    // Dust twinkles gently via a shared pulsing opacity
    dustMaterial.opacity = 0.4 + Math.sin(elapsed * 1.6) * 0.2;
    dust.rotation.y = elapsed * 0.02;
  });

  // ---------- SCROLL-DRIVEN 3D TEXT REVEAL ----------
  const stageEl = document.getElementById('stage-about');
  const lines = Array.from(document.querySelectorAll('#stage-about .about-line'));

  // Give each paragraph its own pastel color instead of everything being
  // the same near-white — cycles through a soft candy palette
  const pastelPalette = ['#ff8fc4', '#6ec6ff', '#b98cff', '#ffb454', '#5be8a8', '#ff6f91'];
  lines.forEach((line, i) => {
    line.style.color = pastelPalette[i % pastelPalette.length];
  });

  // The "Happy 21st Birthday" line gets its own bigger, extra-special
  // candy treatment, and is also what triggers the poppers below
  const birthdayLineIndex = lines.findIndex((l) => l.textContent.includes('Happy 21st Birthday'));
  if (birthdayLineIndex !== -1) {
    lines[birthdayLineIndex].classList.add('about-highlight');
    lines[birthdayLineIndex].style.color = '#ffe9a8';
  }
  let progress = 0;              // 0 = start of section, 1 = fully scrolled through
  let advancing = false;
  let poppersLaunched = false;

  function renderProgress() {
    const totalSteps = lines.length;
    const linePos = progress * totalSteps;

    // Fire the poppers the moment she scrolls the "Happy 21st Birthday"
    // line into center focus — not at the very end of the section
    if (!poppersLaunched && birthdayLineIndex !== -1) {
      const birthdayDist = linePos - (birthdayLineIndex + 0.5);
      if (birthdayDist >= -0.05) {
        poppersLaunched = true;
        launchPoppers();
      }
    }

    lines.forEach((line, i) => {
      // dist: negative = still approaching (below center), 0 = centered,
      // positive = already passed (drifting up and away)
      const dist = linePos - (i + 0.5);

      let eased;      // opacity, 0..1 — NEVER forced back to 0 once a line has been read
      let scale;      // visual size — biggest right at the center — this alone
                       // gives the "moves closer" feeling, without needing a
                       // real translateZ/perspective (which was clipping text
                       // against the container's overflow:hidden edges)

      if (dist <= 0) {
        // Approaching from below: fades and grows in smoothly, reaching
        // full focus exactly at center. Slows down right at the end
        // (ease-out) for that "settling into place" feeling.
        const t = Math.min(1, -dist / 0.62);
        const smooth = t * t * (3 - 2 * t);
        eased = 1 - smooth;
        scale = 1.15 - smooth * 0.2;   // 1.15x at dead-center
      } else {
        // Already passed center: keeps drifting upward and shrinking, but
        // settles at a soft, dim "remembered" floor instead of vanishing —
        // she can always scroll back down to bring it into full focus again.
        const FLOOR = 0.24;
        const t = Math.min(1, dist / 0.95);
        const smooth = t * t * (3 - 2 * t);
        eased = 1 - smooth * (1 - FLOOR);
        scale = 1.15 - smooth * 0.32;
      }

      // Each paragraph needs its own generous vertical band (a wrapped
      // 2-4 line paragraph can easily be 150-250px tall)
      const offset = -dist * 320;
      line.style.opacity = eased;
      line.style.transform = `translate(-50%, -50%) translateY(${offset}px) scale(${scale})`;
      line.style.pointerEvents = eased > 0.5 ? 'auto' : 'none';
      line.style.zIndex = Math.round((1 - Math.abs(dist)) * 100); // focused line always paints on top

      // Glow intensifies the closer a line is to dead-center focus —
      // matches the candy palette in style.css (pink/lavender/blue/gold)
      const focus = Math.max(0, 1 - Math.abs(dist) / 0.5);
      const pinkAlpha = 0.35 + focus * 0.4;
      const lavenderAlpha = 0.2 + focus * 0.35;
      const blueAlpha = 0.15 + focus * 0.3;
      const goldAlpha = 0.2 + focus * 0.35;
      line.style.textShadow =
        `0 0 ${6 + focus * 6}px rgba(255,255,255,${0.4 + focus * 0.3}), ` +
        `0 0 ${8 + focus * 10}px rgba(255,182,217,${pinkAlpha}), ` +
        `0 0 ${14 + focus * 14}px rgba(185,140,255,${lavenderAlpha}), ` +
        `0 0 ${18 + focus * 16}px rgba(110,198,255,${blueAlpha}), ` +
        `0 0 ${22 + focus * 20}px rgba(245,185,66,${goldAlpha}), ` +
        `0 2px 6px rgba(0,0,0,0.45)`;
    });

    // Camera drifts slowly forward as she scrolls through the whole section —
    // this is what gives it a real 3D "moving through space" feeling
    camera.position.z = 6 - progress * 2.6;
  }

  // ---------- END-OF-LETTER POPPERS ----------
  // A little celebratory confetti burst from both sides once she's
  // read all the way to the end, before moving on to the gift.
  const POPPER_COUNT = 90;
  const popperGeo = new THREE.BoxGeometry(0.08, 0.08, 0.015);
  const popperMat = new THREE.MeshStandardMaterial({ roughness: 0.5 });
  const popperMesh = new THREE.InstancedMesh(popperGeo, popperMat, POPPER_COUNT);
  popperMesh.visible = false;
  aboutGroup.add(popperMesh);
  const popperColors = [0xff5d8f, 0xf5b942, 0xffe066, 0x9fd8ff, 0xffffff];
  const popperData = [];
  const popperDummy = new THREE.Object3D();
  for (let i = 0; i < POPPER_COUNT; i++) {
    popperData.push({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), active: false });
    popperMesh.setColorAt(i, new THREE.Color(popperColors[i % popperColors.length]));
  }
  popperMesh.instanceColor.needsUpdate = true;

  function launchPoppers() {
    popperMesh.visible = true;
    for (let i = 0; i < POPPER_COUNT; i++) {
      const d = popperData[i];
      const fromLeft = i % 2 === 0;
      d.pos.set(fromLeft ? -3.2 : 3.2, -0.5 + Math.random() * 0.6, -1);
      const speed = 2 + Math.random() * 2;
      d.vel.set((fromLeft ? 1 : -1) * speed, 2 + Math.random() * 2.5, (Math.random() - 0.5) * 2);
      d.active = true;
    }
  }
  registerUpdate((delta) => {
    if (!popperMesh.visible) return;
    let any = false;
    for (let i = 0; i < POPPER_COUNT; i++) {
      const d = popperData[i];
      if (!d.active) {
        popperDummy.position.set(0, -50, 0);
        popperDummy.scale.setScalar(0);
      } else {
        any = true;
        d.vel.y -= 3.5 * delta;
        d.pos.addScaledVector(d.vel, delta);
        popperDummy.position.copy(d.pos);
        popperDummy.rotation.set(d.pos.x, d.pos.y, d.pos.z);
        popperDummy.scale.setScalar(1);
        if (d.pos.y < -3.5) d.active = false;
      }
      popperDummy.updateMatrix();
      popperMesh.setMatrixAt(i, popperDummy.matrix);
    }
    popperMesh.instanceMatrix.needsUpdate = true;
    if (!any) popperMesh.visible = false;
  });

  function advanceToGift() {
    if (advancing) return;
    advancing = true;
    window.goToStage('stage-photobooth');
  }

  function addProgress(delta) {
    if (!stageEl.classList.contains('active')) return;
    progress = THREE.MathUtils.clamp(progress + delta, 0, 1.08);
    renderProgress();
    if (progress >= 1.08) advanceToGift();
  }

  window.addEventListener('wheel', (e) => {
    addProgress(e.deltaY * 0.0006);
  });

  let touchStartY = null;
  window.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; });
  window.addEventListener('touchmove', (e) => {
    if (touchStartY === null || !stageEl.classList.contains('active')) return;
    const currentY = e.touches[0].clientY;
    const diff = touchStartY - currentY;
    addProgress(diff * 0.0022);
    touchStartY = currentY;
  });
  window.addEventListener('touchend', () => { touchStartY = null; });

  document.getElementById('about-hint').addEventListener('click', () => addProgress(0.18));

  // ---------- SHOW WHEN ACTIVE ----------
  const observer = new MutationObserver(() => {
    if (stageEl.classList.contains('active')) {
      aboutGroup.visible = true;
      progress = 0;
      advancing = false;
      camera.position.set(0, 0.2, 6);
      renderProgress();
    } else {
      aboutGroup.visible = false;
    }
  });
  observer.observe(stageEl, { attributes: true, attributeFilter: ['class'] });
}
