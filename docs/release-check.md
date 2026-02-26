# Release Check Report (last 6 merged PRs)

Date: 2026-02-26
Scope: repository audit only (no feature implementation)
Baseline: current HEAD `66a6aa0`

## A) Merge state / scope

### A1) Last 6 merged PRs (from merge commits in current history)

> Note: No `main` branch ref or remote is configured in this environment, so this list is derived from local merge commits in the current branch history.

| Order (newest→oldest) | Merge commit | PR | Title (from merge commit) |
|---|---|---|---|
| 1 | `66a6aa0` | #13 | Integration: LiveMatchScreen + kickoff + export + SPP + CI |
| 2 | `9cdc601` | #11 | Require kick-off event per drive (BB2025) |
| 3 | `ae74fcf` | #5 | Responsive polish: mobile-first layout + bottom sheet modals |
| 4 | `e626fe8` | #6 | Share-first export (PDF/TXT/JSON) with SPP aggregation and MVP at export time |
| 5 | `4635c56` | #4 | Refocus Live Actions: Touchdown/Completion/Interception/Injury + rich injury payload |
| 6 | `10b5f0d` | #3 | Add GitHub Actions CI workflow for PRs to main |

### A2) What each actually changed (diff-based)

- **#13 / `66a6aa0`**: adjusted CI steps and test scripts; expanded `LiveMatchScreen` for kickoff modal/dropdown behavior and export/action hooks (`.github/workflows/ci.yml`, `package.json`, `src/ui/screens/LiveMatchScreen.tsx`).
- **#11 / `9cdc601`**: introduced drive derivation and kickoff-per-drive state (`src/domain/drives.ts`), kickoff event payload typing (`src/domain/events.ts`), kickoff table (`src/rules/bb2025/kickoff.ts`), wiring in store/UI and SPP modifier hook (`src/store/matchStore.ts`, `src/ui/screens/LiveMatchScreen.tsx`, `src/export/spp.ts`, `src/rules/bb2025/sppModifiers.ts`).
- **#5 / `ae74fcf`**: mobile-first layout and modal sheet updates (`src/index.css`, `src/ui/components/Modal.tsx`) and responsive tweaks in live screen/player picker.
- **#6 / `e626fe8`**: added report exporters and SPP aggregation (`src/export/report.ts`, `src/export/spp.ts`) and export UX in live screen.
- **#4 / `4635c56`**: expanded event model for injury data and action logging; updated stats and live action flows (`src/domain/events.ts`, `src/export/export.ts`, `src/ui/screens/LiveMatchScreen.tsx`).
- **#3 / `10b5f0d`**: introduced CI workflow file for PRs to main (`.github/workflows/ci.yml`).

---

## B) CI / GitHub Actions

### B3) Workflow checks

File reviewed: `.github/workflows/ci.yml`

- ✅ Workflow triggers on `pull_request` targeting `main` (`on.pull_request.branches: [ main ]`).
- ✅ Runs `npm ci`.
- ✅ Runs `npm run build`.
- ⚠️ Runs `npm run test:unit --if-present`, but in this repo `test:unit` is a placeholder echo script.
- ❌ Playwright setup step missing (`npx playwright install --with-deps` not present).
- ⚠️ Runs `npm run test:e2e --if-present`, but in this repo `test:e2e` is also placeholder echo script.

### B4) Required status checks vs job names

- Workflow job name is `build`.
- ⚠️ Branch protection required checks could not be verified from this local clone because no GitHub remote/config API context is available here.
- Action item: in GitHub branch protection, ensure required check is exactly `build` (or rename job to match whichever check is required).

---

## C) Tests exist & runnable

### C5) `package.json` scripts + devDependencies

- ❌ Missing unit-test toolchain dependencies: `vitest`, `jsdom`, `@testing-library/*` are not in `devDependencies`.
- ❌ Missing `@playwright/test` dependency.
- ⚠️ Scripts exist for `test:unit` and `test:e2e`, but both only echo “No ... tests configured yet”.

