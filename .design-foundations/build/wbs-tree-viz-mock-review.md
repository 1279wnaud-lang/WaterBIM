# Design Review: WBS Tree Diagram Mock

## Rendered Evidence (Step 0)
- Screenshot: `C:\Pruden_KH\CodeSearch\.design-foundations\build\wbs-tree-viz-mock.png`
- HTML source: `C:\Pruden_KH\CodeSearch\.design-foundations\build\wbs-tree-viz-mock.html`
- Surface: single static page, two stacked tree-diagram panels — "공종 분류 (LV5 → LV6)" (discipline hierarchy, 3 sample Lv5 parents + a flagged 미분류/unclassified group) and "시설 분류 (LV1 → LV2 → LV3)" (facility hierarchy, full S → F00/F14 → six Lv3 leaves).

## Assessment B — Deterministic Detector
- Command: `node C:/Pruden_KH/design-for-ai-main/scripts/detect.mjs "C:\Pruden_KH\CodeSearch\.design-foundations\build\wbs-tree-viz-mock.html" > C:\Pruden_KH\CodeSearch\.design-foundations\build\detect.json`
- Exit: 0 (ran)
- Findings: 34 total — `nested-cards` ×32, `hero-eyebrow-chip` ×1, `em-dash-overuse` ×1 (5 em-dashes)
- Opened only after Assessment A findings were frozen: YES

## Triage
- Baseline (always-on): visual (design-dna, checklists/ai-tells, distinctiveness) + usability
- Dispatched: `data-viz` — the surface's entire content is a structured hierarchy/tree encoding of coded data, so labeling accuracy and encoding clarity are in scope.
- Not applicable: `content-design` (no real product copy beyond a short intro/captions — folded into the visual/data-viz findings below instead of a separate pillar pass), `journey` (single static page, no multi-step flow), `behavioral`/`deceptive-patterns` (not a persuasion/conversion surface).
- Deferred: none — surface is small enough to review in full.

## Cross-Pillar Findings (ONE ranked report)

