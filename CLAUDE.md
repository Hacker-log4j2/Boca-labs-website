# Boca Labs website

Boca Block is a dental device that helps guide the inferior alveolar nerve (IAN) block. The audience is dentists and dental practices. "Carpules" are anesthetic cartridges. Keep clinical claims neutral; real product claims come from the team.

Static site, no build step. Hosted on Netlify (boca-labs.com) from `main`.
- `index.html` + `app.js`: home page. Sections: hero (floating L + R product shot), overview (two jobs), scroll-driven needle story (`.story`, cartoon SVG driven by --seat/--bite/--push), rotation dial (±8°), material, design-details bento, waitlist.
- `feedback/index.html` + `feedback.js`: feedback page at `/feedback`. Dentists fill it in between procedures, so keep it as fast as possible: one question per step, single-tap answers auto-advance (keys L/R and 1/2/3 too), voice note is the main input, location is captured in the background on first tap.
- `thanks.html`: after waitlist signup. `styles.css` is shared by every page (use absolute `/styles.css` paths in subfolders).

## Design
- Violet glass style: saturated violet backdrop with blurred color fields and a blurred product shape, seen through a "reeded glass" stripe overlay (`.reeds`) + grain. Frosted glass panels (`.glass`), white pill buttons (`.btn-light`), plain text links with ↗.
- Palette (CSS variables at top of `styles.css`): Soft Amethyst #AFA3D6, Lilac Mist #D5CEEC, Crystal Haze #EFEFF4, Deep Graphite #2E2C39, plus --violet #5A3FD9 / --violet-hi / --violet-deep and --amber #F3B95F accent.
- Font: Inter only. Headings weight 400 with tight tracking (-0.035em).
- Hero image: `images/boca-block-clear.png` (clear resin render, background removed with Apple Vision); the hero shows it twice, the second mirrored to stand in for the right-side version. Older opaque render: `images/boca-block.png`, cut from the Boca-Block STS drawing (rev 74) with a transparent background; `images/boca-block-blur-src.png` is a small copy used blurred behind the reeds. The drawing was marked "For Review from Invoke Law": confirm with the team before publishing new device imagery. Don't use third-party brand photos.
- Product facts come from the team's device overview (IAN Bite Block & Needle Guide): bite stabilization + needle trajectory guidance, slotted viewing windows, ridged bite surfaces, alignment notch, handle, ±8° rotation, separate L/R prototypes (subject to change). Always keep the "clinician stays in control" note. Material copy ("BioMed flexible resin, ISO-compliant") is marked TODO until the team confirms exact wording.

## Netlify Forms
- `waitlist` (name, email, practice): normal HTML post to `/thanks.html`.
- `feedback` (patient_age [slider 3-95], side [Left/Right], carpules [1/2/3], anomalies [comma list], anomalies_other, feedback, location, voice, photo1-3): `feedback.js` posts it as multipart via fetch. A hidden static copy of the form at the top of `feedback/index.html` lets Netlify detect the fields; if you add or rename a field, update BOTH. Netlify caps a submission at 8 MB, so photos are resized client-side and voice notes cap at 2 minutes.
- Export from Netlify -> Forms -> pick form -> Download as CSV.
- Mic and location need HTTPS (works on Netlify and localhost). Form posts only work on Netlify, not the local preview.

## Workflow
- Preview locally with the `site` launch config (python http.server on port 4321).
- Make changes on a branch and open a PR so Netlify builds a deploy preview; merge to `main` to publish.

## Live 3D (next step)
- Before building any real-time 3D (three.js) for the hero or scroll story, read `docs/live-3d-guide.md`. It adapts the team's "live 3D" guide to Boca Block and this static stack: GLB from CAD, clear-resin physical material, PMREM studio light, scroll cue list, exploded view, performance and known bugs.

## Not public
- `CLAUDE.md`, `README.md` and `docs/` are blocked from the live site in `netlify.toml` (the publish dir is the repo root). Keep internal notes in those places, never in served pages.
