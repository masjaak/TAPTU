# DESIGN_WORKFLOW_TAPTU.md

Design specification for the Taptu landing page workflow section.
This document drives the next implementation phase.
No code is included here — only design intent, layout, copy, and animation rules.

---

## Product Boundary

Taptu is an **Attendance Validation OS**.

| In scope | Out of scope |
|---|---|
| Check-in, validation, approval, HR reporting | Full HRIS |
| Payroll Input Readiness (export-ready data) | Full payroll processing |
| Role-based access: Superadmin → HR → Manager → Employee → Scanner | Recruitment, performance, training |

The workflow section must reinforce validation, approval, and HR-ready reporting — not payroll.

---

## Section Identity

**Section anchor:** `#workflow`

**Heading:** Bagaimana Taptu bekerja

**Subtitle:**
> Dari setup workspace, validasi absensi, sampai laporan HR-ready yang siap dipakai untuk keputusan operasional.

**Section label chip:** `Workflow` (matches existing SectionLabel component style)

**Background:** dark navy `#101217` (matches existing section)

---

## The 8-Step Journey

These are the steps the workflow diagram must explain. Copy is final.

| # | Title | Description | Status Chip |
|---|---|---|---|
| 01 | Buat Workspace | Superadmin membuat workspace pertama untuk perusahaan. | Superadmin |
| 02 | Setup Organisasi | Atur lokasi kerja, shift, divisi, dan aturan validasi. | Setup |
| 03 | Tambah Admin HR | HR/Admin disiapkan untuk memantau absensi, approval, dan laporan. | HR/Admin |
| 04 | Tambah Manager | Manager hanya melihat tim yang berada dalam supervisinya. | Manager |
| 05 | Tambah Karyawan | Karyawan ditetapkan ke divisi, manager, shift, dan lokasi kerja. | Employee |
| 06 | Check-in Karyawan | Karyawan check-in melalui mobile, QR, selfie, atau scanner. | Check-in |
| 07 | Validasi & Review | Taptu memeriksa waktu, lokasi, perangkat, QR/scanner, dan selfie proof. Data bermasalah masuk antrean review. | Needs Review |
| 08 | Laporan HR-Ready | HR memberi keputusan final. Data bersih siap untuk laporan dan Payroll Input Readiness. | HR Ready |

**Phase grouping (visual, not interaction):**

- Phase A — Setup Workspace: steps 01–05
- Phase B — Validation Flow: steps 06–08

---

## Layout Specification

### Desktop (`lg:` and above, ≥ 1024px)

**Two-lane layout:**

```
┌─────────────────────────────────┬─────────────────────────┐
│  SETUP WORKSPACE                │  VALIDATION FLOW        │
│                                 │                         │
│  [01] ──→ [02]                  │  [06] ──→ [07] ──→ [08] │
│    ↓                            │                         │
│  [03] ──→ [04] ──→ [05] ────────┤→ (enters validation)   │
│                                 │                         │
└─────────────────────────────────┴─────────────────────────┘

[Active Step Detail Panel — full width below diagram]

[● ● ● ● ● ● ● ●]  ← 8 progress dots
```

OR alternatively, a serpentine layout (current preference):

```
[01] ──→ [02] ──→ [03] ──→ [04]
                               ↓
[08] ←── [07] ←── [06] ←── [05]

[Active Step Detail Panel]
[● ● ● ● ● ● ● ●]
```

**Preference:** The serpentine (snake) layout is preferred. It shows clear forward progression in row 1, then continuation in row 2 after the zig-zag connector. Step 04 and step 05 are vertically adjacent, which visually separates "setup complete" from "daily operation begins."

**Row 1:** steps 01 → 02 → 03 → 04 (left to right)
**Zig-zag:** vertical connector from step 04 (bottom-right of row 1) down to step 05 (top-right of row 2)
**Row 2:** steps 05 → 06 → 07 → 08 (displayed right to left, so 05 sits directly under 04)

