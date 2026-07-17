// ============================================================
// giftbox.js — Stage 4.6, completely rebuilt as a LUXURY JEWELRY
// BOUTIQUE finale (Tiffany/Cartier/VCA showroom vibe) instead of
// a cartoon gift box or mini-game. No "game" mechanic at all —
// she just watches the piece materialize, can hover/click it,
// then the closing message fades in. Same architecture as every
// other stage: one shared Three.js scene, registerUpdate() for
// the render loop, MutationObserver + 'stage-leaving' for
// show/hide, GSAP for every animation.
// ============================================================

import * as THREE from 'three';

function createGlowTexture(colorInner, colorOuter) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, colorInner);
  gradient.addColorStop(1, colorOuter);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function createSparkleTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,240,210,0.6)');
  grad.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(c, 2); ctx.lineTo(c + 6, c - 6); ctx.lineTo(size - 2, c);
  ctx.lineTo(c + 6, c + 6); ctx.lineTo(c, size - 2); ctx.lineTo(c - 6, c + 6);
  ctx.lineTo(2, c); ctx.lineTo(c - 6, c - 6); ctx.closePath();
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

function createPetalTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffd9ea';
  ctx.beginPath();
  ctx.ellipse(size / 2, size / 2, size * 0.2, size * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

export function initGift({ scene, camera, registerUpdate }) {

  const giftGroup = new THREE.Group();
  giftGroup.visible = false;
  scene.add(giftGroup);

  // ============================================================
  // SHOWROOM — marble pedestal + glass display stand
  // ============================================================
  const pedestalGroup = new THREE.Group();
  giftGroup.add(pedestalGroup);

  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xece3d6, roughness: 0.35, metalness: 0.15, emissive: 0x2a2015, emissiveIntensity: 0.15 });
  const pedestalBase = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 0.35, 48), marbleMat);
  pedestalBase.position.y = -1.85;
  pedestalGroup.add(pedestalBase);

  const pedestalColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 1.1, 32), marbleMat);
  pedestalColumn.position.y = -1.35;
  pedestalGroup.add(pedestalColumn);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xfff8ec, transparent: true, opacity: 0.18, roughness: 0.05,
    metalness: 0, transmission: 0.7, thickness: 0.2
  });
  const glassTop = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 48), glassMat);
  glassTop.position.y = -0.76;
  pedestalGroup.add(glassTop);

  // soft gold rim light around the glass edge
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xf5d485, emissive: 0xf5d485, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.8 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.012, 12, 48), rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.73;
  pedestalGroup.add(rim);

  // ---------- SPOTLIGHT FROM ABOVE ----------
  const spotlight = new THREE.SpotLight(0xfff0d0, 1.1, 8, Math.PI / 7, 0.5, 1.2);
  spotlight.position.set(0, 3.2, 0.6);
  spotlight.target.position.set(0, -0.7, 0);
  giftGroup.add(spotlight, spotlight.target);

  const spotGlowMat = new THREE.MeshBasicMaterial({
    map: createGlowTexture('rgba(255,240,210,0.9)', 'rgba(255,240,210,0)'),
    transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const spotGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), spotGlowMat);
  spotGlow.position.set(0, -0.4, -0.1);
  giftGroup.add(spotGlow);

  // ============================================================
  // BACKGROUND AMBIENCE — gold dust, sparkles, bokeh, light rays,
  // petals, butterflies, ribbon light trails
  // ============================================================
  const dustCount = 160;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3 + 0] = (Math.random() - 0.5) * 10;
    dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 7;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0xf5d485, size: 0.03, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const dust = new THREE.Points(dustGeo, dustMat);
  giftGroup.add(dust);

  const sparkleTexture = createSparkleTexture();
  const bgSparkles = [];
  for (let i = 0; i < 18; i++) {
    const mat = new THREE.SpriteMaterial({ map: sparkleTexture, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    const s = new THREE.Sprite(mat);
    const sc = 0.06 + Math.random() * 0.08;
    s.scale.set(sc, sc, 1);
    s.position.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 3 - 1);
    s.userData.phase = Math.random() * Math.PI * 2;
    giftGroup.add(s);
    bgSparkles.push(s);
  }

  const bokehTexture = createGlowTexture('rgba(230,200,255,0.7)', 'rgba(230,200,255,0)');
  const bokeh = [];
  for (let i = 0; i < 8; i++) {
    const mat = new THREE.SpriteMaterial({ map: bokehTexture, transparent: true, opacity: 0.18, depthWrite: false });
    const s = new THREE.Sprite(mat);
    const sc = 0.8 + Math.random() * 1.2;
    s.scale.set(sc, sc, 1);
    s.position.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 6, -3 - Math.random() * 2);
    s.userData.speed = 0.02 + Math.random() * 0.02;
    s.userData.baseX = s.position.x;
    giftGroup.add(s);
    bokeh.push(s);
  }

  // light rays — thin tall gradient planes fanning from above the pedestal
  const rayTexture = createGlowTexture('rgba(255,245,220,0.5)', 'rgba(255,245,220,0)');
  const rays = [];
  for (let i = 0; i < 5; i++) {
    const mat = new THREE.SpriteMaterial({ map: rayTexture, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false });
    const s = new THREE.Sprite(mat);
    s.scale.set(0.5, 3.4, 1);
    s.position.set((i - 2) * 0.35, 1.2, -0.5);
    s.rotation.z = 0;
    giftGroup.add(s);
    rays.push(s);
  }

  const petalTexture = createPetalTexture();
  const petals = [];
  for (let i = 0; i < 10; i++) {
    const mat = new THREE.SpriteMaterial({ map: petalTexture, transparent: true, opacity: 0.55, depthWrite: false });
    const p = new THREE.Sprite(mat);
    const sc = 0.1 + Math.random() * 0.08;
    p.scale.set(sc, sc, 1);
    p.position.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 3 - 0.5);
    p.userData.fall = 0.06 + Math.random() * 0.06;
    p.userData.sway = Math.random() * Math.PI * 2;
    p.userData.baseX = p.position.x;
    giftGroup.add(p);
    petals.push(p);
  }

  function buildButterfly(color) {
    const group = new THREE.Group();
    const wingMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    const wingShape = new THREE.SphereGeometry(0.1, 8, 8, 0, Math.PI);
    const left = new THREE.Mesh(wingShape, wingMat); left.rotation.y = Math.PI / 2; left.position.x = -0.02;
    const right = new THREE.Mesh(wingShape, wingMat); right.rotation.y = -Math.PI / 2; right.position.x = 0.02;
    group.add(left, right);
    group.userData.leftWing = left;
    group.userData.rightWing = right;
    return group;
  }
  const butterflies = [0xf5d485, 0xd8b6ff].map((color, i) => {
    const b = buildButterfly(color);
    b.userData.phase = Math.random() * Math.PI * 2 + i * 2;
    b.userData.yBase = 1 + i * 1.2;
    giftGroup.add(b);
    return b;
  });

  // ribbon-like soft light trails
  function createRibbonTexture(color) {
    const w = 256, h = 24;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    return new THREE.CanvasTexture(canvas);
  }
  const ribbons = [
    { color: 'rgba(245,212,133,0.5)', x: -2.8, y: 1.4 },
    { color: 'rgba(216,182,255,0.4)', x: 2.8, y: -1.2 }
  ].map((cfg) => {
    const mat = new THREE.SpriteMaterial({ map: createRibbonTexture(cfg.color), transparent: true, opacity: 0.6, depthWrite: false });
    const s = new THREE.Sprite(mat);
    s.scale.set(3, 0.3, 1);
    s.position.set(cfg.x, cfg.y, -2);
    s.userData.baseX = cfg.x;
    giftGroup.add(s);
    return s;
  });

  // ============================================================
  // THE JEWELRY — one elegant pendant necklace, materializing
  // gold outline → solid metal → gems → final sparkle
  // ============================================================
  const jewelryGroup = new THREE.Group();
  jewelryGroup.position.set(0, -0.55, 0);
  giftGroup.add(jewelryGroup);

  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf5d485, roughness: 0.2, metalness: 0.7, emissive: 0xb8860b, emissiveIntensity: 0.3 });
  const wireMat = new THREE.MeshBasicMaterial({ color: 0xf5d485, wireframe: true, transparent: true, opacity: 0.8 });
  const diamondMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.02, metalness: 0.1,
    transmission: 0.7, thickness: 0.3, emissive: 0xbfe6ff, emissiveIntensity: 0, transparent: true, opacity: 0
  });

  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.028, 12, 48), wireMat.clone());
  chain.rotation.x = Math.PI / 2;
  jewelryGroup.add(chain);

  // A small bail loop connects the chain to the pendant, like a real
  // necklace — without this the pendant just floats disconnected.
  const bail = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.012, 8, 20), wireMat.clone());
  bail.position.y = -0.345;
  jewelryGroup.add(bail);

  // ---------- HEART-SHAPED PENDANT (not another round gem) ----------
  function createHeartShape(size) {
    const s = new THREE.Shape();
    const x = 0, y = 0;
    s.moveTo(x, y + size * 0.35);
    s.bezierCurveTo(x, y + size * 0.35, x - size * 0.5, y - size * 0.1, x, y - size * 0.55);
    s.bezierCurveTo(x + size * 0.5, y - size * 0.1, x, y + size * 0.35, x, y + size * 0.35);
    return s;
  }

  // The gold locket body — a heart outline with a bit of depth/bevel
  // so it catches the light like real metalwork, not a flat sticker.
  const heartOutline = createHeartShape(0.16);
  const pendantSetting = new THREE.Mesh(
    new THREE.ExtrudeGeometry(heartOutline, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3 }),
    wireMat.clone()
  );
  pendantSetting.geometry.center();
  pendantSetting.position.y = -0.42;
  pendantSetting.rotation.x = Math.PI; // point of the heart faces down
  jewelryGroup.add(pendantSetting);

  // The gem: a smaller heart, inset just in front of the locket body,
  // like a bezel-set heart-cut stone.
  const gemHeartOutline = createHeartShape(0.1);
  const gem = new THREE.Mesh(
    new THREE.ExtrudeGeometry(gemHeartOutline, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 4 }),
    diamondMat
  );
  gem.geometry.center();
  gem.position.set(0, -0.42, 0.016);
  gem.rotation.x = Math.PI;
  jewelryGroup.add(gem);

  // 4 tiny prongs holding the gem in its setting — the small detail
  // that makes it read as "mounted jewelry" instead of a shape glued on.
  const prongMat = goldMat.clone();
  const prongs = [];
  const prongSpots = [[-0.055, -0.34], [0.055, -0.34], [-0.05, -0.48], [0.05, -0.48]];
  prongSpots.forEach(([px, py]) => {
    const prong = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), prongMat);
    prong.position.set(px, py, 0.02);
    prong.visible = false; // fades in with the rest of the metal, stage 2
    jewelryGroup.add(prong);
    prongs.push(prong);
  });

  // small accent gems along the chain
  const accentGems = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * 0.5 + (i - 1.5) * 0.35;
    const g = new THREE.Mesh(new THREE.IcosahedronGeometry(0.018, 0), diamondMat.clone());
    g.position.set(Math.cos(a) * 0.34, Math.sin(a) * 0.34, 0);
    jewelryGroup.add(g);
    accentGems.push(g);
  }

  jewelryGroup.scale.setScalar(1.6);

  // ---------- MATERIALIZATION SEQUENCE ----------
  let materialized = false;
  function materializeJewelry() {
    if (materialized) return;
    materialized = true;

    gsap.to(spotlight, { intensity: 2.2, duration: 2.2, ease: 'power2.out' });
    gsap.to(spotGlowMat, { opacity: 0.7, duration: 2.2, ease: 'power2.out' });

    // stage 1: gold wireframe outline fades in
    gsap.fromTo(chain.material, { opacity: 0 }, { opacity: 0.9, duration: 1, delay: 0.4 });
    gsap.fromTo(bail.material, { opacity: 0 }, { opacity: 0.9, duration: 1, delay: 0.5 });
    gsap.fromTo(pendantSetting.material, { opacity: 0 }, { opacity: 0.9, duration: 1, delay: 0.6 });

    // stage 2: metal solidifies (wireframe -> solid gold)
    gsap.delayedCall(1.6, () => {
      chain.material = goldMat.clone();
      bail.material = goldMat.clone();
      pendantSetting.material = goldMat.clone();
      prongs.forEach((p) => { p.visible = true; });
      gsap.fromTo(chain.scale, { x: 0.9, y: 0.9, z: 0.9 }, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(2)' });
    });

    // stage 3: diamonds appear
    gsap.delayedCall(2.3, () => {
      gsap.to(gem.material, { opacity: 1, emissiveIntensity: 0.7, duration: 0.7, ease: 'power2.out' });
      gsap.fromTo(gem.scale, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'back.out(3)' });
      accentGems.forEach((g, i) => {
        gsap.to(g.material, { opacity: 1, emissiveIntensity: 0.6, duration: 0.5, delay: i * 0.1 });
        gsap.fromTo(g.scale, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1, duration: 0.5, delay: i * 0.1, ease: 'back.out(3)' });
      });
    });

    // stage 4: final sparkle burst + settle into gentle idle float
    gsap.delayedCall(3.2, () => {
      launchSparkleBurst();
      showFinalMessage();
    });
  }

  // ---------- SPARKLE BURST (click / final reveal) ----------
  const BURST_COUNT = 30;
  const burstGeo = new THREE.SphereGeometry(0.02, 6, 6);
  const burstMat = new THREE.MeshBasicMaterial({ color: 0xfff2d0 });
  const burstMesh = new THREE.InstancedMesh(burstGeo, burstMat, BURST_COUNT);
  burstMesh.visible = false;
  giftGroup.add(burstMesh);
  const burstData = Array.from({ length: BURST_COUNT }, () => ({ position: new THREE.Vector3(), velocity: new THREE.Vector3(), active: false }));
  const dummy = new THREE.Object3D();
  function launchSparkleBurst() {
    burstMesh.visible = true;
    for (let i = 0; i < BURST_COUNT; i++) {
      const d = burstData[i];
      d.position.copy(jewelryGroup.position);
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 0.7;
      d.velocity.set(Math.cos(angle) * speed, 0.6 + Math.random() * 0.8, Math.sin(angle) * speed);
      d.active = true;
    }
  }
  registerUpdate((delta) => {
    if (!burstMesh.visible) return;
    let any = false;
    for (let i = 0; i < BURST_COUNT; i++) {
      const d = burstData[i];
      if (!d.active) { dummy.position.set(0, -50, 0); dummy.scale.setScalar(0); }
      else {
        any = true;
        d.velocity.y -= 0.9 * delta;
        d.position.addScaledVector(d.velocity, delta);
        if (d.position.y > jewelryGroup.position.y + 1.6) d.active = false;
        dummy.position.copy(d.position);
        dummy.scale.setScalar(1);
      }
      dummy.updateMatrix();
      burstMesh.setMatrixAt(i, dummy.matrix);
    }
    burstMesh.instanceMatrix.needsUpdate = true;
    if (!any) burstMesh.visible = false;
  });

  // ============================================================
  // INTERACTION — hover glow/rotate, click for full 360° spin + burst
  // ============================================================
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();
  let hovering = false;
  let spinning = false;

  function updatePointer(clientX, clientY) {
    pointerNDC.x = (clientX / window.innerWidth) * 2 - 1;
    pointerNDC.y = -(clientY / window.innerHeight) * 2 + 1;
  }

  window.addEventListener('mousemove', (e) => {
    if (!giftGroup.visible || !materialized) return;
    updatePointer(e.clientX, e.clientY);
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects([chain, bail, pendantSetting, gem], false);
    hovering = hits.length > 0;
    document.body.style.cursor = hovering ? 'pointer' : '';
  });

  window.addEventListener('click', (e) => {
    if (!giftGroup.visible || !materialized || spinning) return;
    updatePointer(e.clientX, e.clientY);
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects([chain, bail, pendantSetting, gem], false);
    if (hits.length === 0) return;
    spinning = true;
    launchSparkleBurst();
    gsap.to(jewelryGroup.rotation, {
      y: jewelryGroup.rotation.y + Math.PI * 2,
      duration: 1.8,
      ease: 'power2.inOut',
      onComplete: () => { spinning = false; }
    });
  });

  // ---------- SHOW/HIDE + CINEMATIC CAMERA ----------
  const stageEl = document.getElementById('stage-gift');
  const observer = new MutationObserver(() => {
    if (stageEl.classList.contains('active')) {
      giftGroup.visible = true;
      camera.rotation.set(-0.08, 0, 0); // gentler tilt — safely frames the WHOLE pedestal (base included), not just the top
      gsap.fromTo(camera.position, { y: 1.1, z: 6.2 }, { y: 0.15, z: 4.4, duration: 3, ease: 'power2.out' });
      if (!materialized) {
        document.getElementById('gift-hint').textContent = '✨';
        gsap.delayedCall(1, materializeJewelry);
        // Safety net: guarantees the reveal happens even if the GSAP
        // delayedCall above is ever skipped for any reason — plain
        // setTimeout doesn't depend on GSAP's own ticking at all.
        setTimeout(() => { if (!materialized) materializeJewelry(); }, 1500);
      }
    } else {
      giftGroup.visible = false;
    }
  });
  observer.observe(stageEl, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('stage-leaving', (e) => {
    if (e.detail.id === 'stage-gift') giftGroup.visible = false;
  });

  function showFinalMessage() {
    const hintEl = document.getElementById('gift-hint');
    hintEl.style.animation = 'none'; // stop the pulse keyframes from fighting the fade-out below
    hintEl.style.opacity = 0;
    const msg = document.getElementById('gift-final-message');
    gsap.to(msg, { opacity: 1, duration: 2.5, ease: 'power1.out', delay: 1.5 });
    gsap.delayedCall(4, () => {
      const btn = document.getElementById('btn-continue-gift');
      btn.style.pointerEvents = 'auto';
      gsap.to(btn, { opacity: 1, duration: 1 });
    });
  }

  // ---------- IDLE ANIMATION LOOP ----------
  registerUpdate((delta, elapsed) => {
    // tiny cinematic camera float, always on while visible
    if (giftGroup.visible) {
      camera.position.x = Math.sin(elapsed * 0.15) * 0.08;
    }

    if (materialized) {
      // gentle idle float + slow rotation, plus a slight hover boost
      const hoverBoost = hovering ? 1.6 : 1;
      jewelryGroup.position.y = -0.55 + Math.sin(elapsed * 0.8) * 0.03;
      if (!spinning) jewelryGroup.rotation.y += delta * 0.15 * hoverBoost;
      gem.material.emissiveIntensity = 0.6 + Math.sin(elapsed * 2.2) * 0.15 * hoverBoost;
    }

    dust.rotation.y = elapsed * 0.01;
    dustMat.opacity = 0.4 + Math.sin(elapsed * 1.2) * 0.15;

    bgSparkles.forEach((s) => {
      const t = elapsed * 1.4 + s.userData.phase;
      s.material.opacity = 0.25 + Math.max(0, Math.sin(t)) * 0.5;
    });

    bokeh.forEach((s) => { s.position.x = s.userData.baseX + Math.sin(elapsed * s.userData.speed) * 1.2; });

    rays.forEach((r, i) => { r.material.opacity = 0.08 + Math.sin(elapsed * 0.4 + i) * 0.05; });

    petals.forEach((p) => {
      p.position.y -= p.userData.fall * delta;
      p.position.x = p.userData.baseX + Math.sin(elapsed * 0.4 + p.userData.sway) * 0.4;
      p.rotation.z = Math.sin(elapsed * 0.5 + p.userData.sway) * 0.6;
      if (p.position.y < -3.5) p.position.y = 3.5;
    });

    butterflies.forEach((b) => {
      const t = elapsed * 0.1 + b.userData.phase;
      b.position.x = Math.sin(t) * 3.2;
      b.position.y = b.userData.yBase + Math.sin(t * 2) * 0.3;
      b.position.z = -0.8 + Math.cos(t * 0.5) * 0.4;
      b.rotation.y = Math.cos(t) >= 0 ? 0 : Math.PI;
      const flap = Math.sin(elapsed * 12 + b.userData.phase) * 0.8;
      b.userData.leftWing.rotation.y = Math.PI / 2 - flap;
      b.userData.rightWing.rotation.y = -Math.PI / 2 + flap;
    });

    ribbons.forEach((r, i) => { r.position.x = r.userData.baseX + Math.sin(elapsed * 0.12 + i) * 0.6; });
  });

  document.getElementById('btn-continue-gift').addEventListener('click', () => {
    window.goToStage('stage-favorites');
  });
}
