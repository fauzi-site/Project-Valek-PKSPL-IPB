# UI/UX Style Guide

## PKSPL IPB — Coastal & Marine Ecosystem Economic Valuation System

### Aligned with Redesign v2

---

## 1. Design Philosophy

| Principle | Description |
|-----------|-------------|
| **Professional Scientific** | Clean, data-dense interfaces designed for researchers and environmental analysts |
| **Institutional Branding** | Visual identity aligned with IPB University and PKSPL |
| **Data-First** | Prioritize data readability — spreadsheets, tables, maps, and charts dominate the UI |
| **Accessibility** | WCAG-compliant contrast ratios, keyboard navigation, screen reader support |
| **Bilingual** | Full Indonesian (primary) / English support via i18next |
| **Progressive Workflow** | 8-step linear workflow with clear navigation and progress indication |

---

## 2. Color System

### 2.1 Primary Palette

| Token | Value | Tailwind Class | Usage |
|-------|-------|----------------|-------|
| **Primary** | `#2563EB` | `blue-600` | CTAs, active sidebar items, primary buttons, links |
| **Primary Hover** | `#1D4ED8` | `blue-700` | Button hover states |
| **Primary Light** | `#3B82F6` | `blue-500` | Notification badges, secondary accents |
| **Primary Muted** | `rgba(59,130,246,0.2)` | `blue-500/20` | Badge backgrounds, subtle highlights |

### 2.2 Surface & Background

| Token | Value | Tailwind Class | Usage |
|-------|-------|----------------|-------|
| **Surface** | `#FFFFFF` | `white` | Main content area background |
| **Surface Alt** | `#F8FAFC` / `#F1F5F9` | `slate-50` / `slate-100` | Card backgrounds, alternating rows |
| **Sidebar** | `#0F172A` | `slate-900` | Researcher & Admin sidebar |
| **Sidebar Header** | `#020617` | `slate-950` | Sidebar brand overlay (`bg-slate-950/40`) |
| **Sidebar Hover** | `#1E293B` | `slate-800` | Sidebar item hover |
| **Overlay** | `rgba(2,6,23,0.7)` | `slate-950/70` | Modal backdrop, mobile drawer overlay |

### 2.3 Semantic Colors

| Token | Value | Tailwind Class | Usage |
|-------|-------|----------------|-------|
| **Success** | `#16A34A` | `green-600` | Approved status, positive indicators |
| **Warning** | `#F59E0B` | `amber-500` | Pending states, caution notices |
| **Danger** | `#DC2626` | `red-600` | Rejected status, destructive actions, errors |
| **Info** | `#2563EB` | `blue-600` | Informational badges |

### 2.4 Text Colors

| Token | Tailwind Class | Usage |
|-------|----------------|-------|
| **Text Primary** | `text-slate-900` | Headings, primary body text |
| **Text Secondary** | `text-slate-500` / `text-slate-400` | Descriptions, labels, timestamps |
| **Text Muted** | `text-slate-300` | Sidebar inactive text |
| **Text Inverse** | `text-white` | Text on dark/primary backgrounds |
| **Text Code** | `text-blue-400` | Project codes, monospaced data |

### 2.5 Border Colors

| Token | Tailwind Class | Usage |
|-------|----------------|-------|
| **Border Default** | `border-slate-200` | Card borders, input borders |
| **Border Subtle** | `border-slate-800` | Sidebar dividers (dark theme) |
| **Border Focus** | `ring-blue-500` | Input focus ring |

---

## 3. Typography

### 3.1 Font Stack
```css
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
             "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```
Applied via Tailwind's `font-sans antialiased` on the root element.

### 3.2 Type Scale

| Level | Tailwind Classes | Usage |
|-------|-----------------|-------|
| **Display** | `text-3xl font-bold` | Landing page hero heading |
| **Page Title** | `text-2xl font-bold` | Dashboard page titles |
| **Section Header** | `text-lg font-semibold` / `text-xl font-bold` | Card headers, section titles |
| **Body** | `text-sm` / `text-base` | General content, descriptions |
| **Caption** | `text-xs` | Sidebar items, metadata, timestamps |
| **Micro** | `text-[10px]` / `text-[11px]` | Section labels, badge counts, subtle labels |

### 3.3 Special Typography

| Pattern | Tailwind Classes | Usage |
|---------|-----------------|-------|
| **Monospace** | `font-mono` | Project codes (`PKS-A3X8K1`), numeric data, step numbers |
| **Tracking Wide** | `tracking-wider uppercase` | Section labels in sidebar (`WORKFLOW PENELITIAN`) |
| **Brand Name** | `text-sm font-bold text-white tracking-wider` | "PKSPL" in sidebar header |
| **Brand Subtitle** | `text-[11px] text-slate-400 font-medium` | "Sistem Valuasi" in sidebar header |

