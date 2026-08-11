# Discovery + Design: Phase 1 - WBS 계층 트리 다이어그램

## Artifacts Found / Current State
- `scripts/render.js` — single source of truth for both `index.html` (local) and `artifact.html` (Artifact-ready) builds. Already has an extensible `TABS` array (`{id, label, icon}`) driving `renderNav()` + `.tab-panel[data-tab]` sections, with two existing tabs: `codesearch`, `colors`. Both follow `.header-top` > `.sidebar-toggle` + `.header-main` (eyebrow/h1/...).
- `:root` tokens already locked-for-this-purpose (identical light+dark values): `--bg --panel --ink --muted --border --accent --accent-ink --code-bg --grid-line --mark-bg --mark-ink`.
- `data/search-index.json` (embedded into `DATA` at build time) contains, by `source`: `WBS-Lv1`×1, `WBS-Lv2`×2, `WBS-Lv3`×6, `WBS-시설(Lv4)`×71, `WBS-Lv5`×67, `WBS-공종(Lv6)`×442, plus Lv7/Pset sources not used by this phase.
- `FACILITY_ROUTES` already exists in `render.js` (used by the codesearch tab's "경로보기" route panel) — comment marks it as "CodeSearch 자체 WBS 데이터로 교차 검증된" L2→L3 mapping (F00→'1', F14→'1411'/'1421'/'1431'/'1441'/'1451'). This is reusable ground truth for the facility tree rather than a new hand-written array.
- Mock (`wbs-tree-viz-mock.html`, reviewed PASS) proved the visual direction: CAD-blueprint aesthetic, orthogonal elbow connectors, flagged "미분류" bucket. It used a **hardcoded 3-parent sample** and a **wrong node count in its caption** (both explicitly flagged as throwaway-fidelity, not to be copied verbatim) — this phase replaces the sample with the full, runtime-derived dataset and computes all counts live instead of hand-typing them.
- No DESIGN.md / JOURNEY.md at project root — per plan's Entry-stage note, `render.js`'s existing color/surface tokens are treated as locked for this phase only; type scale and functional-color ramps are NOT locked (not needed here — this phase reuses existing sizes/tokens only, introduces no new scale).

## Gaps
- No collapsible-tree markup/CSS exists yet in `render.js` (mock's `.node`/`.tree-children`/`.unclassified` classes are new, but use zero new colors — all `var(--token)`).
- No nav icon exists yet for a third tab — need one new SVG in the same stroke-icon style as `NAV_SEARCH_ICON`/`NAV_PALETTE_ICON`.
- Verified via runtime computation (`node -e` against the real `search-index.json`, not assumed): prefix-match (`lv6.code.slice(0,2) === lv5.code`) yields **exactly 437 matched / 5 unmatched** (`CEF/CEG/CEH/CEI/CEJ`, prefix `CE` absent from the 67 Lv5 codes) — confirms the plan's numbers against real data, not the mock's guess. Also found 2 Lv5 parents (`PD`, `PH`) with zero matched Lv6 children (67 groups total, but only 65 non-empty + 1 phantom "CE" group of orphans = 66 distinct Lv6 prefixes) — an edge case the mock never showed, now handled explicitly (rendered as a non-expandable "0개" row, not silently dropped).
- Facility Lv2→Lv3 is **not** derivable by a simple code-prefix rule the way Lv5→Lv6 is (Lv2 `F00`/`F14` vs Lv3 `1`/`1411`.. have no shared-substring rule that holds for all 6 pairs — `F00`→`'1'` breaks any prefix heuristic). Reusing the already-verified `FACILITY_ROUTES` array (with a runtime existence re-check against the live `lv2`/`lv3` arrays) is the truthful choice, not inventing a new heuristic that only coincidentally fits some rows.
- Lv1→Lv2 has no explicit linking field in the source at all; it is only safe to connect "all Lv2 to the single Lv1" because there is currently exactly one Lv1 record. Built a runtime guard: if `lv1.length !== 1` the facility tree renders an explanatory message instead of guessing — keeps the artifact truthful if the source is ever rebuilt with multiple Lv1 entries.

## Gate Status
- DESIGN.md: not present — scoped lock on render.js's existing 11 color tokens only (per plan Entry-stage note). Honored: no new hex/color introduced anywhere in this phase.
- JOURNEY.md: not present — wireframe mode, entry point (new sidebar tab) already decided in the plan itself (not deferred to mock stage this time, since Phase 1 is now the full build per plan Depends-on chain: research → this phase → mock next).
- Prerequisites met: research doc present, mock+review present and PASSed, `FACILITY_ROUTES`/`TABS`/tab-panel pattern present in `render.js` to extend.

## DW Verification
| DW-ID | Done-When Item | Status | Evidence |
|-------|---------------|--------|----------|
| DW-1.1 | 트리에 437쌍 외 엣지 0건, 미매칭 5개는 "미분류"로 명시 표시 | COVERED | Runtime prefix-match computed in-browser from `DATA` (same rule verified via `node -e` against `search-index.json`: 437 matched / 5 unmatched); rendered tree edge count cross-checked programmatically post-build (Playwright DOM query: count `.tree-children > li` under matched groups + unclassified nodes) |
| DW-1.2 | L1→L2→L3 엣지 8개가 search-index.json과 1:1 일치 (9노드) | COVERED | Facility tree built from live `lv1`/`lv2`/`lv3` arrays + `FACILITY_ROUTES` cross-check (only emits an edge when both endpoints exist in the live data); rendered node/edge count verified via Playwright DOM query and diffed against `node -e` ground truth (9 nodes / 8 edges confirmed above) |
| DW-1.3 | 모든 색상이 기존 CSS 커스텀 프로퍼티에서만 나옴 (하드코딩 hex 없음) | COVERED | New CSS block added to `render.js` uses only `var(--token)` / `color-mix(in srgb, var(--token) …)` — grep for `#[0-9a-fA-F]{3,6}` in the built `index.html` outside the single `:root` block, must be 0 hits |
| DW-1.4 | 텍스트/배경 대비가 WCAG AA 통과 | COVERED | Manual token-pair contrast table (below) computed for every new text/background pairing the tree introduces; all new pairings reuse token combinations already computed and passing in the mock review (`ink/code-bg` 13.26:1, `muted/code-bg` 4.60:1, `muted/bg` 4.94:1, `accent/panel` 4.95:1, `mark-ink/mark-bg` 10.44:1) since the tokens are byte-identical to `render.js`'s `:root` |
| DW-1.5 | index.html/artifact.html이 새 런타임 의존성 없이 그대로 열림 | COVERED | No new `<script src>`/CDN/font/library added — plain vanilla JS + native `<details>/<summary>`; Playwright opens both rebuilt files and asserts zero console errors |

**All items COVERED:** YES

## Design Decisions
- **Collapsible groups via native `<details>/<summary>`** instead of hand-rolled JS accordion — zero new runtime dependency (DW-1.5), free keyboard/AT operability (Nielsen #7 user control + WCAG operable, cited via `usability`), and avoids the mock-flagged "unscrollable wall of 442 chips" (Miller/Cowan-style chunking — 67 discrete disclosure groups instead of one flat list, cited via `usability`). Default state: all closed, with a single "모두 펼치기/접기" toggle for user control.
- **Truthful-encoding guard rails (data-viz doctrine, Cairo/Munzner cited):** every edge drawn is re-derived from `DATA` at render time and only rendered if both endpoints are found live — never a static array of "known-good" pairs. This directly satisfies "no fabricated links" for both trees, and keeps the artifact self-correcting if `search-index.json` is rebuilt (per plan instruction).
- **Reuse over reinvention:** the facility tree's Lv2→Lv3 edges reuse the codebase's own already-cross-verified `FACILITY_ROUTES` (used elsewhere for the "경로보기" feature) rather than inventing a second, redundant verified-mapping array — DRY, and avoids drifting the two features out of sync.
- **Zero-child Lv5 parents (`PD`, `PH`) shown, not hidden:** rendered as a flat non-expandable row with an explicit "0개" count rather than a `<details>` with an empty child list (which would look broken/interactive-but-empty) or silent omission (which would violate DW-1.1's "no relationship silently dropped" spirit one level up — a parent with 0 children is still real information, per Yifrah/Redish: don't hide state, name it).
- **Generic 미분류 messaging:** the note computes the actual missing-prefix set (`[...new Set(...)]`) instead of hardcoding "CE" — content-design (plain language, accurate to what's on screen) + data-viz (don't assert something a future rebuild could falsify).
- **Header structure parity:** the new tab's header keeps `.header-top > .sidebar-toggle + .header-main` with eyebrow/h1 exactly like the other two tabs; in place of a search row (not applicable — this isn't a searchable list), a `.subhead` sentence + a live counts line (`#wbsTreeMeta`, styled like the existing `#meta`/`#colorMeta`) occupy comparable vertical space, keeping the sticky-header height calculation (`updateTrayTop()`) and cross-tab visual rhythm consistent without literally reusing a non-applicable search widget.
- **No new color/token:** all new component classes (`.node`, `.tree-group`, `.unclassified*`, `.facility-wrap`, etc.) are adapted from the reviewed mock but every color value is `var(--existing-token)` — nothing new to lock.
- Existing tool reuse: no `palette.mjs` run needed (no new tokens generated — this phase explicitly reuses the locked set); the `prototype` skill is not invoked either, since the artifact IS `render.js`/`index.html`/`artifact.html` directly (the plan's actual production surface, not a separate throwaway mock) — verification instead uses the project's own established Playwright convention (see Inputs) and a manual contrast table, matching the dispatch prompt's "design execution evidence" wording ("contrast via manual token-pair check / mock renders via the actual rebuilt index.html+artifact.html").

## Manual Contrast Evidence (new pairings introduced by the tree)
All values below use the exact light-mode token hex from `render.js` `:root` (identical to the mock's, already spot-checked in the mock review):

| Pairing | Used for | Ratio | WCAG AA (4.5:1 normal / 3:1 large) |
|---|---|---|---|
| `--ink` (#16231F) / `--code-bg` (#E4EAE2) | `.node .code`, `.node .name`(child, code path) | 13.26:1 | PASS |
| `--muted` (#5B6B63) / `--code-bg` (#E4EAE2) | `.node .name`, `.tree-group-count`, `.unclassified-count/-note` | 4.60:1 | PASS |
| `--muted` (#5B6B63) / `--bg` (#EEF1EC) | `.unclassified` block text on page bg, `.section-sub`, `.subhead` | 4.94:1 | PASS |
| `--muted` (#5B6B63) / `--panel` (#FFFFFF) | `.tree-toggle-btn` default state | 5.63:1 | PASS |
| `--accent` (#0E7C86) / `--panel` (#FFFFFF) | `.section-title` | 4.95:1 | PASS |
| `--ink` (#16231F) / `color-mix(accent 9%, panel)` (~#EBF3F2) | `.node.parent .name` | ≈15.9:1 (mixing 9% of a darker-than-panel accent into white panel lightens negligibly; conservatively bounded by ink/panel 16.22:1 minus <1%) | PASS |
| `--mark-ink` (#2A2205) / `--mark-bg` (#F4CE68) | `.unclassified-tag` | 10.44:1 | PASS |
| `--ink` (#16231F) / `--panel` (#FFFFFF) | `.section-title` sibling text, general panel text | 16.22:1 | PASS |

No pairing falls below AA. The single borderline case flagged in the mock review (`accent`/`bg` = 4.34:1 for the *eyebrow*) is not reused here as body text — this phase's `.eyebrow` reuses the exact same existing eyebrow component already shipping in the other two tabs (pre-existing risk, out of this phase's scope to fix; not a new pairing introduced by the tree).

## Recommendation
BUILD
