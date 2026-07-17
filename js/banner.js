// ============================================================
// banner.js — "Character Event Wish" gacha pull mini-game.
// Sits between the Memories gallery and the Proposal stage.
//
// HOW THE RANDOMNESS WORKS:
// A random number between 1 and 10 is picked as the "pity count" —
// that's how many pulls happen before the 5-star (him) shows up.
// Every pull before that is a filler "3-star" card. This means
// sometimes she gets him on pull 1 (lucky!), sometimes she has to
// wait all the way to pull 10 (hard pity, just like the real game).
// ============================================================

const FILLER_CARDS = [
  { emoji: '⭐', label: 'Traveler\'s Snack' },
  { emoji: '🍞', label: 'Sunset Sweets' },
  { emoji: '💎', label: '20x Primogems' },
  { emoji: '📦', label: 'Common Sigil' },
  { emoji: '🍎', label: 'Random Fruit' },
  { emoji: '🔮', label: 'Adventurer\'s Xp' },
  { emoji: '🌟', label: '4-Star Weapon' }
];

export function initBanner() {
  const pullBtn = document.getElementById('btn-banner-pull');
  const stage = document.getElementById('stage-banner');
  const cardSlot = document.getElementById('banner-card-slot');
  const pityText = document.getElementById('banner-pity-text');
  const swirl = document.getElementById('banner-swirl');
  const continueBtn = document.getElementById('btn-continue-banner');
  const finalReveal = document.getElementById('banner-final-reveal');
  const introText = document.getElementById('banner-intro-text');

  let pulling = false;

  pullBtn.addEventListener('click', () => {
    if (pulling) return;
    pulling = true;
    pullBtn.style.pointerEvents = 'none';
    gsap.to(pullBtn, { opacity: 0, duration: 0.4 });
    introText.style.opacity = 0;

    const pityCount = 1 + Math.floor(Math.random() * 10); // 1–10, random every time
    runPull(1, pityCount);
  });

  function runPull(pullNumber, pityCount) {
    pityText.style.opacity = 1;
    pityText.textContent = `Wish ${pullNumber} of ${pityCount}...`;

    // swirling light-burst animation for this pull
    swirl.style.opacity = 1;
    gsap.fromTo(swirl, { rotation: 0, scale: 0.6 }, { rotation: 220, scale: 1.15, duration: 0.9, ease: 'power2.out' });

    gsap.delayedCall(0.9, () => {
      const isFinal = pullNumber === pityCount;
      showCard(isFinal, () => {
        if (isFinal) {
          gsap.delayedCall(1.2, showFinalReveal);
        } else {
          gsap.delayedCall(0.9, () => runPull(pullNumber + 1, pityCount));
        }
      });
    });
  }

  function showCard(isFinal, onDone) {
    cardSlot.innerHTML = '';
    const card = document.createElement('div');
    card.className = `banner-card ${isFinal ? 'five-star' : 'three-star'}`;

    if (isFinal) {
      card.innerHTML = `
        <div class="banner-rays"></div>
        <img src="images/gacha/him.jpg" alt="" class="banner-card-photo"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="banner-card-fallback" style="display:none;">🐼</div>
        <div class="banner-card-name">Cass</div>
        <div class="banner-card-stars">★★★★★</div>
      `;
    } else {
      const filler = FILLER_CARDS[Math.floor(Math.random() * FILLER_CARDS.length)];
      card.innerHTML = `
        <div class="banner-card-emoji">${filler.emoji}</div>
        <div class="banner-card-name">${filler.label}</div>
        <div class="banner-card-stars">★★★</div>
      `;
    }

    cardSlot.appendChild(card);
    gsap.fromTo(card, { scale: 0.3, opacity: 0, rotateY: 180 }, {
      scale: 1, opacity: 1, rotateY: 0, duration: 0.6, ease: 'back.out(1.8)',
      onComplete: () => gsap.delayedCall(isFinal ? 0.3 : 0.5, onDone)
    });
  }

  function showFinalReveal() {
    pityText.style.opacity = 0;
    finalReveal.style.display = 'flex';
    gsap.fromTo(finalReveal, { opacity: 0 }, { opacity: 1, duration: 1 });
    gsap.delayedCall(2, () => {
      continueBtn.style.pointerEvents = 'auto';
      gsap.to(continueBtn, { opacity: 1, duration: 1 });
    });
  }

  continueBtn.addEventListener('click', () => {
    window.goToStage('stage-propose');
  });

  window.addEventListener('stage-leaving', (e) => {
    if (e.detail.id === 'stage-banner') {
      // reset everything so replaying the site feels fresh
      pulling = false;
      pullBtn.style.pointerEvents = 'auto';
      pullBtn.style.opacity = 1;
      introText.style.opacity = 1;
      pityText.style.opacity = 0;
      swirl.style.opacity = 0;
      cardSlot.innerHTML = '';
      finalReveal.style.display = 'none';
      finalReveal.style.opacity = 0;
      continueBtn.style.opacity = 0;
      continueBtn.style.pointerEvents = 'none';
    }
  });
}