---

## 4. Spacing & Layout

### 4.1 Application Shell

```
┌─────────────────────────────────────────────┐
│ Topbar (h-16, 64px)                         │
├──────────┬──────────────────────────────────┤
│ Sidebar  │ Content Area                     │
│ 64px     │ flex-1, overflow-y-auto          │
│ collapsed│                                  │
│ ──────── │                                  │
│ 256px    │                                  │
│ expanded │                                  │
│          │                                  │
├──────────┴──────────────────────────────────┤
```

### 4.2 Sidebar Dimensions

| State | Width | Tailwind Class |
|-------|-------|----------------|
| Collapsed (desktop) | 64px | `md:w-16` |
| Expanded (desktop) | 256px | `md:w-64` |
| Mobile drawer | 288px | `w-72` |

### 4.3 Spacing Tokens

| Context | Value | Usage |
|---------|-------|-------|
| **Card padding** | `p-4` to `p-6` | Internal card spacing |
| **Sidebar item** | `px-3 py-2` | Navigation items |
| **Section gap** | `space-y-1` | Between sidebar items |
| **Page padding** | `px-4` to `px-8` | Content area horizontal padding |
| **Stack gap** | `gap-2` to `gap-4` | Flex/grid element spacing |

### 4.4 Border Radius

| Size | Tailwind | Usage |
|------|----------|-------|
| Small | `rounded` (4px) | Buttons, badges, input fields |
| Medium | `rounded-lg` (8px) | Cards, modals, containers |
| Full | `rounded-full` | Avatars, status indicators |

---

## 5. Component Patterns

### 5.1 Navigation — Researcher Sidebar

**8-Step Workflow Navigation:**
```
[Icon] 01  Identitas Proyek
[Icon] 02  Wilayah Penelitian
[Icon] 03  Unit & Tutupan Lahan
[Icon] 04  Referensi Proyek
[Icon] 05  Jasa & Metode
[Icon] 06  Data Valuasi
[Icon] 07  Perhitungan & Validasi
[Icon] 08  Laporan & Analisis
────────────────────────
[Icon]     Pesan  [badge]
```

| State | Style |
|-------|-------|
| **Active** | `bg-blue-600 text-white font-semibold shadow-sm` |
| **Default** | `text-slate-300` |
| **Hover** | `hover:bg-slate-800 hover:text-white` |
| **Step number** | `text-[11px] font-mono opacity-60` |

### 5.2 Cards & Containers

```
┌─ border border-slate-200 rounded-lg shadow-sm ─┐
│ Header (border-b, flex justify-between)          │
│   Title (text-lg font-semibold)                  │
│   Actions (buttons)                              │
├──────────────────────────────────────────────────┤
│ Body (p-4 to p-6)                                │
│   Content...                                     │
└──────────────────────────────────────────────────┘
```

### 5.3 Buttons

| Variant | Classes | Usage |
|---------|---------|-------|
| **Primary** | `bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2` | Main actions |
| **Secondary** | `bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-4 py-2` | Alternate actions |
| **Danger** | `bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2` | Destructive actions |
| **Ghost** | `text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded p-1.5` | Icon-only buttons |
| **Loading** | Primary + spinner icon + disabled state | Async operations |

### 5.4 Form Inputs

| Element | Style |
|---------|-------|
| **Label** | `text-sm font-medium text-slate-700 mb-1` |
| **Input** | `border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500` |
| **Error message** | `text-xs text-red-600 mt-1` |
| **Error border** | `border-red-500` |
| **Helper text** | `text-xs text-slate-400 mt-1` |

### 5.5 Tables & Data Grids

- Spreadsheet-style layout for valuation data input (ExcelGrid)
- Sticky column headers
- Alternating row backgrounds (`even:bg-slate-50`)
- Formatted number inputs with thousand separators (`FormattedNumberInput`)
- Custom column management modal
- Row reordering support
- Inline editing with autosave
- Dynamic form rendering driven by `ref_valuation_methods.input_schema`

### 5.6 Modals & Dialogs

| Element | Style |
|---------|-------|
| **Backdrop** | `fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40` |
| **Container** | `bg-white rounded-lg shadow-2xl max-w-md to max-w-4xl mx-auto` |
| **Header** | `px-6 py-4 border-b flex items-center justify-between` |
| **Body** | `px-6 py-4` |
| **Footer** | `px-6 py-4 border-t flex justify-end gap-3` |
| **Close button** | `X icon, top-right, p-1.5 rounded hover:bg-slate-100` |

### 5.7 Badges & Status Tags

| Status | Style |
|--------|-------|
| **Active / Online** | `bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs` |
| **Pending** | `bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs` |
| **Rejected** | `bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs` |
| **Primary Method** | `bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold` |
| **Supporting Method** | `bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs` |
| **Unread Count** | `text-[10px] px-1.5 py-0.5 rounded font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30` |
| **Notification Dot** | `w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-slate-900` |

