// ============================================================
// favorites.js — Stage 4.7 (REWRITTEN).
// A wall of glowing rainbow balloons, each hiding one of her
// favorite things. Drag to pan around the wall (so nothing is
// ever stuck out of view), pop a balloon to see a rainbow paint
// splash and a candy-style reveal card.
// ============================================================

import * as THREE from 'three';

// Her actual favorites, from her_favs.txt — plus one extra you asked for
const favorites = [
  { icon: '🎨', label: 'Favorite color', answer: 'Shades of blue' },
  { icon: '🍛', label: 'Favorite food', answer: 'Kabsa, aloo ki chawal, nihari' },
  { icon: '🥤', label: 'Favorite drink', answer: '7up & hot chocolate' },
  { icon: '🍫', label: 'Favorite dessert', answer: 'Brownie' },
  { icon: '🍬', label: 'Favorite chocolate', answer: 'Snickers' },
  { icon: '🌽', label: 'Favorite snack', answer: 'Doritos' },
  { icon: '🥭', label: 'Favorite fruit', answer: 'Mangoes' },
  { icon: '🌼', label: 'Favorite flower', answer: 'Daisies & lilies' },
  { icon: '🌸', label: 'Favorite season', answer: 'Spring' },
  { icon: '🌧️', label: 'Favorite weather', answer: 'Rain' },
  { icon: '🎵', label: 'Favorite song', answer: 'Cupid' },
  { icon: '📺', label: 'Favorite drama', answer: 'Aşk Laftan Anlamaz' },
  { icon: '⚔️', label: 'Favorite anime', answer: 'Attack on Titan' },
  { icon: '🧽', label: 'Favorite cartoons', answer: 'SpongeBob, Tom & Jerry, Barbie' },
  { icon: '🎮', label: 'Favorite game', answer: 'Genshin Impact' },
  { icon: '🐼', label: 'Favorite animal', answer: 'Panda' },
  { icon: '🇹🇷', label: 'Favorite country', answer: 'Türkiye' },
  { icon: '👗', label: 'Favorite style', answer: 'Modest & western, both' },
  { icon: '💍', label: 'Favorite jewelry', answer: 'Minimal and cute' },
  { icon: '💙', label: 'Last favorite person', answer: 'Fadil (Cass)' }
];

// Vibrant rainbow palette — glowing, not muddy
const rainbow = [0xff4b5c, 0xff9f45, 0xffe066, 0x51cf66, 0x00d4ff, 0x9775fa, 0xff6fa5];

