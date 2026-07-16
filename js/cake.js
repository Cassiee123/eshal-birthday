// ============================================================
// cake.js — Stage 3.
// Builds a 3-tier 3D cake with a flickering candle. Clicking
// blows it out, which triggers a burst of physics-based
// confetti (the "poppers"), then reveals a Continue button.
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
  grad.addColorStop(0.25, 'rgba(255,225,170,0.65)');
  grad.addColorStop(1, 'rgba(255,225,170,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(c, 2); ctx.lineTo(c + 6, c - 6); ctx.lineTo(size - 2, c);
  ctx.lineTo(c + 6, c + 6); ctx.lineTo(c, size - 2); ctx.lineTo(c - 6, c + 6);
  ctx.lineTo(2, c); ctx.lineTo(c - 6, c - 6); ctx.closePath();
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

export function initCake({ scene, camera, registerUpdate }) {

  const cakeGroup = new THREE.Group();
  cakeGroup.visible = false;
  scene.add(cakeGroup);

  // ============================================================
  // PARTY AMBIENCE — the cake used to sit alone in an empty void.
  // This adds a whole festive backdrop around it: gold dust,
  // sparkles, warm bokeh lights, drifting balloons, and soft glow
  // rings — all slow, layered, never distracting from the cake.
  // ============================================================
  const dustCount = 150;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3 + 0] = (Math.random() - 0.5) * 9;
    dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 6.5;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1.5;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0xf5d485, size: 0.028, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const dust = new THREE.Points(dustGeo, dustMat);
  cakeGroup.add(dust);

  const sparkleTexture = createSparkleTexture();
  const ambientSparkles = [];
  for (let i = 0; i < 16; i++) {
    const mat = new THREE.SpriteMaterial({ map: sparkleTexture, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    const s = new THREE.Sprite(mat);
    const sc = 0.07 + Math.random() * 0.09;
    s.scale.set(sc, sc, 1);
    s.position.set((Math.random() - 0.5) * 7.5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 3 - 1);
    s.userData.phase = Math.random() * Math.PI * 2;
    cakeGroup.add(s);
    ambientSparkles.push(s);
  }

  const bokehTexture = createGlowTexture('rgba(255,196,120,0.6)', 'rgba(255,196,120,0)');
  const bokehTexturePink = createGlowTexture('rgba(244,166,193,0.5)', 'rgba(244,166,193,0)');
  const bokeh = [];
  for (let i = 0; i < 9; i++) {
    const mat = new THREE.SpriteMaterial({ map: i % 2 === 0 ? bokehTexture : bokehTexturePink, transparent: true, opacity: 0.16, depthWrite: false });
    const s = new THREE.Sprite(mat);
    const sc = 0.7 + Math.random() * 1.1;
    s.scale.set(sc, sc, 1);
    s.position.set((Math.random() - 0.5) * 8.5, (Math.random() - 0.5) * 5.5, -2.5 - Math.random() * 2.5);
    s.userData.speed = 0.02 + Math.random() * 0.02;
    s.userData.baseX = s.position.x;
    cakeGroup.add(s);
    bokeh.push(s);
  }

  // soft glow rings drifting slowly, like out-of-focus fairy lights
  const ringTexture = createGlowTexture('rgba(255,235,190,0.9)', 'rgba(255,235,190,0)');
  const glowRings = [];
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.SpriteMaterial({ map: ringTexture, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
    const s = new THREE.Sprite(mat);
    const sc = 0.15 + Math.random() * 0.12;
    s.scale.set(sc, sc, 1);
    s.position.set((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 4.5, (Math.random() - 0.5) * 2 - 0.5);
    s.userData.phase = Math.random() * Math.PI * 2;
    s.userData.baseY = s.position.y;
    cakeGroup.add(s);
    glowRings.push(s);
  }

  // a few small drifting balloons, far enough back they never
  // compete with the cake itself
  function buildMiniBalloon(color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.05, emissive: color, emissiveIntensity: 0.12 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), mat);
    body.scale.set(1, 1.15, 1);
    group.add(body);
    const stringMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
    const stringGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -0.18, 0), new THREE.Vector3(0, -0.65, 0)
    ]);
    group.add(new THREE.Line(stringGeo, stringMat));
    return group;
  }
  const balloonColors = [0xf4a6c1, 0xe8b24d, 0x9fd8ff];
  const balloons = balloonColors.map((color, i) => {
    const b = buildMiniBalloon(color);
    b.position.set((i - 1) * 2.6, -3.5 - i * 0.6, -2.2 - i * 0.5);
    b.userData.speed = 0.12 + Math.random() * 0.08;
    b.userData.sway = Math.random() * Math.PI * 2;
    b.userData.baseX = b.position.x;
    cakeGroup.add(b);
    return b;
  });

  // ---------- THE 3 CAKE TIERS ----------
  // A "tier" is just a squat cylinder. Stacking 3 different sizes
  // is the fastest way to read as "cake" without needing a 3D
  // modeling program.

  const icingMaterial = new THREE.MeshStandardMaterial({
    color: 0xf7efe0,
    roughness: 0.55,
    metalness: 0.05
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0xf4a6c1,
    roughness: 0.5
  });

  const baseTier = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.1, 0.55, 32), icingMaterial);
  baseTier.position.y = -0.85;

  const baseTrim = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.045, 8, 32), accentMaterial);
  baseTrim.position.y = -1.1;
  baseTrim.rotation.x = Math.PI / 2;

  const midTier = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.85, 0.5, 32), icingMaterial);
  midTier.position.y = -0.32;

  const midTrim = new THREE.Mesh(new THREE.TorusGeometry(0.81, 0.04, 8, 32), accentMaterial);
  midTrim.position.y = -0.56;
  midTrim.rotation.x = Math.PI / 2;

  const topTier = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.45, 32), icingMaterial);
  topTier.position.y = 0.15;

  const topTrim = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.035, 8, 32), accentMaterial);
  topTrim.position.y = -0.06;
  topTrim.rotation.x = Math.PI / 2;

  cakeGroup.add(baseTier, baseTrim, midTier, midTrim, topTier, topTrim);

  // ---------- FLOWER DECORATIONS ----------
  // Builds one small flower: 6 flattened petal spheres arranged in
  // a ring around a center sphere. Reused all over the cake so it
  // doesn't look like a plain undecorated blob.
  function createFlower(petalColor, centerColor, scale = 1) {
    const flower = new THREE.Group();

    const petalMat = new THREE.MeshStandardMaterial({ color: petalColor, roughness: 0.5 });
    const petalGeo = new THREE.SphereGeometry(0.045 * scale, 10, 10);

    const petalCount = 6;
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(Math.cos(angle) * 0.06 * scale, 0, Math.sin(angle) * 0.06 * scale);
      petal.scale.set(1, 0.55, 1); // flatten it so it reads as a petal, not a ball
      flower.add(petal);
    }

    const centerMat = new THREE.MeshStandardMaterial({
      color: centerColor,
      emissive: centerColor,
      emissiveIntensity: 0.25,
      roughness: 0.4
    });
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.04 * scale, 10, 10), centerMat);
    flower.add(center);

    return flower;
  }

  // Ring of flowers sitting on top of the base tier, around the
  // bottom of the middle tier
  const baseTierTopY = -0.85 + 0.55 / 2;
  const flowerRingRadius1 = 0.9;
  const flowerColors = [0xf4a6c1, 0xe8b24d, 0xf7efe0];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const flower = createFlower(flowerColors[i % flowerColors.length], 0xe8b24d, 1.1);
    flower.position.set(
      Math.cos(angle) * flowerRingRadius1,
      baseTierTopY + 0.03,
      Math.sin(angle) * flowerRingRadius1
    );
    cakeGroup.add(flower);
  }

  // Smaller ring of flowers around the base of the top tier
  const midTierTopY = -0.32 + 0.5 / 2;
  const flowerRingRadius2 = 0.62;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + 0.3;
    const flower = createFlower(flowerColors[(i + 1) % flowerColors.length], 0xe8b24d, 0.9);
    flower.position.set(
      Math.cos(angle) * flowerRingRadius2,
      midTierTopY + 0.03,
      Math.sin(angle) * flowerRingRadius2
    );
    cakeGroup.add(flower);
  }

  // A small cluster crowning the very top, around the candle base
  const topTierTopY = 0.15 + 0.45 / 2;
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const flower = createFlower(flowerColors[i % flowerColors.length], 0xf4a6c1, 0.85);
    flower.position.set(
      Math.cos(angle) * 0.32,
      topTierTopY + 0.03,
      Math.sin(angle) * 0.32
    );
    cakeGroup.add(flower);
  }

  // ---------- ICING DRIP DETAIL ----------
  // Small overlapping spheres along the top edges of the base and
  // middle tiers, like ganache dripping down — a classic premium-cake look.
  function addDrips(tierTopY, radius, count, color) {
    const dripMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dripLength = 0.08 + Math.random() * 0.08;
      const drip = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, dripLength, 4, 8), dripMat);
      drip.position.set(Math.cos(angle) * radius, tierTopY - dripLength / 2, Math.sin(angle) * radius);
      cakeGroup.add(drip);
    }
  }
  addDrips(baseTierTopY, 1.09, 22, 0xf4a6c1);
  addDrips(midTierTopY, 0.84, 18, 0xe8b24d);

  // ---------- CUTE STICKERS ----------
  // NOTE: we can't reproduce copyrighted characters (Tom & Jerry,
  // SpongeBob, Cinderella), so these are original cute faces drawn
  // with canvas — panda, cat, bear, and a smiling star — same fun
  // "cake covered in cute stickers" idea, without using anyone's IP.
  function drawFace(ctx, size, type) {
    const c = size / 2;
    ctx.clearRect(0, 0, size, size);

    if (type === 'panda') {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(c, c, size * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2a2a';
      [[-1, -1], [1, -1]].forEach(([sx, sy]) => {
        ctx.beginPath(); ctx.arc(c + sx * size * 0.28, c + sy * size * 0.28, size * 0.12, 0, Math.PI * 2); ctx.fill();
      });
      ctx.save(); ctx.translate(c - size * 0.14, c - size * 0.02); ctx.scale(0.75, 1); ctx.beginPath(); ctx.arc(0, 0, size * 0.1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(c + size * 0.14, c - size * 0.02); ctx.scale(0.75, 1); ctx.beginPath(); ctx.arc(0, 0, size * 0.1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.arc(c, c + size * 0.12, size * 0.035, 0, Math.PI * 2); ctx.fill();
    } else if (type === 'cat') {
      ctx.fillStyle = '#f5c99b';
      ctx.beginPath(); ctx.arc(c, c, size * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(c - size * 0.32, c - size * 0.28); ctx.lineTo(c - size * 0.12, c - size * 0.1); ctx.lineTo(c - size * 0.36, c - size * 0.05); ctx.fill();
      ctx.beginPath(); ctx.moveTo(c + size * 0.32, c - size * 0.28); ctx.lineTo(c + size * 0.12, c - size * 0.1); ctx.lineTo(c + size * 0.36, c - size * 0.05); ctx.fill();
      ctx.fillStyle = '#2a2a2a';
      [-1, 1].forEach((s) => { ctx.beginPath(); ctx.arc(c + s * size * 0.13, c - size * 0.02, size * 0.045, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = '#e17ea0';
      ctx.beginPath(); ctx.moveTo(c, c + size * 0.06); ctx.lineTo(c - size * 0.04, c + size * 0.12); ctx.lineTo(c + size * 0.04, c + size * 0.12); ctx.fill();
    } else if (type === 'bear') {
      ctx.fillStyle = '#a9714a';
      ctx.beginPath(); ctx.arc(c, c, size * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(c - size * 0.28, c - size * 0.28, size * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(c + size * 0.28, c - size * 0.28, size * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2a2a';
      [-1, 1].forEach((s) => { ctx.beginPath(); ctx.arc(c + s * size * 0.13, c - size * 0.02, size * 0.04, 0, Math.PI * 2); ctx.fill(); });
      ctx.beginPath(); ctx.arc(c, c + size * 0.1, size * 0.035, 0, Math.PI * 2); ctx.fill();
    } else if (type === 'star') {
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const innerAngle = angle + Math.PI / 5;
        ctx.lineTo(c + Math.cos(angle) * size * 0.42, c + Math.sin(angle) * size * 0.42);
        ctx.lineTo(c + Math.cos(innerAngle) * size * 0.18, c + Math.sin(innerAngle) * size * 0.18);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2a2a2a';
      [-1, 1].forEach((s) => { ctx.beginPath(); ctx.arc(c + s * size * 0.08, c - size * 0.02, size * 0.03, 0, Math.PI * 2); ctx.fill(); });
    }
  }

  function createSticker(type) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    // A colored rim ring first, so the sticker reads clearly against
    // the pale cake instead of blending into it
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(size / 2, size / 2, size * 0.48, 0, Math.PI * 2); ctx.fill();
    const rimColors = { panda: '#ffb3c6', cat: '#f5b942', bear: '#e0a5c4', star: '#ffe066' };
    ctx.strokeStyle = rimColors[type] || '#ffb3c6';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2); ctx.stroke();
    drawFace(ctx, size, type);
    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    return new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), mat);
  }

  const stickerTypes = ['panda', 'cat', 'panda', 'bear', 'panda', 'star'];
  const stickerRadius = 1.13; // pushed further out from the tier surface so it's never occluded/z-fighting
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + 0.4;
    const sticker = createSticker(stickerTypes[i % stickerTypes.length]);
    sticker.position.set(Math.cos(angle) * stickerRadius, baseTierTopY - 0.2, Math.sin(angle) * stickerRadius);
    sticker.lookAt(0, sticker.position.y, 0); // -Z faces the cake's center, so the sticker's front (+Z) faces outward
    cakeGroup.add(sticker);
  }


  // ---------- CANDLE ----------
  const candleMaterial = new THREE.MeshStandardMaterial({ color: 0xf7efe0, roughness: 0.4 });
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 12), candleMaterial);
  candle.position.y = 0.15 + 0.225 + 0.21; // sits on top of the top tier
  cakeGroup.add(candle);

  // ---------- FLAME ----------
  // A cone shape reads as a flame naturally (pointed top, wide base).
  // We use emissive so it looks like it's producing its own light,
  // not just reflecting the scene lights.
  const flameMaterial = new THREE.MeshStandardMaterial({
    color: 0xffaa55,
    emissive: 0xff8c3d,
    emissiveIntensity: 1.4,
    roughness: 0.3
  });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.15, 10), flameMaterial);
  flame.position.y = candle.position.y + 0.21 + 0.06;
  cakeGroup.add(flame);

  // A real point light AT the flame position sells the "glowing candle
  // lighting up the room" effect far better than the mesh alone.
  const flameLight = new THREE.PointLight(0xffaa55, 1.8, 4, 2);
  flameLight.position.copy(flame.position);
  cakeGroup.add(flameLight);

  // ---------- CONFETTI (the "poppers") ----------
  // InstancedMesh lets us draw hundreds of little rectangles in
  // ONE draw call instead of hundreds of separate objects — this
  // is the difference between smooth and laggy on her phone.

  const CONFETTI_COUNT = 160;
  const confettiGeo = new THREE.BoxGeometry(0.09, 0.09, 0.015);
  const confettiMat = new THREE.MeshStandardMaterial({ roughness: 0.6 });
  const confettiMesh = new THREE.InstancedMesh(confettiGeo, confettiMat, CONFETTI_COUNT);
  confettiMesh.visible = false;
  cakeGroup.add(confettiMesh);

  const paletteColors = [0xe8b24d, 0xf4a6c1, 0xf7efe0]; // gold + blush + cream, matches your theme
  const dummy = new THREE.Object3D();

  // We keep our own plain-JS array of physics data per confetti
  // piece, separate from the mesh itself, and use it to update
  // the mesh's matrices every frame.
  const confettiData = [];
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    confettiData.push({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      rotationSpeed: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      active: false
    });
    confettiMesh.setColorAt(i, new THREE.Color(paletteColors[i % paletteColors.length]));
  }
  confettiMesh.instanceColor.needsUpdate = true;

  function launchConfetti() {
    confettiMesh.visible = true;
    const origin = flame.position;

    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const d = confettiData[i];
      d.position.copy(origin);

      // Random outward + upward burst direction (like a real popper)
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.6 + Math.random() * 2.2;
      d.velocity.set(
        Math.cos(angle) * speed * 0.6,
        2.2 + Math.random() * 2.2,
        Math.sin(angle) * speed * 0.6
      );

      d.rotationSpeed.set(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );
      d.rotation.set(0, 0, 0);
      d.active = true;
    }
  }

  const GRAVITY = 4.2;

  registerUpdate((delta) => {
    if (!confettiMesh.visible) return;

    let anyActive = false;
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const d = confettiData[i];
      if (!d.active) {
        dummy.position.set(0, -100, 0); // parked off-screen
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        confettiMesh.setMatrixAt(i, dummy.matrix);
        continue;
      }
      anyActive = true;

      d.velocity.y -= GRAVITY * delta;
      d.position.addScaledVector(d.velocity, delta);
      d.rotation.x += d.rotationSpeed.x * delta;
      d.rotation.y += d.rotationSpeed.y * delta;
      d.rotation.z += d.rotationSpeed.z * delta;

      if (d.position.y < -2.2) {
        d.active = false; // it's fallen out of view, retire it
      }

      dummy.position.copy(d.position);
      dummy.rotation.copy(d.rotation);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      confettiMesh.setMatrixAt(i, dummy.matrix);
    }
    confettiMesh.instanceMatrix.needsUpdate = true;

    if (!anyActive) confettiMesh.visible = false; // nothing left to draw, save performance
  });

  // ---------- CANDLE FLICKER ----------
  let lit = true;
  registerUpdate((delta, elapsed) => {
    if (!lit) return;
    const flicker = 0.85 + Math.sin(elapsed * 18) * 0.08 + (Math.random() - 0.5) * 0.1;
    flame.scale.set(flicker, 1 + (Math.random() - 0.5) * 0.15, flicker);
    flameLight.intensity = 1.6 + Math.random() * 0.4;
  });

  // ---------- GENTLE IDLE ROTATION ----------
  registerUpdate((delta, elapsed) => {
    cakeGroup.rotation.y = Math.sin(elapsed * 0.25) * 0.15;
  });

  // ---------- PARTY AMBIENCE ANIMATION ----------
  registerUpdate((delta, elapsed) => {
    dust.rotation.y = elapsed * 0.012;
    dustMat.opacity = 0.35 + Math.sin(elapsed * 1.1) * 0.15;

    ambientSparkles.forEach((s) => {
      const t = elapsed * 1.5 + s.userData.phase;
      s.material.opacity = 0.25 + Math.max(0, Math.sin(t)) * 0.55;
    });

    bokeh.forEach((s) => { s.position.x = s.userData.baseX + Math.sin(elapsed * s.userData.speed) * 1.3; });

    glowRings.forEach((s) => {
      const t = elapsed * 0.6 + s.userData.phase;
      s.material.opacity = 0.2 + Math.sin(t) * 0.2;
      s.position.y = s.userData.baseY + Math.sin(t * 0.6) * 0.15;
    });

    balloons.forEach((b) => {
      b.position.y += b.userData.speed * delta;
      b.position.x = b.userData.baseX + Math.sin(elapsed * 0.3 + b.userData.sway) * 0.25;
      if (b.position.y > 3.5) b.position.y = -3.8;
    });
  });

  // ---------- SHOW CAKE WHEN ITS STAGE BECOMES ACTIVE ----------
  const cakeStageEl = document.getElementById('stage-cake');
  const observer = new MutationObserver(() => {
    if (cakeStageEl.classList.contains('active')) {
      cakeGroup.visible = true;
      gsap.fromTo(camera.position, { y: 1.4, z: 6 }, { y: 0.6, z: 4.2, duration: 1.6, ease: 'power2.out' });
      gsap.to(camera.rotation, { x: -0.05, duration: 1.6 });
    } else {
      // THIS is the key fix: hide the cake once we've moved past it
      cakeGroup.visible = false;
    }
  });
  observer.observe(cakeStageEl, { attributes: true, attributeFilter: ['class'] });

  // ---------- CLICK TO BLOW OUT THE CANDLE ----------
  let blown = false;
  window.addEventListener('click', () => {
    if (blown) return;
    if (!cakeStageEl.classList.contains('active')) return;
    blown = true;
    lit = false;

    document.getElementById('cake-hint').style.opacity = 0;
    document.getElementById('cake-hint').style.animation = 'none';

    // Flame shrinks away and the light fades — this IS the "blow out" moment
    gsap.to(flame.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.35, ease: 'power2.in' });
    gsap.to(flameLight, { intensity: 0, duration: 0.5 });

    launchConfetti();

    // After the confetti has had time to fall and settle, reveal Continue
    gsap.delayedCall(2.2, () => {
      const btn = document.getElementById('btn-continue-cake');
      btn.style.pointerEvents = 'auto';
      gsap.to(btn, { opacity: 1, duration: 0.8 });
    });
  });

  document.getElementById('btn-continue-cake').addEventListener('click', () => {
    window.goToStage('stage-letter');
  });
}
