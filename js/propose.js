// ============================================================
// propose.js — the playful "Will you be my future wife?" page.
// The No button physically runs away from the cursor/finger so
// it's basically unclickable, nudging toward Yes in a funny way.
// Pure DOM positioning + GSAP, no Three.js needed here.
// ============================================================

const taunts = [
  "Pffft Salayy the No button is scared of you 😂",
  "It really doesn't want to be clicked 😂",
  "No is not an option today 😜",
  "Try again, it's faster than you 💨",
  "This button has trust issues 🥲",
  "Eshuuuu... I knew you'd try No first 🙄😤",
  "The No button said, 'I'm not arguing with Eshu today!'😭",
  "Pfffft... you almost caught it 🤭",
  "Okay okay... one more try 😌",
  "Just press Yes already, Eshu 💙🥺"
];

export function initPropose() {
  const stageEl = document.getElementById('stage-propose');
  const yesBtn = document.getElementById('btn-propose-yes');
  const noBtn = document.getElementById('btn-propose-no');
  const taunt = document.getElementById('propose-taunt');

  // Corner/side positions the No button can jump between (as fractions
  // of the viewport, kept away from the very edges)
  const positions = [
    { x: 0.1, y: 0.15 }, { x: 0.9, y: 0.15 },   // top corners
    { x: 0.1, y: 0.85 }, { x: 0.9, y: 0.85 },   // bottom corners
    { x: 0.5, y: 0.15 }, { x: 0.1, y: 0.5 },    // top-middle, left-middle
    { x: 0.9, y: 0.5 }, { x: 0.5, y: 0.85 }     // right-middle, bottom-middle
  ];
  let lastIndex = -1;

  function moveToRandomPosition() {
    let index;
    do {
      index = Math.floor(Math.random() * positions.length);
    } while (index === lastIndex); // never repeat the same spot twice in a row
    lastIndex = index;

    const pos = positions[index];
    const x = pos.x * window.innerWidth - 60;
    const y = pos.y * window.innerHeight - 24;

    gsap.to(noBtn, { left: x, top: y, duration: 0.35, ease: 'back.out(1.7)' });
    taunt.textContent = taunts[Math.floor(Math.random() * taunts.length)];
  }

  // Place it in a random corner the moment this stage appears
  function placeInitial() {
    moveToRandomPosition();
  }

  // ---------- DODGE LOGIC ----------
  // Whenever the pointer gets within ~90px of the No button while
  // this stage is active, teleport it somewhere else on screen.
  function handlePointer(clientX, clientY) {
    if (!stageEl.classList.contains('active')) return;
    const rect = noBtn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(clientX - centerX, clientY - centerY);
    if (distance < 90) moveToRandomPosition();
  }

  window.addEventListener('mousemove', (e) => handlePointer(e.clientX, e.clientY));
  // On touch devices there's no hover, so dodge the instant it's tapped near
  noBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    moveToRandomPosition();
  });

  // ---------- SHOW WHEN STAGE BECOMES ACTIVE ----------
  const observer = new MutationObserver(() => {
    if (stageEl.classList.contains('active')) {
      placeInitial();
    }
  });
  observer.observe(stageEl, { attributes: true, attributeFilter: ['class'] });

  // Reposition correctly if the window is resized mid-stage
  window.addEventListener('resize', () => {
    if (stageEl.classList.contains('active')) placeInitial();
  });

  // ---------- YES BUTTON ----------
  yesBtn.addEventListener('click', () => {
    window.goToStage('stage-celebrate');
  });
}
