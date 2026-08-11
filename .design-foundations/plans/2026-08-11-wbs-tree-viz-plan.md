# Plan: WBS 계층 트리 다이어그램

**Status:** in-progress
**Started:** 2026-08-11 15:35
**Current Phase:** 1
**Track:** Quick (1 phase)
**Entry stage:** Design (DESIGN.md 파일 자체는 없지만, render.js의 색상/서페이스 토큰 — `--bg/--panel/--ink/--muted/--border/--accent/--code-bg/--grid-line` 등 — 은 이미 확정되어 있어 그 범위에 한해 locked로 간주. 단 타입 스케일(`--text-xs`…`--text-4xl`)과 기능색 램프(`--error/--success/--warning/--info-*`)는 토큰화돼 있지 않으므로 "DESIGN.md 전체가 locked"는 아님 — 이번 phase가 필요로 하는 색/서페이스 토큰만 재사용.
**JOURNEY.md 부재 확인:** JOURNEY.md도 없음 — workflow-conventions.md §2에 따라 wireframe mode로 진행, 이 갭을 명시적으로 플래그함. 트리 진입점(사이드바 탭 vs 기존 탭 내 토글) 배치는 정식 페이지 스펙 없이 mock 단계에서 wireframe로 결정.)

## Context

**Problem:** CodeSearch에 WBS 계층을 보여주는 두 개의 트리 다이어그램(공종 L5→L6, 시설 L1→L3)을 추가한다. 리스트 나열을 넘어 구조를 시각적으로 이해시키는 게 목적.

**Constraints:**
- 기존 CSS 커스텀 프로퍼티(`--accent`, `--panel`, `--border` 등) 그대로 재사용 — 새 색/토큰 발명 금지
- 정적 self-contained HTML/JS 유지 (새 런타임 의존성 추가 금지)
- L4/L7은 트리에서 제외 (데이터에 신뢰 가능한 부모 링크 없음)
- 공종 트리는 prefix-match로 검증된 437쌍만 사용, 나머지 5개(CEF/CEG/CEH/CEI/CEJ)는 별도 처리
- 다크모드 전용 검증/작업은 범위 밖 — 기존 토큰 재사용으로 자연히 따라오는 것 이상은 하지 않음 (사용자 확정)

**Success criteria:**
- 트리가 실제 데이터 관계만 반영 (가짜/추측 링크 없음)
- WCAG AA 대비 통과
- 기존 "도면 레이어" 미학과 이어지는 스타일 (범용 AI 차트 느낌 배제)
- 로컬 HTML/Artifact 양쪽에서 그대로 동작

---

### Phase 1: WBS 계층 트리 다이어그램
**Stage:** Design
**Model:** sonnet
**Doctrine:** data-viz, usability, content-design
**Gate:** Standard

**Goal:** 공종(L5→L6)·시설(L1→L3) 두 개의 실제 데이터 기반 트리 다이어그램을 추가해, 코드 검색 결과의 구조적 위치를 시각적으로 보여준다.

**Scope:**
- IN: 공종 트리(L5→L6, 437쌍 prefix-match + 5개 미분류 별도 표시), 시설 트리(L1→L2→L3, 9노드/8엣지), 기존 CSS 토큰 재사용, 진입점(사이드바 탭 또는 기존 코드서치 탭 내 토글 — `usability` 내비게이션 패턴 판단)
- OUT: L4/L7을 트리 노드로 표현, 다크모드 전용 별도 검증, 새 색상 팔레트 발명, 노드 클릭→검색 필터 연동(향후 확장 여지로만 남김)

**Constraints:** 정적 self-contained HTML/JS 유지, 기존 `--accent`/`--panel`/`--border`/`--code-bg`/`--grid-line` 등 토큰만 사용, 기존 "CAD 도면 레이어" 미학과 시각적으로 일관 (모노스페이스 코드, 배관도/회로도 느낌의 커넥터 라인 고려). L5→L6 prefix 규칙은 부속서-2 §3.8(수도분야 작업분류체계(WBS) 코드 생성, 항목 ⑤·⑥ — L5 문자 2자리를 L6 문자 3자리가 그대로 확장)에 근거한 것으로 명시 — 단순 문자열 우연 일치가 아니라 공식 코드 구성 규칙의 결과. (render.js가 인용하는 §3.7은 L1~L7 조합 코드 표기 예시로, 개별 레벨 코드 생성 규칙과는 다른 절임 — 혼동 주의.)

**Edge cases:**
- CEF/CEG/CEH/CEI/CEJ(L5 미매칭 L6 5개)는 "미분류" 그룹으로 별도 표시, 조용히 누락시키지 않음. 원인은 원본 시트에 L5 "CE" 마스터 행 자체가 누락된 것으로 추정 — 트리 UI에 그 추정을 각주로 남김
- 데이터 로드 실패/빈 배열 시 트리 대신 안내 문구 표시 (전체 페이지 깨짐 방지) — 문구는 `content-design` 빈 상태 카피 원칙 적용
- 노드 수가 많은 L6(442개) 트리는 스크롤/축소 가능한 레이아웃 필요 (한 화면에 욱여넣지 않음)

**Produces:** 트리 다이어그램 컴포넌트 스펙 (mock 단계에서 렌더링해 실제 픽셀로 검증)
**Depends on:** research doc (`.design-foundations/research/2026-08-11-wbs-tree-viz.md`) | **Unlocks:** mock

**Done when:**
- [ ] DW-1.1: 트리 아티팩트에 부속서-2 §3.8 prefix 규칙 기준 437쌍 외의 엣지가 0건 (소스 데이터에 없는 관계 표시 안 함), 미매칭 5개는 "미분류"로 명시적 표시 (data-viz truthful-encoding 원칙 적용)
- [ ] DW-1.2: 트리 아티팩트의 L1→L2→L3 엣지 8개가 search-index.json 실제 코드와 1:1 일치 (data-viz truthful-encoding 원칙 적용)
- [ ] DW-1.3: 트리에 사용된 모든 색상이 기존 CSS 커스텀 프로퍼티 토큰에서만 나옴 (하드코딩 hex 없음)
- [ ] DW-1.4: 텍스트/배경 대비가 WCAG AA 통과
- [ ] DW-1.5: 정적 HTML 산출물(index.html, artifact.html)이 새 런타임 의존성 없이 그대로 열림

---

## Verification plan
- DW-1.1: 렌더링된 트리의 모든 엣지를 코드로 순회해 실제 prefix-match 결과와 diff (0건이어야 함)
- DW-1.2: L1→L2→L3 엣지 8개가 search-index.json의 실제 코드와 1:1 일치하는지 확인
- DW-1.3: 렌더링된 HTML에서 `#`으로 시작하는 하드코딩 색상값이 트리 관련 요소에 없는지 grep
- DW-1.4: 라이트/다크 각 배경-텍스트 조합 대비비 계산 (라이트는 필수, 다크는 참고용)
- DW-1.5: Playwright로 index.html/artifact.html 로드 후 콘솔 에러 0건 확인
- Dirty case: L6 데이터가 0건일 때 → "미분류"만 표시하지 않고 빈 상태 안내 문구가 뜨는지 확인