**Card sizing:** Equal-width flex cards. 4 per row. Cards should not feel cramped — use `p-5 lg:p-6` minimum.

**Connector sizing:** `w-8 lg:w-10` for horizontal connectors. This gives enough space for the traveling dot animation.

### Mobile (below `lg:`)

**Vertical timeline layout:**

```
●  [01 Buat Workspace]
│
●  [02 Setup Organisasi]
│
●  [03 Tambah Admin HR]
│
...
●  [08 Laporan HR-Ready]

[Active Step Detail Panel]
[● ● ● ● ● ● ● ●]
```

- Spine line on the left
- Each step has a dot node that fills blue when active or passed
- The spine segment between steps fills with a grow animation as the step becomes active
- No horizontal overflow

---

## Visual Language

### Color palette (dark section)

| Element | Value |
|---|---|
| Section background | `#101217` |
| Card inactive background | `rgba(255,255,255,0.06)` |
| Card inactive border | `rgba(255,255,255,0.10)` |
| Card active background | `rgba(23,105,255,0.14)` |
| Card active border | `rgba(23,105,255,0.55)` |
| Active card glow | `0 0 28px rgba(23,105,255,0.22)` |
| Connector track | `rgba(255,255,255,0.15)` |
| Connector active fill | `rgba(23,105,255,0.65)` |
| Traveling dot | `#1769ff` with `0 0 7px rgba(23,105,255,0.9)` |
| Blue accent | `#1769ff` |
| Number badge active | `bg-[#1769ff] text-white` |
| Number badge inactive | `bg-white/10 text-white/40` |
| Body text active | `text-white` |
| Body text inactive | `text-white/60` |

### Status chip colors per phase

| Chip | Active state |
|---|---|
| Superadmin | `bg-[#4c1d95]/50 text-[#c4b5fd]` |
| Setup | `bg-[#1e3a5f]/70 text-[#93c5fd]` |
| HR/Admin | `bg-[#164e63]/70 text-[#67e8f9]` |
| Manager | `bg-[#1e3a5f]/70 text-[#93c5fd]` |
| Employee | `bg-white/15 text-white/80` |
| Check-in | `bg-[#1769ff]/35 text-[#93b4ff]` |
| Needs Review | `bg-[#7c2d12]/50 text-[#fdba74]` |
| HR Ready | `bg-emerald-900/50 text-emerald-300` |
| Chip inactive | `bg-white/8 text-white/25` |

### Typography

| Element | Style |
|---|---|
| Step number badge | `text-xs font-black` |
| Step title | `text-[13px] lg:text-sm font-black leading-snug tracking-[-0.02em]` |
| Status chip | `text-[10px] font-bold tracking-wide` |
| Detail panel title | `text-base lg:text-lg font-black leading-tight` |
| Detail panel body | `text-sm lg:text-[15px] leading-7 lg:leading-8 text-white/55` |
| Detail panel counter | `text-xs font-bold tabular-nums text-white/25` |

### Spacing

| Element | Value |
|---|---|
| Card padding | `p-5 lg:p-6` |
| Number badge → title gap | `mt-4` |
| Title → chip gap | `mt-3` |
| Detail panel padding | `p-6 lg:p-7` |
| Panel icon → content gap | `gap-5` |
| Between diagram and panel | `mt-4` (part of `space-y-4`) |

### Rounded corners

| Element | Value |
|---|---|
| Step card | `rounded-[22px]` |
| Number badge | `rounded-[10px]` |
| Status chip | `rounded-full` |
| Detail panel | `rounded-[24px]` |
| Detail panel icon | `rounded-[16px]` |

---

## Animation Specification

### Auto-cycle

- **Duration per step:** 3200ms (3.2 seconds)
- **Loop:** infinite, resets to step 01 after step 08
- **State on load:** starts immediately at step 01

### Connector animation (on transition from step N to step N+1)

