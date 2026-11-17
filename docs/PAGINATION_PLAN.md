# Shared Pagination Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans task-by-task, sequentially as requested.

**Goal:** Replace existing public/admin paging with the approved red numbered control.
**Architecture:** Standalone presentational Angular component with zero-based page input/output.
Parents retain all data fetching, URL, permissions and loading state.
**Tech Stack:** Existing Angular, CSS and Vitest; no new dependency.
**Spec:** [PAGINATION_SPEC.md](PAGINATION_SPEC.md), approved17/11.

## Global Constraints

- Red uses existing --red; selected text white; touch targets at least44px.
- Desktop7/mobile5 number/gap slots, no horizontal overflow at320px.
- Preserve filters, URL, page size, auth, loading/error and SSR.
- Zero results hide navigation; one page shows1 with disabled arrows.
- Sequential execution in current checkout on codex/shared-pagination from dev.
- User explicitly requests both existing hero banner deletions in final commit.

## Review Focus

- Very large page counts must use constant space, not create an array per page.
- Responsive variants must not expose duplicate controls to keyboard/screen reader.
- Public pagination must preserve applied filters rather than apply draft age changes.
- Busy/mutation state in auxiliary dialogs must block number clicks too.
- Nested form controls must be type=button and not accidentally submit edits.

### Task 1: Shared accessible component

**Files:** Create `code/frontend/src/app/shared/pagination/pagination.{ts,html,scss,spec.ts}`.
**Interfaces:** `Pagination`: inputs page:number(0), totalPages:number(0), disabled:boolean(false),
label:string('Phân trang'); output pageChange:number, zero-based.
Internal pure `pageTokens(page:number,totalPages:number,slots:5|7):(number|'gap')[]`.

- [ ] Write tests for literal desktop/mobile start/middle/end, no missing single
  page,0/1pages, huge counts, and real control emits/disabled/current/ARIA.
- [ ] Run `npm test -- --include='src/app/shared/pagination/*.spec.ts'` in frontend;
  expected RED missing component; implement bounded tokens and semantic buttons.
- [ ] Run same focused tests; expected PASS, then frontend suite; expected PASS.
- [ ] Commit component and handoff docs; use task-done with full frontend suite.

### Task 2: Integrate all existing pagination

**Files:** CataloguePage; BookList including trash; BookAuditPanel; BookEditor queue;
CustomerList; OrderList; CustomerOrderHistory; OrderDetail customer lookup;
OrderItemForm catalogue lookup, their templates/styles/specs.
**Interfaces:** Consume Task1 inputs/output; call existing search/load/navigate functions.

- [ ] Add integration tests clicking numbered public/admin controls and preserving
  applied filters/page index; audit and lookup loading blocks further requests.
- [ ] Run focused affected specs, expected RED absent numbered controls.
- [ ] Replace every old numbered-page toolbar; remove obsolete pager button styles.
  Public gets `changePage(page:number)` using applied filters; no draft filter apply.
  Dialogs pass their loading/locked/mutation flags to disabled.
- [ ] Run full `npm test`; expected PASS including existing suite and new regressions.
- [ ] Commit integration and checkpoint, task-done full frontend suite.

### Task 3: Build, browser verification and handoff

**Files:** DESIGN, VERIFICATION, README, PROGRESS, DEV_LOG; remove completed spec/plan.
**Interfaces:** End-user component across real route templates with QA API data.

- [ ] Run `npm run build`, `npm run build:workers`, `npm run check:workers:proxy`;
  expected exit0 without new warning/budget relaxation.
- [ ] Browser QA synthetic public/admin/auxiliary results, desktop/390/320px,
  light/dark, direct page/keyboard/Back and empty/one-page/loading states.
- [ ] Final independent whole-diff review; fix Important/Critical with RED→GREEN
  and rerun affected suite/builds; record any minor deferrals explicitly.
- [ ] Merge contract/evidence into canonical docs, verify links/line limits and
  diff-check; commit including both user-authorized banner deletions.
- [ ] Integrate/push dev per AGENTS; do not merge main or deploy. Remove only
  this plan's scratch workspace after preserving evidence and recording rulings.