### C6) Test files present

- ❌ No unit test files found.
- ❌ No Playwright spec files found.
- Status: **tests scaffolded as placeholder scripts, but no specs yet**.

### C7) Local execution in this environment

Commands executed:
- `npm ci` ✅
- `npm run build` ✅
- `npm run test:unit` ✅ (command succeeds but only prints placeholder message)
- `npm run test:e2e` ✅ (command succeeds but only prints placeholder message)

Interpretation:
- Build is real and passes.
- Current unit/e2e “passes” are non-validating placeholders, not actual test execution.

---

## D) Feature verification (source-level)

### D8) Kickoff per drive

- ✅ `kickoff_event` exists in `EventType` and payload shape includes `driveIndex`, teams, roll, key+label.
- ✅ Drive derivation logic exists with `driveIndexCurrent`, `kickoffPending`, per-drive kickoff map.
- ✅ UI gating exists: actions call `requireKickoffBefore(...)`, which blocks and opens kickoff modal if kickoff is pending.

### D9) Kickoff selection UI

- ✅ No dice rolling input required; user selects kickoff event from dropdown.
- ✅ Dropdown lists all BB2025 kickoff events and shows roll number in option label `"Label (roll)"`.

### D10) SPP BB2025 standardization

- ⚠️ BB2025 modules exist (`src/rules/bb2025/*`) and are used by SPP derivation, but there is also legacy kickoff enum data in `src/domain/enums.ts`, so this is not a single source of truth across the app.
- ✅ Base SPP constants are implemented in logic: TD 3, Comp 1, Int 2, Cas 2, MVP 4.
- ⚠️ Casualty SPP logic: requires `injury` event with `team` and `causerPlayerId`; does not additionally enforce injury result/cause beyond excluding crowd unless a modifier allows it.

### D11) Exports

- ✅ Export UX offers:
  - PDF: Share + Download + Print
  - TXT: Share + Download
  - JSON: Share + Download
- ✅ TXT export is single-file report (timeline + casualties + SPP summary together).
- ✅ PDF uses Helvetica (not monospace).
- ✅ SPP appears in TXT section and therefore in generated PDF (PDF is built from TXT lines).

### D12) Prayers to Nuffle

- ⚠️ Inducement capture stores only `detail` string for prayer in `match_start.payload.inducements`.
- ❌ No dedicated BB2025 prayers mapping module (key+label mapping) found under `src/rules/bb2025`.
- ⚠️ Report/export shows prayer implicitly only via serialized match_start payload in timeline; no explicit structured prayer section.

---

## E) UI regression check

### D13) LiveMatchScreen resource buttons/layout (mobile label wrapping)

- ⚠️ Potential regression confirmed by code inspection:
  - `.live-card`/`.live-section` set `overflow-wrap: anywhere`, and resource button style also sets `overflowWrap: "anywhere"`.
  - This allows arbitrary word breaks (e.g., “Rerolls” may split into `Re rol ls`) on narrow widths.
- Minimal fix suggestion:
  - Remove `overflowWrap: "anywhere"` from resource action buttons and use `whiteSpace: "nowrap"` (or `overflowWrap: "normal"`) for those labels only.

---

## Checklist table (Requirement / Status / Evidence / Fix suggestion)