### 5.8 Maps

- Full-width Leaflet container within content area
- `MapLayerControl` — toggle tile layers and overlays
- `MapLegend` — floating overlay with color-coded legend
- `PolygonDetailDrawer` — slide-in side panel for polygon metadata
- `UploadShpModal` — modal for Shapefile upload with drag-and-drop
- `ReviewSpatialViewer` — read-only map for review mode

### 5.9 Charts & Visualization

- **Library**: Recharts
- **Color palette**: Matches brand palette (blue-600, green-500, amber-500, red-500, slate-400)
- **Responsive**: Uses `ResponsiveContainer` wrapper
- **Types used**: BarChart (stacked for TEV composition), PieChart (service categories), LineChart (benefits vs costs over time), grouped BarChart (multi-method comparison)
- **Tooltip**: Custom styled to match card design

---

## 6. Loading & Empty States

### 6.1 Loading Components

| Component | Description |
|-----------|-------------|
| `LoadingSpinner` | Centered spinner with optional label |
| `LoadingButton` | Button variant with inline spinner and disabled state |
| `Skeleton` | Base skeleton pulse animation |
| `SkeletonCard` | Card-shaped loading placeholder |
| `SkeletonTable` | Table rows with shimmer effect |
| `SkeletonChart` | Chart-area loading placeholder |
| `SkeletonList` | Vertical list loading placeholder |
| `SkeletonModal` | Modal-shaped loading placeholder |
| `RefreshIndicator` | Subtle top-bar indicator for background refresh |

### 6.2 State Boundaries

| Component | Purpose |
|-----------|---------|
| `DataViewBoundary` | Unified wrapper handling loading → error → empty → data states |
| `EmptyState` | Illustration + message + CTA button for no-data states |
| `ErrorState` | Error message + retry button |
| `ErrorBoundary` | React error boundary for crash recovery |

### 6.3 Feedback

| Pattern | Implementation |
|---------|---------------|
| **Toast notifications** | `react-hot-toast`, positioned top-center |
| **Autosave indicator** | `AutosaveIndicator` — shows save status (saving/saved/error) |
| **Typing indicator** | Animated dots in chat when another user is typing |
| **Validation checks** | Dashboard showing errors (red) / warnings (amber) / info (blue) for calculation readiness |

---

## 7. Iconography

- **Library**: Lucide React (`lucide-react` ^0.344.0)
- **Style**: Outline icons, consistent stroke width

| Size | Tailwind | Context |
|------|----------|---------|
| 16px | `w-4 h-4` | Sidebar nav icons, inline text icons |
| 20px | `w-5 h-5` | Action buttons, mobile close button |
| 24px | `w-6 h-6` | Feature highlights, empty state icons |

**Commonly used icons:**
`FolderKanban`, `Map`, `Layers`, `Database`, `BookOpen`, `SlidersHorizontal`, `TableProperties`, `Calculator`, `BarChart3`, `FileCheck2`, `MessageSquare`, `ChevronLeft`, `ChevronRight`, `Home`, `X`, `Star` (primary method indicator)

---

## 8. Responsive Design

### 8.1 Breakpoints (Tailwind Default)

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `sm` | 640px | Small tablets |
| `md` | 768px | Sidebar visibility toggle |
| `lg` | 1024px | Multi-column layouts |
| `xl` | 1280px | Full dashboard grids |
| `2xl` | 1536px | Ultra-wide optimization |

### 8.2 Mobile Patterns

| Pattern | Implementation |
|---------|---------------|
| **Sidebar** | Hidden by default on mobile; opens as drawer overlay with backdrop blur |
| **Grid Collapse** | Multi-column grids collapse to single column below `md` |
| **Topbar** | Hamburger menu button (`md:hidden`) to toggle sidebar |
| **Mobile drawer close** | Dedicated X button in sidebar header |
| **Touch targets** | Minimum 44x44px tap targets on interactive elements |

---

## 9. Branding

### 9.1 Brand Mark

```
┌──────────┐
│    PK    │  ← w-8 h-8, rounded, bg-blue-600
│          │     text-white, font-bold, text-sm
└──────────┘
```

### 9.2 App Identity

| Element | Style | Content |
|---------|-------|---------|
| **App Name** | `text-sm font-bold text-white tracking-wider` | PKSPL |
| **Subtitle** | `text-[11px] text-slate-400 font-medium` | Sistem Valuasi |

### 9.3 Institutional Alignment
- Color palette inspired by IPB University's blue branding
- Professional, academic tone throughout the interface
- Scientific/research-oriented data presentation
- Formal Indonesian language as default with English translation

---

*Style guide aligned with Redesign v2 — PKSPL IPB Valuation System*
