# CardioCoreEdge — Phase 14A: Legacy Website Cleanup & Repository Consolidation Report

**Date:** 2026-10-13  
**Status:** Completed  
**Repository Remote:** `https://github.com/Sarthak-Raut-861/Cardiocore_website`  
**Execution Context:** Local repository consolidation prior to GitHub upload.

---

## 1. Safety Checks & Baseline Verification

Before any deletion occurred:
1. **Safety Backup Established:**
   - Full pre-cleanup baseline commit established: `9f76946 baseline: pre-cleanup repository state before Phase 14A legacy removal`.
   - Secondary external filesystem backup created at: `scratch/pre_cleanup_backup/`.
2. **Asset Parity Verification:**
   - All 9 image assets in root `assets/` were compared against `cardiocore-next/public/assets/` using SHA256 checksums and byte sizes. Every asset was verified to be 100% byte-identical (`Match: True`).
3. **Package Manifest Isolation:**
   - Confirmed that the active frontend maintains an independent, valid `cardiocore-next/package.json` and `cardiocore-next/package-lock.json`.
4. **Backend Database Safety:**
   - Confirmed that local SQLite databases (`backend/cardiocore_dev.db`, `-shm`, `-wal`) are preserved on disk and safely ignored by `.gitignore` to prevent exposure on GitHub.

---

## 2. Preserved & Relocated Resources

| Source File | Destination Path | Size (Bytes) | SHA256 Checksum | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `workspace-.../uploads/CardioCore — Mobile UI_UX System.pdf` | `docs/design/CardioCore-Mobile-UIUX-System.pdf` | 7,354,897 | `D4D861379F975C2BE5301ABFD1FA70DD0FC790EA4D70DB18813F40FA63671938` | Authoritative original UI/UX design system specification. Verified byte-identical. |
| `workspace-.../dev/pdf_text.txt` | `docs/design/CardioCore-Mobile-UIUX-System-text.txt` | 13,801 | — | Text transcript of UI/UX design specifications. |
| *(Synthesized summary)* | `docs/design/historical-qa-scenarios.md` | ~2,500 | — | Test matrix, user journeys, and viewport checklist extracted from historical QA scripts. |

---

## 3. Historical QA Script Review Findings

The `workspace-01a11201-46fb-7cd3-bd7e-00b469c8cab6/dev/` folder contained 30 Python Playwright scripts (`smoke.py`, `regression.py`, `doc_check.py`, `verify.py`, etc.).
- **Evaluation:** Every script hardcoded references to the legacy single-file bundle (`file:///home/user/cardiocore.html`) and targeted deprecated DOM selectors (`CC.startEcg()`, `#pFormPass`, etc.) from early prototyping phases.
- **Active Testing Replacement:** Modern automated testing is actively executed via:
  - Frontend: `cardiocore-next/tests/test_phase13_frontend.mjs` (testing protocol decoders, typed API clients, and CSRF handling).
  - Backend: `backend/tests/` (100 unit/integration tests with pytest covering auth, sessions, CSRF, ingestion, and multi-lead recordings).
- **Decision:** The user-journey scenarios and responsive viewport test matrices from those scripts were archived in `docs/design/historical-qa-scenarios.md`. The obsolete scripts themselves were safely removed along with the rest of the workspace folder.

---

## 4. Removed Legacy Files & Directories

The following 12 confirmed obsolete paths were permanently removed from the repository root:

| Repository-Relative Path | Type | Details |
| :--- | :--- | :--- |
| `index.html` | File | Legacy Vite SPA entry point (305 KB) |
| `cardiocore.html` | File | Legacy standalone offline HTML bundle (960 KB) |
| `build.py` | File | Legacy build concatenator script (4.3 KB) |
| `vite.config.js` | File | Legacy Vite server configuration for port 5173 (225 B) |
| `package.json` | File | Root package manifest containing only the Vite dev dependency (273 B) |
| `package-lock.json` | File | Root Vite lockfile (35 KB) |
| `src/` | Directory | 22 legacy vanilla HTML partials and JS modules (~506 KB) |
| `assets/` | Directory | 9 legacy assets (~2.26 MB), all verified in `cardiocore-next/public/assets/` |
| `dist/` | Directory | Vite build outputs |
| `node_modules/` | Directory | Root Vite node_modules (~50 MB) |
| `.pytest_cache/` | Directory | Ephemeral pytest cache at repository root |
| `workspace-01a11201-46fb-7cd3-bd7e-00b469c8cab6/` | Directory | Historical workspace snapshot and scratch files (~10 MB) |

*Safety Confirmation: No files inside `cardiocore-next/` or `backend/` were touched or deleted.*

---

## 5. Configuration & Documentation Updates

1. **Root `.gitignore`:**
   - Configured comprehensive rules excluding `.env*` secrets, `node_modules/`, `.next/`, `__pycache__/`, `.pytest_cache/`, `dist/`, and local SQLite database files (`*.db`, `*.db-shm`, `*.db-wal`).
2. **Environment Templates:**
   - Created safe, sanitized templates:
     - `cardiocore-next/.env.example`
     - `backend/.env.example`
3. **Root `README.md`:**
   - Fully rewritten to present the modern Next.js (`cardiocore-next/`) + FastAPI (`backend/`) architecture.
   - Includes local setup instructions, environment variable specifications, Vercel deployment configuration, and medical non-clinical validation disclaimers.

---

## 6. Validation Commands & Results

All four frontend validation checks and the backend test suite were executed directly:

| Test Suite / Command | Working Directory | Command | Exit Code | Result Summary |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Linter** | `cardiocore-next/` | `npm run lint` | `0` | **Passed** (0 errors, 0 warnings) |
| **Frontend TypeScript** | `cardiocore-next/` | `npx tsc --noEmit` | `0` | **Passed** (0 type errors) |
| **Frontend Production Build** | `cardiocore-next/` | `npm run build` | `0` | **Passed** (Compiled successfully via Turbopack) |
| **Frontend Phase 13 Tests** | `cardiocore-next/` | `node tests/test_phase13_frontend.mjs` | `0` | **Passed** (23 passed, 0 failed) |
| **Backend Automated Tests** | `backend/` | `python -m pytest` | `0` | **Passed** (100 passed, 0 failed in 12.60s) |

---

## 7. Git Status & History Summary

### Recent Commits:
```
5e2d320 chore(repo): remove legacy Vite site and consolidate repository architecture (Phase 14A)
9f76946 baseline: pre-cleanup repository state before Phase 14A legacy removal
```

### Clean Working Tree:
```
On branch master
nothing to commit, working tree clean
```

---

## 8. Deployment and Phase Boundaries

- **GitHub Remote:** Prepared for upload to `https://github.com/Sarthak-Raut-861/Cardiocore_website`.
- **Vercel Readiness:** The repository is configured with `cardiocore-next/` as the project root directory.
- **Constraints Maintained:**
  - **No GitHub push** was executed.
  - **No Vercel deployment** was executed.
  - **No application code or database schemas** were altered.
  - **Phase 13E** was not started.