| Requirement | Status | Evidence (file + line) | Fix suggestion |
|---|---|---|---|
| A1 Last 6 merged PRs listed | OK | Merge commits in history: `66a6aa0`, `9cdc601`, `ae74fcf`, `e626fe8`, `4635c56`, `10b5f0d` | None |
| A2 Diff-based summaries | OK | `git show --stat` per merge commit (local audit commands) | None |
| B3 PR->main CI trigger exists | OK | `.github/workflows/ci.yml` line 4-5 | None |
| B3 `npm ci` and `npm run build` run | OK | `.github/workflows/ci.yml` line 19-20 | None |
| B3 Unit tests run when present | OK (mechanically), BROKEN (substance) | `.github/workflows/ci.yml` line 21 + `package.json` test script | Add real unit test stack/specs |
| B3 Playwright install step in CI | MISSING | `.github/workflows/ci.yml` (no install step) | Add `npx playwright install --with-deps` before e2e |
| B3 e2e run in CI | OK (mechanically), BROKEN (substance) | `.github/workflows/ci.yml` line 22 + placeholder script in `package.json` | Add `@playwright/test` + real specs |
| B4 Required checks match job names | MISSING (verification) | Job name `build` in `.github/workflows/ci.yml` line 8 | Verify branch protection required check equals `build` |
| C5 vitest/jsdom/testing-library deps | MISSING | `package.json` devDependencies | Add deps in follow-up test PR |
| C5 `@playwright/test` dep | MISSING | `package.json` devDependencies | Add dep in follow-up test PR |
| C5 scripts `test:unit`, `test:e2e` | BROKEN (placeholder only) | `package.json` scripts | Replace echo scripts with real runners |
| C6 at least one unit + one e2e spec | MISSING | Repo file scan (no test files/specs found) | Add minimal smoke specs |
| C7 local build runnable | OK | Local command run `npm run build` passed | None |
| D8 kickoff event + drive logic + gating | OK | `src/domain/events.ts`, `src/domain/drives.ts`, `src/ui/screens/LiveMatchScreen.tsx` | None |
| D9 no dice input; dropdown lists BB2025 events + roll | OK | `src/ui/screens/LiveMatchScreen.tsx`, `src/rules/bb2025/kickoff.ts` | None |
| D10 single BB2025 rules module used | MISSING/PARTIAL | `src/rules/bb2025/*` plus legacy kickoff list in `src/domain/enums.ts` | Consolidate kickoff source of truth |
| D10 base SPP constants | OK | `src/export/spp.ts` | None |
| D10 casualty SPP constraints | PARTIAL | `src/export/spp.ts` line handling injury+causer | Optionally enforce stricter BB2025 casualty conditions |
| D11 export UX actions | OK | `src/ui/screens/LiveMatchScreen.tsx` export modals/buttons | None |
| D11 TXT single file (timeline+stats content together) | OK | `src/export/report.ts` `buildTxtReport` single returned string | None |
| D11 PDF non-monospace + includes SPP | OK | `src/export/report.ts` Helvetica + SPP section included in txt->pdf | None |
| D12 prayer outcome stored key+label and shown explicitly | MISSING/PARTIAL | `src/ui/screens/MatchStartScreen.tsx` stores prayer in `detail`; no mapping module under `src/rules/bb2025` | Add BB2025 prayer map (key+label) + explicit report rendering |
| E13 resource labels don’t break vertically | BROKEN risk | `src/index.css` + resource button style in `src/ui/screens/LiveMatchScreen.tsx` uses `overflowWrap:anywhere` | Set nowrap/normal wrapping for those labels |

---

## Recommended minimal follow-up PRs

1. **PR: “Real test baseline + CI e2e browser install”**
   - Add minimal unit test stack (`vitest`, `jsdom`, testing-library) + one smoke unit spec.
   - Add minimal Playwright config + one smoke e2e spec.
   - Replace placeholder test scripts with real runners.
   - Update CI to run `npx playwright install --with-deps` before e2e.

2. **PR: “BB2025 rules source-of-truth cleanup (kickoff + prayers)”**
   - Consolidate kickoff mapping to one BB2025 module used everywhere.
   - Introduce BB2025 prayers mapping (`key` + display `label`) and store structured prayer outcome.
   - Surface structured prayer outcome in report/export (not only raw payload JSON).

3. **PR: “Mobile resource label wrap hotfix”**
   - Apply `white-space: nowrap` (or `overflow-wrap: normal`) to resource buttons only.

