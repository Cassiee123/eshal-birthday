// ============================================================
// music.js — background music that plays across every stage.
//
// IMPORTANT: browsers block audio from playing automatically
// until the user has interacted with the page (clicked/tapped
// something) — this is a browser security rule, not a bug we
// can code around. So: we try to play immediately, and if that's
// blocked, we start it on the very first click/tap anywhere.
// ============================================================

export function initMusic() {
  const audio = document.getElementById('bg-music');
  const muteBtn = document.getElementById('btn-mute');
  audio.volume = 0;

  let started = false;
  let muted = false;

  function fadeIn() {
    gsap.to(audio, { volume: 0.5, duration: 2, ease: 'power1.in' });
  }

  function tryStart() {
    if (started) return;
    audio.play()
      .then(() => {
        started = true;
        fadeIn();
      })
      .catch(() => {
        // Blocked by the browser — will retry on first user interaction below
      });
  }

  tryStart();

  // Fallback: start on the first interaction anywhere on the page
  function firstInteraction() {
    if (!started) tryStart();
    window.removeEventListener('click', firstInteraction);
    window.removeEventListener('touchstart', firstInteraction);
  }
  window.addEventListener('click', firstInteraction);
  window.addEventListener('touchstart', firstInteraction);

  // ---------- MUTE TOGGLE ----------
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    gsap.to(audio, { volume: muted ? 0 : 0.5, duration: 0.4 });
    muteBtn.textContent = muted ? '🔇' : '🔊';
  });
}
