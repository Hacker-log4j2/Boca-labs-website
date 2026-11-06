# Boca Labs website

Static site, no build step: `index.html`, `thanks.html`, `styles.css`. Hosted on Netlify from `main`.

- Waitlist form is a Netlify Form named `waitlist` (fields: name, email, practice). Keep `data-netlify="true"`, the hidden `form-name` input, and the honeypot when editing it. Export signups from Netlify → Forms → waitlist → Download as CSV.
- Colors and fonts live as variables at the top of `styles.css`.
- Put images in `/images`.
- Make changes on a branch and open a PR so Netlify builds a deploy preview; merge to `main` to publish.
- Placeholder copy is marked with `TODO` comments in `index.html`.
