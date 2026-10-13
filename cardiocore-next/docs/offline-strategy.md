# CardioCore Next.js — Standalone Offline Artifact Strategy

## Context and Decision

The original CardioCore project includes `cardiocore.html` (938 KB), a monolithic, single-file HTML bundle where all styles, scripts, and image assets are inlined as base64 data URIs. This build allows completely offline, zero-server demonstrations simply by opening the HTML file in any modern browser.

Per Decision 4:
1. **Preserve existing offline build**: `cardiocore.html` in the root repository is preserved completely intact and untouched.
2. **No dual manual development**: We will not manually maintain a separate offline HTML code branch.
3. **Future automated strategy**: The new Next.js application will generate offline artifacts automatically through build tooling.

---

## Target Strategy for Generating Standalone Offline Artifacts

Next.js provides several modern options for offline and standalone distribution:

### Option 1: Static HTML Export (`next build` with `output: 'export'`)

Next.js supports static HTML export by configuring `next.config.ts`:
```ts
const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true, // required for static file serving
  },
};
```
When running `next build`, Next.js compiles the entire application into an `out/` folder consisting of static HTML, CSS, JavaScript chunks, and static assets.
- **Serving without web server**: Can be bundled into an Electron app, a Tauri desktop wrapper, or served via local file server.
- **PWA Service Worker**: Adding a standard Service Worker with CacheStorage allows the exported PWA to work completely offline, caching all routes, scripts, styles, and assets after first load.

### Option 2: Single-File Inlining (Direct Successor to `cardiocore.html`)

To reproduce the exact convenience of `cardiocore.html` (a single `.html` file that can be double-clicked in Windows Explorer):
1. Compile Next.js via static export (`output: 'export'`).
2. Run an automated post-build inliner (e.g., using `html-inline`, `inline-source`, or a lightweight Python/Node script).
3. The script:
   - Inlines all `<link rel="stylesheet">` CSS into `<style>` tags.
   - Inlines all `<script src="...">` JS into `<script>` tags.
   - Encodes all image assets (`heart-q.png`, etc.) as base64 data URIs.
4. Output: A single self-contained `dist/cardiocore-offline.html` file created completely from the same Next.js source code with zero duplicated engineering.

---

## Recommendation for Subsequent Phases

In Phase 7 (Testing and Release Preparation), we will integrate Option 2 into `package.json` as an `npm run build:offline` script that automatically takes the output of `next build` and generates a single-file offline demonstration artifact.
