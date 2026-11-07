# Boca Labs website

Static site, no build step: `index.html`, `thanks.html`, `styles.css`, `app.js`. Hosted on Netlify (boca-labs.com) from `main`.

- Palette (CSS variables at top of `styles.css`): Soft Amethyst #AFA3D6, Lilac Mist #D5CEEC, Crystal Haze #EFEFF4, Deep Graphite #2E2C39. Fonts: Instrument Serif (headings), Inter (body).
- Hero product render is a placeholder SVG in `index.html` (`.hero-shot`). Swap for a real image in `/images` when available. Don't use third-party brand photos.
- Netlify Forms:
  - `waitlist` (name, email, practice): normal HTML post to `/thanks.html`.
  - `feedback` (age, location, carpools, feedback, voice, photo1-3): submitted by `app.js` via fetch as multipart. A hidden static copy of the form at the top of `index.html` lets Netlify detect the fields; if you add or rename a field, update BOTH the hidden form and `app.js`. Netlify caps a submission at 8 MB, so photos are resized client-side and voice notes cap at 2 minutes.
  - Export from Netlify -> Forms -> pick form -> Download as CSV.
- Mic and location need HTTPS (works on Netlify and localhost).
- Make changes on a branch and open a PR so Netlify builds a deploy preview; merge to `main` to publish.
- Placeholder copy is marked with `TODO` comments in `index.html`.