Three connector types:

**Horizontal right (row 1, 01→04):**
- Base track: `h-px` with `bg-white/15`
- Active fill: `h-0.5` grows via `scaleX 0→1` with `transformOrigin: "left center"` over 3.2s linear
- Lit fill (already passed): instant 100%, stays visible
- Dim: no fill shown
- Traveling dot: `h-2 w-2 rounded-full bg-[#1769ff]` with glow, moves `left: -4px → calc(100% - 4px)` over 3.2s linear
- Chevron: `ChevronRight` at the right end, blue when active/lit

**Vertical down (04→05, zig-zag):**
- Same fill logic with `scaleY 0→1` and `transformOrigin: "top center"`
- Traveling dot moves `top: -4px → calc(100% - 4px)`
- Chevron: `ChevronDown` at the bottom

**Horizontal left (row 2, 05→08, flex-row-reverse):**
- Fill grows via `scaleX 0→1` with `transformOrigin: "right center"` over 3.2s linear
- Traveling dot moves `right: -4px → calc(100% - 4px)` (right-to-left)
- Chevron: `ChevronLeft` at the left end

### Active card

- Border transitions to `border-[#1769ff]/55`
- Background transitions to `bg-[#1769ff]/14`
- Box shadow: `0 0 28px rgba(23,105,255,0.22)`
- Number badge fills to `bg-[#1769ff] text-white`
- Title brightens to `text-white`
- Status chip transitions to its active color
- Pulsing ring: `ring-1 ring-[#1769ff]/45`, opacity cycles `0.4→0.9→0.4` over 2.5s infinite

### Detail panel

- All 8 step contents are rendered in the DOM simultaneously (opacity toggle, not `AnimatePresence` removal)
- Inactive steps: `opacity-0 pointer-events-none absolute inset-0`
- Active step: `opacity-100 pointer-events-auto` (in normal flow)
- Transition: `duration-350`
- This ensures all step text (including "Payroll Input Readiness") is always discoverable by tests and screen readers

### Progress dots

- 8 `<button>` elements, `flex-1 h-1 rounded-full`
- Active: `bg-[#1769ff]`
- Inactive: `bg-white/20`
- Transition: `duration-500`
- `aria-label="Step N: {title}"` for screen reader and test access

### Interaction pause / resume

- Clicking any step card or progress dot pauses auto-cycle
- Auto-resumes after 5000ms of inactivity
- Uses `useRef<ReturnType<typeof setTimeout>>` for the resume timer

### Entrance animation

- Section uses `whileInView` with `{ once: true, margin: "-80px" }` via existing `stagger` and `fadeUp` variants
- After entrance, loop continues indefinitely

### Reduced motion

- Wrap section in existing `<MotionConfig reducedMotion="user" />` (already applied to full landing page)
- motion.dev respects this automatically — animations collapse to instant transitions

---

## Detail Panel Specification

The detail panel sits below the diagram, full width, auto-updating as `activeIndex` changes.

**Content per step:**
- Large number badge: `h-12 w-12 lg:h-14 lg:w-14 rounded-[16px] bg-[#1769ff]`
- Title: large, black
- Description: 1–2 sentences, muted white
- Status chip: matches card chip color
- Counter: `N / 8` top-right

**Panel border/background:** `border border-white/10 bg-white/[0.05] rounded-[24px]`

---

## Progress Dots Specification

Below the detail panel. 8 horizontal dots, full width, clickable.

```html
<button aria-label="Step 1: Buat Workspace" .../>
<button aria-label="Step 2: Setup Organisasi" .../>
...
<button aria-label="Step 8: Laporan HR-Ready" .../>
```

Dot height: `h-1`. Gap: `gap-1.5`. Transition: `duration-500`.

---

## State Machine

The workflow diagram has exactly one state variable: `activeIndex` (0–7).

