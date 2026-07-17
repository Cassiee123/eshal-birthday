# Eshu's Birthday Website — v4 (bug-fix + redesign pass)

## Full flow
Welcome -> curtain split (real fabric curtains now) -> Cake (decorated
with original cute stickers) -> Letter (your real letter, scrollable)
-> About Her (scroll-driven 3D reveal, glowing moon, floating panda)
-> Gift Box (one elegant ring, real glow) -> Favorites wall (20 rainbow
balloons, drag to pan, paint-splash pops) -> Memories Gallery ->
Proposal (Yes fixed center, No jumps corners) -> Celebrate -> Feedback
(she writes back how she felt)

## What was fixed this round
- Curtains now look like real fabric (pleats + rod + glow seam), not
  two flat rectangles — see js/transition.js + the CURTAIN CSS block
- Yes/No buttons on the proposal page were invisible (CSS bug — they
  inherited opacity:0 from the base button style and nothing ever
  faded them in). Fixed. Yes now stays fixed center; No starts in a
  random corner and jumps to a different corner every time it's
  approached/tapped.
- Gift box: removed the flat ugly beige panel (was a solid-color
  plane — now a real soft radial-gradient glow texture) and replaced
  the cluttered low-poly jewelry with ONE elegant ring + a cute
  pearly cat-charm gem.
- Favorites wall: added a 20th balloon ("Last favorite person:
  Fadil (Cass)"), switched to vibrant glowing rainbow colors, added
  drag-to-pan so no balloon is ever stuck off-screen, popping now
  throws a rainbow paint-splash, and the reveal card is now a
  centered candy-style pill instead of a plain bottom bar.
- About Her: the flat purple circle is now an actual glowing moon
  (gradient + soft craters, real texture) with a soft outer glow, a
  small floating panda drifts nearby, and the text is now driven
  directly by scroll/swipe progress instead of a one-time animation —
  it feels like scrubbing through a real 3D scene.
- Cake: added 6 original cute stickers around the base (panda, cat,
  bear, star faces, canvas-drawn). NOTE: could not add Tom & Jerry,
  SpongeBob, or Cinderella — those are copyrighted characters and I'm
  not able to reproduce them, even as small stickers.
- Letter: now contains your real full letter (scrollable inside the
  card, smaller font so it fits) plus the voice paragraph was added
  into About Her, as you asked.
- Added a final Feedback stage: she can type how she felt, "Save"
  keeps it in her browser (so it's there if she revisits), and "Copy"
  puts it on her clipboard so she can paste it back to you in a
  message — there's no backend/server here, so this is the only way
  for her words to reach you without adding an email service.

## Still need from you
- Background music file at assets/audio/background-music.mp3 (site
  runs silently without it, nothing breaks)
- Her photos in images/memories/, listed in js/photos-config.js

## How to preview
VS Code Live Server, or `python -m http.server 8000` then visit
http://localhost:8000 — you can't just double-click index.html.

## How to publish for free
Drag the whole folder onto https://app.netlify.com/drop for an
instant live link.
