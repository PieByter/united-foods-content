---
name: Culinary Operations & Precision HPP System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#904d00'
  on-secondary: '#ffffff'
  secondary-container: '#fe932c'
  on-secondary-container: '#663500'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002114'
  on-tertiary-container: '#069669'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#ffdcc3'
  secondary-fixed-dim: '#ffb77d'
  on-secondary-fixed: '#2f1500'
  on-secondary-fixed-variant: '#6e3900'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  data-metric:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.02em
  data-cell:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-xs:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system is engineered specifically for F&B founders, production managers, executive pastry chefs, and financial controllers operating within bakeries, central kitchens, and multi-unit hospitality enterprises. The visual narrative combines the exacting rigor of an enterprise resource planning (ERP) environment with the tactile craftsmanship of culinary production.

The style direction is **Modern High-Density Utility**. It avoids empty ornamentation in favor of scannability, crisp data density, visual weight hierarchies, and low cognitive friction. 

### Visual Tone & Experience
- **Precision First:** Numerical calculations—including Harga Pokok Penjualan (HPP), unit yields, baking losses, and ingredient batch multipliers—are front and center with zero ambiguity.
- **Craft Meets Ledger:** Industrial deep navy foundation balances an energetic warm amber that evokes ovens, Maillard reactions, and copper kitchenware, creating a specialized, non-generic corporate atmosphere.
- **Operational Clarity:** High-contrast data grids, explicit state boundaries, and strict tabular layouts reduce input mistakes in fast-moving commercial kitchen and office environments.

## Colors

The color system relies on functional signifiers to convey financial performance and ingredient metrics at a glance.

### Functional Palette Logic
- **Primary Canvas & Structure (`#0F172A` / `#1E293B`):** Acts as the stabilizing bedrock for navigation anchors, high-level headers, and executive metric summaries.
- **Artisan Copper Accent (`#D97706`, `#F59E0B`):** Applied strictly to focal points: primary batch operations, active simulation controls, yield recalculations, and interactive steppers.
- **Profitability Signals (Target Food Cost < 30%):** Emerald (`#059669`, `#10B981`) indicates healthy profit margins, cost savings, and optimized yields.
- **Non-Linear & Operational Alerts:** Deep Orange/Amber (`#EA580C`, `#F59E0B`) highlights volatile ingredient price increases and dynamic formulation adjustments (e.g., non-linear yeast/salt dampening during scale-up).
- **Critical Breaches (Food Cost > 35% / Negative Margin):** Crimson (`#E11D48`, `#F43F5E`) designates cost overruns, missing conversion rates, and negative gross profits.
- **Neutral Substrates:** Crisp slate canvas (`#F8FAFC`) with pure white work surfaces (`#FFFFFF`) framed by hairline slate borders (`#E2E8F0`) ensures prolonged analytical focus without eye strain.

## Typography

Typography enforces strict operational legibility and numerical comparison.

- **Header Hierarchy:** Plus Jakarta Sans introduces structured authority with balanced geometric counters, avoiding visual fatigue in administrative toolbars and recipe summaries.
- **Interface & Data Entry:** Inter handles labels, instructions, ingredient naming, and multi-step production methods with high micro-legibility.
- **Tabular & Metric Architecture:** JetBrains Mono is strictly enforced for currency (IDR / USD), metric quantities (grams, milliliters, pieces), conversion factors, and percentage indicators. Always pair numerical presentation with OpenType tabular figures (`font-variant-numeric: tabular-nums`) to prevent horizontal jitter during inline recalculations.

## Layout & Spacing

A compact, 12-column grid maximizes horizontal workspace for multi-column recipe formulation matrices, batch scalers, and ledger breakdown views.

### Structure & Adaptability
- **Desktop (>= 1280px):** 12-column layout with 24px (`gutter-desktop`) gutters and 32px (`margin-desktop`) outer canvas margins. Sticky summary rails (HPP breakdown, food cost %, target margin controls) flank the primary dynamic calculation sheet.
- **Tablet / Kitchen Display (768px - 1279px):** 8-column layout. Sidebar navigation collapses into an icon rail, preserving formula rows without truncation. Sticky summary panels convert to collapsible bottom drawers.
- **Mobile (< 768px):** 4-column layout with 16px margins. Complex multi-column ERP tables convert into stacked formula cards with inline stepper controls and direct HPP summaries.
- **Density Rhythms:** Internal data cells leverage `space-xs` and `space-sm` vertical padding to ensure a full 25-ingredient recipe formula fits entirely within common 1080p display viewports without excessive vertical scrolling.