| Severity | Pillar | Problem | Principle | Fix |
|----------|--------|---------|-----------|-----|
| Major | data-viz | The facility panel's header caption reads "전체 7노드, search-index.json과 1:1 일치" (total 7 nodes, 1:1 match with search-index.json). Independently counting both `data/search-index.json` (`WBS-Lv1`×1 + `WBS-Lv2`×2 + `WBS-Lv3`×6 = 9) and the nodes actually rendered in the mock's own facility tree (S, F00, F14, 1, 1411, 1421, 1431, 1441, 1451 = 9) shows the true count is 9, not 7. The label asserts a verified 1:1 match that is false by inspection. | Nielsen #1 — match between system and real world; a displayed count claiming verification must be verifiable | Recompute the node count from `search-index.json` at render time rather than hand-typing it, or correct the caption to "전체 9노드" |
| Minor | copy (detector: `em-dash-overuse`) | Detector evidence: "5 em-dashes in body copy." Confirmed in source — the intro subhead, the 미분류 count label, the 미분류 note, and the scale-note each lean on an em-dash for a parenthetical aside (e.g. "새 뷰 — 공종(工種)과 시설(施設)은…", "Lv6 5개 — Lv5 부모 코드…"). | ai-tells.md — em-dash overuse as an LLM-authorship tell | Vary the punctuation: swap one or two of the four/five em-dashes for a period, colon, or parenthetical |
| Minor / Note | layout (detector: `nested-cards`) | Detector evidence (representative): "`<div class=\"node parent\">` is a card inside a card ancestor" (×32 across both trees). Register-justified: the actual rendered pixels show flat, low-chrome "code chip" elements (left-border accent, `code-bg` fill, no box-shadow) nested inside a single bordered `.section-panel` — a structurally necessary pattern for representing hierarchy levels in a tree diagram, not the visually noisy stacked-shadow "card-itis" this rule is designed to catch. Kept as a row for visibility given the volume, but not treated as a defect in the rendered pixels. | ai-tells.md `nested-cards` (checked against the screenshot, not just the DOM) | No action needed if the flat-chip treatment is intentional; if the detector's false-positive rate on tree-node chips becomes a recurring pattern across mocks, consider carving out an exception for `.node` elements in the rule |
| Minor / Note | visual (detector: `hero-eyebrow-chip`) | Detector evidence: "eyebrow \"K-water\" above `<h1>` \"WBS 계층 트리 다이어그램\"." Register-justified: this is a real internal tool built for K-water (Korea's national water resources corporation); naming the owning organization as a small eyebrow above the page title is a defensible, low-risk convention for an internal engineering dashboard, not a generic decorative flourish. | ai-tells.md `hero-eyebrow-chip` | No action needed |
| Minor | visual/accessibility | The `--accent` (#0E7C86) eyebrow text ("K-water", 11px bold uppercase) sits on the header, whose background is `color-mix(panel 92%, transparent)` over the page's grid/`--bg`. Computed against the raw `--accent`/`--bg` token pair the contrast is 4.34:1 — just under the 4.5:1 WCAG AA floor for text below the large-text cutoff (11px bold does not qualify for the 3:1 large-text exemption). The panel tint raises the *effective* rendered contrast toward the `--accent`/`--panel` pairing (4.95:1, passing), so this is likely a non-issue in practice, but it was not independently re-measured against the true composited pixel color. | WCAG 2.1 SC 1.4.3 (contrast minimum) | Confirm the composited eyebrow contrast with a pixel-sampled check, or bump `--accent` slightly darker to clear 4.5:1 against `--bg` outright |

## Requirement Fulfillment

### DW-MOCK.1
PREMISE: "the mock renders a viewable surface showing two tree diagrams (a 공종/discipline hierarchy and a 시설/facility hierarchy) with real, non-fabricated codes/names — no invented data."
EVIDENCE: The rendered surface shows two clearly separated, labeled section panels — "공종 분류 (LV5 → LV6)" and "시설 분류 (LV1 → LV2 → LV3)" — each containing a tree diagram. Every code/name pair rendered in both trees was cross-checked against `C:\Pruden_KH\CodeSearch\data\search-index.json` by exact `code` field match: CA/공통공사, CAB/가설건물, CAA/임시시설, CAF/지장물보호시설, CAG/비계및동바리, CAH/반력벽, AF/조적공사(건축), AFA/벽돌공사, AFB/블럭공사, AFC/경량콘크리트판, AFD/조적부대공사, MB/배관공(기계), MBA–MBE, the 미분류 group CEF/CEG/CEH/CEI/CEJ (and CE's absence from the source, matching the mock's own "CE가 소스 데이터에 없음" claim), S/수도분야, F00/공통시설, F14/상수도시설, and the Lv3 leaves 1/공통시설, 1411/취수시설, 1421/도수시설, 1431/정수시설, 1441/송수시설, 1451/급배수시설 — every single pair matched an existing `WBS-Lv1`/`Lv2`/`Lv3`/`Lv5`/`공종(Lv6)` record exactly. No invented code or name was found. The mock's stated aggregate counts (67 Lv5 parents / 442 Lv6 children) were also independently verified against the source and are correct.
VERDICT: PASS

### DW-MOCK.2
PREMISE: "text/interactive contrast and applied tokens hold on the rendered pixels — colors should read as a deliberate, cohesive system (CSS custom-property tokens), not ad-hoc/inconsistent hex values."
EVIDENCE: A grep for hex-literal colors in the HTML found raw hex values ONLY inside the single `:root` token declaration block (lines 10–12); every other color reference in the stylesheet resolves through `var(--token)` or `color-mix()` built from those same tokens — no ad-hoc/inconsistent hex values appear anywhere else in the file. Computed WCAG contrast ratios for the token pairings actually used for text: ink/bg 14.24:1, ink/panel 16.22:1, ink/code-bg 13.26:1, muted/bg 4.94:1, muted/panel 5.63:1, muted/code-bg 4.60:1, accent/panel 4.95:1, accent-ink/accent 4.95:1, mark-ink/mark-bg 10.44:1 — all clear WCAG AA (4.5:1) at the sizes used. One borderline pairing (accent/bg = 4.34:1, used only for the translucent-header eyebrow) is flagged above as a Minor accessibility note, not a violation of this requirement's stated bar.
VERDICT: PASS

**All requirements met:** YES

## Notes (non-blocking)
- The "전체 7노드" caption inaccuracy (Major finding above) does not invalidate DW-MOCK.1 — the codes/names themselves are all real and traced to source — but it is a trust-eroding error on a surface whose entire purpose is to prove data fidelity, and should be fixed before this mock graduates past throwaway-fidelity.
- Distinctiveness check (ai-tells.md CHECKER mode): the surface has a nameable aesthetic direction — "engineering blueprint / spec-sheet," built from a graph-paper grid background, monospace code chips, a moss-teal + mustard-yellow token palette (not the generic purple/blue AI-gradient default), and orthogonal elbow tree-connectors. This is a deliberate choice a generic system would not default to; distinctiveness passes.
- Both trees' scope-limiting disclosures (footer: "L4/L7은 신뢰 가능한 부모 링크가 없어 트리에서 제외"; scale-note: "이 mock은 패턴 검증용 샘플") are transparent about sampling and exclusions rather than silently truncating data — a good practice worth carrying into the full build.

## Verdict: PASS
