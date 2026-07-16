// ============================================================
// hearts.js — ambient floating heart emojis, always drifting
// upward in the background. Pure DOM + CSS animation, no
// Three.js needed — much cheaper than a 3D particle system
// for something this simple.
// ============================================================

export function initHearts() {
  const layer = document.getElementById('hearts-layer');
  const emojis = ['💖', '💕', '❤️', '💗', '✨'];

  const HEART_COUNT = 14;

  for (let i = 0; i < HEART_COUNT; i++) {
    const heart = document.createElement('span');
    heart.className = 'floating-heart';
    heart.textContent = emojis[Math.floor(Math.random() * emojis.length)];

    // Randomize each heart's horizontal position, size, speed, and
    // start delay so they don't all move in obvious unison.
    heart.style.left = `${Math.random() * 100}%`;
    heart.style.fontSize = `${10 + Math.random() * 12}px`;
    heart.style.animationDuration = `${11 + Math.random() * 9}s`;
    heart.style.animationDelay = `${Math.random() * 10}s`;
    heart.style.opacity = 0.12 + Math.random() * 0.18;
    heart.style.filter = 'blur(0.4px)';

    layer.appendChild(heart);
  }
}
