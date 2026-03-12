# AI-Native Marketing + Analytics Portfolio

Lightweight, offline-first portfolio site built with vanilla HTML, CSS, and JavaScript.

## Run locally
1. Open `/index.html` by double-clicking it.
2. Navigate to `Case Studies` to confirm projects load from `/assets/data/projects.json`.

No build step and no server required.

## Project structure
- `/index.html`
- `/case-studies.html`
- `/assets/styles.css`
- `/assets/app.js`
- `/assets/data/projects.json`
- `/assets/img/placeholder.svg`
- `/assets/templates/*.txt` (placeholder downloadable templates)

## Replace placeholders
- TT Ramillas font:
  - Add your font file to `/assets/fonts/TTRamillas-Regular.woff2`.
  - The stylesheet is already configured to use it and falls back to system serif if missing.
- Resume:
  - Add your real file at `/assets/Resume.pdf`.
  - Keep the filename as `Resume.pdf` or update the link in `/index.html`.
- Loom links:
  - Update each project's `loomUrl` in `/assets/data/projects.json`.
- Screenshots:
  - Replace `/assets/img/placeholder.svg` with your own files.
  - Update each project `screenshot` path in `/assets/data/projects.json`.
- Text content:
  - Edit hero text and sections in `/index.html`.
  - Edit projects and prompts in `/assets/data/projects.json`.
  - Edit contact placeholders in both HTML files.

## Zip and share
1. Ensure all files are saved in this folder.
2. Create a zip from the root folder:
   - macOS Finder: right-click folder -> `Compress`.
   - Terminal: `zip -r portfolio-site.zip .`
3. Share the zip file.

## Optional free hosting (GitHub Pages)
1. Create a new GitHub repository and push this folder.
2. In GitHub repo settings, open `Pages`.
3. Under `Build and deployment`, choose `Deploy from a branch`.
4. Select `main` branch and `/ (root)` folder.
5. Save and wait for deploy.
6. Open the provided Pages URL.

## Acceptance checklist status
- Offline by opening `index.html`: implemented.
- `case-studies.html` loads data dynamically: implemented via `XMLHttpRequest` from `projects.json`.
- Search + filters combined: implemented.
- Accordion open/close + deep-link hash: implemented.
- Copy buttons + toast: implemented.
- Responsive + accessible focus states and semantics: implemented.