export function initFavorites({ scene, camera, registerUpdate }) {

  const wallGroup = new THREE.Group();
  wallGroup.visible = false;
  scene.add(wallGroup);

  const cols = 5;
  const rows = Math.ceil(favorites.length / cols); // 4 rows exactly with 20 items
  const spacingX = 0.95;
  const spacingY = 1.15;

  const balloons = [];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // Soft round glow sprite shared by every balloon's colored halo
  const haloTexture = (() => {
    const size = 128;
    const cvs = document.createElement('canvas');
    cvs.width = cvs.height = size;
    const c = cvs.getContext('2d');
    const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(cvs);
  })();

  favorites.forEach((data, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const color = rainbow[i % rainbow.length];

    const balloonGroup = new THREE.Group();

    // Glowing glossy candy-like material
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.55,
      roughness: 0.2,
      metalness: 0.05
    });
    const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 20), mat);
    balloon.scale.set(1, 1.15, 1);
    balloonGroup.add(balloon);

    // A soft COLORED glow just behind each balloon — same hue as the
    // balloon so it reads as the balloon radiating its own light, rather
    // than the old flat white halo which looked washed-out and boring.
    const haloMat = new THREE.MeshBasicMaterial({
      map: haloTexture, color, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.set(1.25, 1.45, 1);
    halo.position.z = -0.05;
    balloonGroup.add(halo);

    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.07, 8), mat);
    knot.position.y = -0.42;
    balloonGroup.add(knot);

    const stringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.45, 6), stringMat);
    string.position.y = -0.66;
    balloonGroup.add(string);

    balloonGroup.position.set(
      (col - (cols - 1) / 2) * spacingX,
      (rows / 2 - row) * spacingY - 0.3,
      0
    );
    balloonGroup.userData.basePos = balloonGroup.position.clone();
    balloonGroup.userData.phase = i * 0.7;

    wallGroup.add(balloonGroup);
    balloons.push({ group: balloonGroup, mesh: balloon, popped: false, data });
  });

  // ---------- GENTLE FLOATING ----------
  registerUpdate((delta, elapsed) => {
    if (!wallGroup.visible) return;
    balloons.forEach((b) => {
      if (b.popped) return;
      b.group.position.y = b.group.userData.basePos.y + Math.sin(elapsed * 0.7 + b.group.userData.phase) * 0.05;
      b.group.position.x = b.group.userData.basePos.x + Math.sin(elapsed * 0.4 + b.group.userData.phase) * 0.02;
    });
  });

  // ---------- DRAG TO PAN (so nothing is ever stuck out of view) ----------
  const stageEl = document.getElementById('stage-favorites');
  let isDragging = false;
  let lastX = 0, lastY = 0;

  function clampPan() {
    const maxX = ((cols - 1) * spacingX) / 2;
    const maxY = ((rows - 1) * spacingY) / 2;
    wallGroup.position.x = THREE.MathUtils.clamp(wallGroup.position.x, -maxX, maxX);
    wallGroup.position.y = THREE.MathUtils.clamp(wallGroup.position.y, -maxY, maxY);
  }

  function dragStart(x, y) { isDragging = true; lastX = x; lastY = y; }
  function dragMove(x, y) {
    if (!isDragging) return;
    wallGroup.position.x += (x - lastX) * 0.004;
    wallGroup.position.y -= (y - lastY) * 0.004;
    clampPan();
    lastX = x; lastY = y;
  }
  function dragEnd() { isDragging = false; }

  stageEl.addEventListener('mousedown', (e) => dragStart(e.clientX, e.clientY));
  window.addEventListener('mousemove', (e) => dragMove(e.clientX, e.clientY));
  window.addEventListener('mouseup', dragEnd);
  stageEl.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    dragStart(t.clientX, t.clientY);
  });
  window.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const t = e.touches[0];
    dragMove(t.clientX, t.clientY);
  });
  window.addEventListener('touchend', dragEnd);

  // ---------- RAINBOW PAINT-SPLASH POP EFFECT ----------
  const activeBursts = [];
  // Soft round glow texture, shared by every burst — this is what turns
  // flat colored dots into actual smoky, colorful puffs
  function createSmokeTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }
  const smokeTexture = createSmokeTexture();

  function spawnBurst(position) {
    const count = 26;
    const geo = new THREE.PlaneGeometry(0.5, 0.5);
    // NOTE: for an InstancedMesh, per-instance tint comes from setColorAt()
    // (instanceColor). The base color MUST be white and vertexColors MUST
    // be off — the old code set vertexColors:true on geometry that has no
    // vertex-color attribute, which made three.js read (0,0,0) and render
    // every puff BLACK. This is the fix for the "black burst" bug.
    const mat = new THREE.MeshBasicMaterial({
      map: smokeTexture,
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    wallGroup.add(mesh);
    const dummy = new THREE.Object3D();
    const data = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 1.3; // slower, smokier drift than the old paint dots
      data.push({
        pos: position.clone(),
        vel: new THREE.Vector3(Math.cos(angle) * speed, 0.5 + Math.random() * 1.2, Math.sin(angle) * speed * 0.5),
        startScale: 0.5 + Math.random() * 0.6
      });
      mesh.setColorAt(i, new THREE.Color(rainbow[Math.floor(Math.random() * rainbow.length)]));
    }
    mesh.instanceColor.needsUpdate = true;
    activeBursts.push({ mesh, data, dummy, age: 0 });
  }

  registerUpdate((delta) => {
    for (let b = activeBursts.length - 1; b >= 0; b--) {
      const burst = activeBursts[b];
      burst.age += delta;
      const life = burst.age / 1.3;
      burst.data.forEach((d, i) => {
        d.vel.y -= 1.6 * delta; // gentler drag than actual paint — smoke drifts, doesn't fall hard
        d.vel.multiplyScalar(0.985); // slows down over time, like dissipating smoke
        d.pos.addScaledVector(d.vel, delta);
        burst.dummy.position.copy(d.pos);
        // Smoke puffs GROW as they dissipate (real smoke expands), then fade
        const growScale = d.startScale * (1 + life * 1.4);
        burst.dummy.scale.setScalar(growScale * Math.max(0, 1 - life));
        burst.dummy.lookAt(camera.position); // always face the camera, like a real billboard puff
        burst.dummy.updateMatrix();
        burst.mesh.setMatrixAt(i, burst.dummy.matrix);
      });
      burst.mesh.instanceMatrix.needsUpdate = true;
      if (burst.age > 1.3) {
        wallGroup.remove(burst.mesh);
        activeBursts.splice(b, 1);
      }
    }
  });

  // ---------- REVEAL PANEL (candy-style, centered) ----------
  const panel = document.getElementById('favorite-reveal-panel');
  let revealedCount = 0;

  function popBalloon(b) {
    if (b.popped) return;
    b.popped = true;
    revealedCount++;

    spawnBurst(b.group.position);

    gsap.to(b.group.scale, {
      x: 1.3, y: 1.3, z: 1.3, duration: 0.1, ease: 'power1.out',
      onComplete: () => {
        gsap.to(b.group.scale, {
          x: 0, y: 0, z: 0, duration: 0.15, ease: 'power2.in',
          onComplete: () => { b.group.visible = false; }
        });
      }
    });

    // Project the balloon's TRUE WORLD position (getWorldPosition accounts
    // for the wall's drag-panning — the old code used the local position
    // and ignored panning, so the card jumped to the wrong place). We then
    // nudge the card just BELOW the balloon so it appears right beside where
    // she popped it: left balloon -> card stays left, etc.
    const world = new THREE.Vector3();
    b.group.getWorldPosition(world);
    const screenPos = world.project(camera);
    const px = (screenPos.x + 1) / 2 * window.innerWidth;
    const py = (1 - screenPos.y) / 2 * window.innerHeight + 70; // sit just under the balloon
    const margin = 160; // keeps the panel from overflowing off-screen near edges
    const clampedX = THREE.MathUtils.clamp(px, margin, window.innerWidth - margin);
    const clampedY = THREE.MathUtils.clamp(py, 90, window.innerHeight - 90);
    panel.style.left = `${clampedX}px`;
    panel.style.top = `${clampedY}px`;

    panel.innerHTML = `<span class="fav-icon">${b.data.icon}</span> <strong>${b.data.label}:</strong> ${b.data.answer}`;
    gsap.killTweensOf(panel);
    gsap.fromTo(panel,
      { opacity: 0, scale: 0.6, x: '-50%', y: '-50%' },
      { opacity: 1, scale: 1, x: '-50%', y: '-50%', duration: 0.45, ease: 'back.out(2.2)' }
    );

    if (revealedCount >= favorites.length) {
      gsap.delayedCall(1, () => {
        const btn = document.getElementById('btn-continue-favorites');
        btn.style.pointerEvents = 'auto';
        gsap.to(btn, { opacity: 1, duration: 0.8 });
      });
    }
  }

  function handlePointerDown(clientX, clientY) {
    if (!stageEl.classList.contains('active')) return;
    pointer.x = (clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const meshes = balloons.filter(b => !b.popped).map(b => b.mesh);
    const hits = raycaster.intersectObjects(meshes);
    if (hits.length > 0) {
      const hitBalloon = balloons.find(b => b.mesh === hits[0].object);
      if (hitBalloon) popBalloon(hitBalloon);
    }
  }

  // Only treat it as a "tap" (not a drag) if the pointer barely moved
  let downX = 0, downY = 0;
  stageEl.addEventListener('mousedown', (e) => { downX = e.clientX; downY = e.clientY; });
  stageEl.addEventListener('mouseup', (e) => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6) handlePointerDown(e.clientX, e.clientY);
  });
  stageEl.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    if (Math.hypot(t.clientX - downX, t.clientY - downY) < 6) handlePointerDown(t.clientX, t.clientY);
  });

  // ---------- SHOW WHEN ACTIVE ----------
  const observer = new MutationObserver(() => {
    if (stageEl.classList.contains('active')) {
      wallGroup.visible = true;
      wallGroup.position.set(0, 0, 0);
      camera.position.set(0, 0, 7.5);
      camera.rotation.set(0, 0, 0);
      gsap.to(camera.position, { z: 5.8, duration: 1.5, ease: 'power2.out' });
    } else {
      wallGroup.visible = false;
    }
  });
  observer.observe(stageEl, { attributes: true, attributeFilter: ['class'] });

  document.getElementById('btn-continue-favorites').addEventListener('click', () => {
    window.goToStage('stage-gallery');
  });
}
