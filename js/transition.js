// ============================================================
// transition.js — replaces the old 3D door.
// Two full-screen HTML halves ("curtains") sit on top of the
// Welcome stage, matching the background exactly so they're
// invisible as separate pieces. Clicking Open slides them apart,
// revealing the cake stage underneath. No 3D object needed at all.
// ============================================================

export function playSplitTransition(onComplete) {
  const left = document.getElementById('curtain-left');
  const right = document.getElementById('curtain-right');
  const rod = document.getElementById('curtain-rod');
  const seam = document.getElementById('curtain-glow-seam');

  // The seam glows brighter for a beat, like light building up
  // right before the curtains actually move
  gsap.to(seam, { opacity: 1, filter: 'blur(8px)', duration: 0.5 });

  gsap.to(left, { xPercent: -100, duration: 1.3, delay: 0.3, ease: 'power3.inOut' });
  gsap.to(right, {
    xPercent: 100,
    duration: 1.3,
    delay: 0.3,
    ease: 'power3.inOut',
    onComplete
  });
  gsap.to([rod, seam], { opacity: 0, duration: 0.8, delay: 0.9 });
}