## Elevation & Depth

Visual depth is achieved through structural layering and hairline borders rather than heavy drop shadows, reinforcing a clean technical instrument aesthetic.

### Depth Rules
- **Base Canvas:** Flat slate background (`#F8FAFC`).
- **Surface Elevation (Cards, Grids, Panels):** Pure white background (`#FFFFFF`) with a 1px continuous hairline outline in `#E2E8F0`. 
- **Sticky & Docked Layers (HPP Summary Dock, Floating Action Bar):** Uses a soft ambient drop shadow: `0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.03)`.
- **Modals & Flyouts:** Crisp outline with elevated ambient boundary: `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`.
- **Active Row Focus:** 1px border shift to primary copper accent (`#D97706`) with an ultra-light tint (`#FFFBEB`) background to eliminate row misalignment when auditing complex formulas.

## Shapes

The design system uses a crisp, utilitarian radius scale: `0.25rem` (`rounded-sm`) for interactive inputs, buttons, and badges, stepping up to `0.5rem` (`rounded-lg`) for structural cards and table containers. 

### Geometric Rationale
- Soft, restrained corner radii preserve the serious financial-grade ERP atmosphere.
- Pill forms are strictly isolated to categorical status markers and conversion tags (e.g., `1 egg = 55g`, `+12% Waste Allowance`) to differentiate metadata from actionable input fields.
- Interactive numeric controls (steppers, unit selectors) use tight inner radii that lock flush against adjoining inputs.

## Components

### 1. Data Grids & ERP Formula Tables
- **Header:** Uppercase 11px JetBrains Mono (`label-xs`) in `#64748B`, with explicit unit badges (e.g., `QTY (GR)`, `COST/BASE UNIT`, `LINE TOTAL`).
- **Rows:** Alternating subtle row tinting on hover (`#F8FAFC`). Rows feature quick-action trigger groupings on hover (lock ingredient, toggle waste factor, exclude from batch).
- **Inline Tabular Inputs:** Monospaced inputs with right-aligned values and integrated suffix adornments (`g`, `ml`, `IDR`).
- **Non-Linear Flag Rows:** When items like yeast (*ragi*), salt (*garam*), or leaveners scale non-linearly, the row displays an inset copper accent bar (`#D97706`) on the left border with an accompanying warning chip.

### 2. Status Chips & Conversion Pills
- **Financial Status Badges:**
  - *Healthy Margin:* Inset emerald tint (`#ECFDF5`), border `#A7F3D0`, text `#065F46`.
  - *Target Warning / Breached Cost:* Inset rose tint (`#FFF1F2`), border `#FECDD3`, text `#9F1239`.
- **Unit Conversion Pills:** Compact, clickable tokens (`#F1F5F9` background, `#334155` text) that open an instant unit calibration popover (e.g., `1 btr = 55 gr` or `1 can = 397 gr`).

### 3. Metric & Scenario Simulation Cards
- Clean white surfaces divided into primary KPI quadrants:
  - Top: Raw Material Cost, Labor Burden, Packaging Overhead.
  - Middle: Gross Margin Percentage with live target gauge.
  - Base: Interactive batch multiplier slider (`1x`, `2.5x`, `10x`, `Custom Pan Size`).
- Positive states dynamically highlight the total HPP value in bold tabular text.

### 4. Inputs & Stepper Controls
- **Standard Input:** Single-line, 36px height for rapid data entry. Borders: `#CBD5E1`, transitioning to `#D97706` on focus with 0 0 0 1px ring.
- **Increment/Decrement Stepper:** Integrated split buttons with tactile glyphs (`-`, `+`) for fast production kitchen batch scaling.

### 5. Buttons & Triggers
- **Primary Operational Button:** Deep Navy (`#0F172A`) base with `#FFFFFF` text. Transitions to `#1E293B` on hover.
- **Craft Action Button:** Warm Amber (`#D97706`) base with `#FFFFFF` text for actions like "Recalculate Yield", "Bake Scaling", or "Commit Batch".
- **Ghost/Tertiary Table Action:** High-contrast slate icons (`#64748B`) that elevate to `#0F172A` on hover.