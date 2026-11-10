# Live 3D on the Boca Labs site

Working notes for when we turn the Boca Block hero/story into a real-time 3D scene. Based on the "Build 3D websites that run live" guide (@uijonah / Parallel Studios, 14-page PDF the team shared on 2026-11-09), adapted to this project. The PDF itself is not in the repo.

## The idea
Render the product live in the browser with three.js instead of playing video or stacking images. Four layers: **geometry** (the model), **materials**, **light** (a small studio inside the scene) and **direction** (scroll moves the camera). It reacts to cursor, tilt, scroll and touch, and ships far lighter than a hero video.

## How it maps to Boca Block
- **Object:** Boca Block, one device. **Verb** (the one thing the visitor does to it): rotate the guide ±8°, or "seat and guide" (needle slides through the slotted guide). Pick one as the opening shot.
- **Scroll story in 5 beats:** hero → close-up (ridged bite surfaces, slotted windows) → apart (exploded: guide arm lifts off the bite block at the point of rotation) → around (orbit, show L/R) → back together. Our current sections already follow this order.
- **Real units:** model in millimetres so proportions stay honest. Frame each shot by size ("fit 52 mm on screen"), not camera distance, so the same cue works on phone and desktop.
- **Geometry:** the guide builds parts procedurally (2D signed-distance shapes → trace outline → extrude with a ~0.05 mm bevel). We have real CAD, so first ask the team for a **GLB/glTF export** (or STL/STEP to convert) and load that; keep procedural geometry for simple extras.
- **Material:** Boca Block is clear resin, not metal. Use `MeshPhysicalMaterial` with `transmission` ~1, `ior` ~1.5, `thickness`, low `roughness`, lilac `attenuationColor`, optional `clearcoat`. Guide's rule still applies: give the flat faces and the edges different finishes; edges are where light reads.
- **Light:** build a tiny studio (one off-axis key softbox + two strip lights) and bake it with `PMREMGenerator.fromScene` into `scene.environment`. Rotate the environment with the cursor. Clear/glass parts should reflect only the environment, not direct lights, or they get a fake hot spot.
- **Direction:** a cue list pinned to page sections (`{ id, at, shot: { frame, polar, offsetX, explode } }`). The engine blends between cues and eases toward the result every frame.
- **Exploded view:** each part gets a lift vector and an order; top parts leave first and return last. Optional: labels projected from 3D points into two clean columns with leader lines; a "blueprint" toggle that swaps surfaces for edges.
- **Pulse:** one clock drives all motion (`time += dt * timeScale`); slow motion is just a smaller `timeScale`. Sound, if any, is synthesized with Web Audio (no audio files) and only starts after a user gesture, e.g. a hold-to interaction with a progress ring.
- **Finish:** short post chain: MSAA/HDR → bloom (high threshold, glints only) → ACES tone mapping → grain.

## Fitting our stack (static site, no build step)
- The guide uses Next.js; we don't need to. Load three.js as an ES module from a pinned CDN URL with an import map (e.g. `three@0.17x` from jsdelivr), one `engine.js` class, one fixed full-screen `<canvas>` behind the HTML sections.
- Keep the 2D fallback (current PNG hero + SVG story) for `prefers-reduced-motion`, no-WebGL, and while the scene loads.

## Performance rules
- Cap `devicePixelRatio` at 1.75 on phones. If fps drops under ~40, lower resolution first, then turn bloom off.
- `renderer.compileAsync` shaders behind a loader; build heavy extras once the page is idle.
- Budget: the guide's example site was ~320 kB total. Our current hero PNG alone is 1.3 MB, so a GLB + code can come in lighter.

## Bugs the guide warns about
1. Sticky sections stop sticking if a wrapper has `overflow-x: hidden`; use `overflow-x: clip`. (Our `.story-sticky` depends on this.)
2. Lathe profiles drawn clockwise render inside out; draw them counter-clockwise.
3. Hot spot in the middle of glass: reflect the environment only, blended on top.
4. IntersectionObserver reveals can miss beats on heavy GPU frames; drive reveals from scroll position once a canvas is running. (Our `.reveal` uses an observer today.)
5. Headless/preview browsers render 3D at ~1 fps; judge motion on a real phone, not screenshots.

## Brief to start from
"Add one fixed three.js canvas behind the existing sections. Load the Boca Block GLB in real millimetres with a clear-resin MeshPhysicalMaterial, lit by a PMREM studio (off-axis softbox, two strips) that rotates with the cursor. Drive the camera from a scroll cue list matching our sections (hero, close-up, apart, around, together), with a staggered exploded view at the pivot, two-column callouts, and a hold-to-rotate interaction. Post: bloom, ACES, grain. Keep the current 2D version as the fallback. Check every section on a real phone."