| Event | Guard | Transition | Side effect |
|---|---|---|---|
| `TICK` | `!paused` | `activeIndex → (activeIndex + 1) % 8` | If `next === 0`, increment `loopKey` to reset connector animations |
| `PICK(i)` | always | `activeIndex → i` | Set `paused = true`, schedule resume after 5000ms |
| `RESUME` | timer fires | `paused → false` | Clear resume ref |

`loopKey` is a secondary counter used as part of React `key` props on connector motion elements, forcing animation reset on each new loop.

---

## Component Architecture

**File:** `apps/web/src/components/WorkflowJourney.tsx`

**Internal structure:**

| Sub-component | Purpose |
|---|---|
| `WorkflowJourney` | Main exported component, owns all state |
| `StepCard` | Individual step card, receives `isActive` + `onClick` |
| `HConn` | Horizontal connector with fill + dot + chevron |
| `VConn` | Vertical zig-zag connector with fill + dot + chevron |
| `DetailPanel` | Full-width detail panel, renders all steps in DOM |

**LandingPage integration:**

```tsx
// In #workflow section, replacing old static grid:
<motion.div variants={fadeUp}>
  <WorkflowJourney />
</motion.div>
```

---

## Test Requirements

Per `agent_rule.txt`: TDD is mandatory. Write tests before production code.

**Tests to write (in `landingPage.test.tsx`):**

| Test | What to assert |
|---|---|
| Workflow heading present | `getByRole("heading", { name: /bagaimana taptu bekerja/i })` |
| All 8 step progress dots | `getByRole("button", { name: /step 1.*buat workspace/i })` × 8 |
| Payroll copy present in DOM | `getByText(/payroll input readiness/i)` (always in DOM, not hidden) |
| No full payroll copy | `queryByText(/full payroll processing/i)` → null |

**Tests NOT needed at section level:**
- Connector animation timing (integration-level, not unit)
- Loop key reset (internal state, not externally observable)
- Auto-cycle timing (requires real timer mocking)

---

## What This Section Must Communicate

A first-time visitor watching the section for 8–10 seconds (one full loop) should understand:

1. Taptu starts with a Superadmin creating a workspace
2. You set up the organization before using it
3. Different roles have different access levels
4. Employees check in through mobile, QR, or scanner
5. Taptu validates attendance automatically, with exceptions going to review
6. HR makes the final call and gets a clean, reportable dataset

The section must communicate this **without the visitor needing to click anything**.

---

## Anti-patterns to Avoid

| Anti-pattern | Why |
|---|---|
| Two disconnected card groups | Feels like a feature list, not a journey |
| Phase labels as visual separators only | Users miss the flow if labels are too subtle |
| Static cards with no motion | Doesn't communicate the system is active/alive |
| Huge detail panel | Competes with the diagram |
| Chip text too small or too bright | Hard to read on dark background |
| "Full payroll processing" in copy | Out of scope, misleads visitors |
| Mermaid default rendering | Generic, not premium |
| Generic SaaS illustrations | Generic, not product-specific |
| Interaction required to understand | Defeats the purpose of an explainer section |

---

## Acceptance Criteria (for implementation phase)

- [ ] Visitor understands full Taptu journey without clicking
- [ ] Active step cycles automatically, loops forever
- [ ] Connector animation shows clear direction of flow
- [ ] Serpentine layout: row 1 (01→04) left-to-right, row 2 (05→08) right-to-left
- [ ] Zig-zag vertical connector aligns precisely under step 04 / above step 05
- [ ] Detail panel shows correct step content, updates automatically
- [ ] All step text always in DOM (opacity toggle, not removal)
- [ ] Progress dots have correct `aria-label` for tests and screen readers
- [ ] Mobile: vertical timeline, no horizontal overflow
- [ ] Taptu product boundary preserved (no full HRIS, no full payroll)
- [ ] Reduced motion supported via `MotionConfig reducedMotion="user"`
- [ ] All landing page tests green after implementation
