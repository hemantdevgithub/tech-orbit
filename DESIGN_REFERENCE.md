# DESIGN_REFERENCE.md — Techorbit Design System

This document captures the visual language of Techorbit, derived from the Calibra Health Group reference screenshot. It is the source of truth for `packages/ui/`. Any visual decision not explicitly covered here should be consistent with these principles.

---

## Design principles

1. **Warm, professional, trustworthy.** This is a financial product (money flows through it). Users need to feel the system is serious without being sterile.
2. **Generous whitespace.** Cards breathe. Never cram content edge-to-edge.
3. **Rounded, soft, approachable.** No sharp corners. Shadows are subtle.
4. **Green leads.** Forest green is the single brand color that appears on anything important: logo, headings, primary actions, active states.
5. **Cream as canvas.** The page background is warm off-white, never pure white. White is reserved for cards and content surfaces — this creates visual hierarchy automatically.
6. **Type contrast does the work.** Bold headings + regular body + muted sage labels. We don't need color variety to create hierarchy; weight and size do it.

---

## Color palette

### Semantic intent

| Token         | Hex     | Use                                                  |
| ------------- | ------- | ---------------------------------------------------- |
| `forest-800`  | #16372C | Brand, logo, headings, primary text, primary buttons |
| `forest-700`  | #1B4631 | Button hover                                         |
| `forest-500`  | #2F6E4C | Accent, secondary interactive                        |
| `sage-500`    | #7A9080 | Secondary text, labels, placeholder text             |
| `mint-200`    | #E8F0EA | Active/selected state, nav pill, completed step fill |
| `mint-100`    | #F0F7F1 | Subtle positive background, hover on ghost button    |
| `cream-100`   | #FAF4EA | **Page background** — primary canvas                 |
| `cream-200`   | #F5EDD9 | Subtle surface, secondary panels                     |
| `cream-300`   | #EEE2C8 | Progress track, divider                              |
| `surface`     | #FFFFFF | Card background                                      |
| `surface-soft`| #F5F2EC | Nested/subtle surface                                |
| `border-soft` | #E5DDD0 | Card borders, input borders                          |

### Status colors

| Token     | Hex     | Use                              |
| --------- | ------- | -------------------------------- |
| `success` | #3E8B5C | Positive confirmations           |
| `warning` | #C68E3E | Caution, pending states          |
| `danger`  | #B14B4B | Errors, destructive actions      |
| `info`    | #4A7A9F | Informational callouts           |

### Full palette (for Tailwind config)

```ts
colors: {
  forest: {
    50:  '#F0F5F1',
    100: '#D8E5DB',
    200: '#B2CCBA',
    300: '#83AD8F',
    400: '#578E6A',
    500: '#2F6E4C',
    600: '#23573B',
    700: '#1B4631',
    800: '#16372C',   // brand
    900: '#0F281F',
  },
  sage: {
    400: '#9BAF9F',
    500: '#7A9080',
    600: '#5F7566',
  },
  mint: {
    100: '#F0F7F1',
    200: '#E8F0EA',
    300: '#D5E5D9',
  },
  cream: {
    50:  '#FCF8F1',
    100: '#FAF4EA',   // page bg
    200: '#F5EDD9',
    300: '#EEE2C8',
  },
  surface: {
    DEFAULT: '#FFFFFF',
    soft:    '#F5F2EC',
    border:  '#E5DDD0',
  },
  success: { DEFAULT: '#3E8B5C', fg: '#FFFFFF' },
  warning: { DEFAULT: '#C68E3E', fg: '#FFFFFF' },
  danger:  { DEFAULT: '#B14B4B', fg: '#FFFFFF' },
  info:    { DEFAULT: '#4A7A9F', fg: '#FFFFFF' },
}
```

---

## Typography

### Font family

```
sans: Inter, ui-sans-serif, system-ui, sans-serif
mono: JetBrains Mono, ui-monospace, monospace
```

Load Inter via `next/font/google` with weights 400, 500, 600, 700.

### Type scale

| Class    | Size    | Line  | Use                                           |
| -------- | ------- | ----- | --------------------------------------------- |
| `text-xs`   | 12px | 16px  | Timestamps, micro-copy                        |
| `text-sm`   | 14px | 20px  | Secondary labels, helper text                 |
| `text-base` | 16px | 24px  | Body text                                     |
| `text-lg`   | 18px | 28px  | Emphasized body, large list items             |
| `text-xl`   | 20px | 28px  | Subheadings, card labels                      |
| `text-2xl`  | 24px | 32px  | Card titles, section subheaders               |
| `text-3xl`  | 30px | 36px  | Page subheaders                               |
| `text-4xl`  | 36px | 40px  | Page titles (e.g., "Entrepreneur Dashboard")  |
| `text-5xl`  | 48px | 1.1em | Hero headlines (rare, marketing pages only)   |

### Weight conventions

- Headings (page titles, card titles): **600–700** (semibold / bold)
- Labels, emphasized body: **500** (medium)
- Body: **400** (regular)
- Never use **300** (light) — cream bg makes it hard to read

### Color conventions for type

- Headings: `text-forest-800`
- Body: `text-forest-800` (yes, same — our bg is cream so black feels harsh; forest-800 on cream has enough contrast while feeling warmer)
- Labels, captions, muted: `text-sage-500`
- Links: `text-forest-500 hover:text-forest-700 underline-offset-4 hover:underline`
- Errors: `text-danger`

---

## Spacing and radius

Standard Tailwind spacing scale applies. Conventions:

- Page horizontal padding: `px-6` mobile, `px-12` desktop
- Card internal padding: `p-6` (desktop), `p-5` (mobile)
- Card vertical gap (stacked cards): `gap-6` desktop, `gap-4` mobile
- Form field vertical gap: `gap-4`

### Border radius

```ts
borderRadius: {
  none: '0',
  sm:   '6px',
  md:   '10px',
  lg:   '14px',   // CARDS default
  xl:   '20px',   // large panels, modals
  '2xl':'28px',   // hero cards
  full: '9999px', // pills, avatars
}
```

### Shadows

```ts
boxShadow: {
  card:      '0 1px 2px rgba(22,55,44,0.04), 0 2px 8px rgba(22,55,44,0.06)',
  cardHover: '0 2px 4px rgba(22,55,44,0.06), 0 8px 24px rgba(22,55,44,0.08)',
  popover:   '0 10px 40px rgba(22,55,44,0.12)',
  input:     '0 1px 2px rgba(22,55,44,0.04)',
  focus:     '0 0 0 3px rgba(47,110,76,0.15)',
}
```

Never use generic `shadow-md` or `shadow-lg`. Use the semantic names above.

---

## Component specifications

### Button

```
<Button variant="primary | secondary | ghost | destructive" size="sm | md | lg">
```

**Sizing:**
- `sm`: `px-4 py-2 text-sm` (~32px tall)
- `md`: `px-6 py-3 text-base` (~44px tall) — **default**
- `lg`: `px-8 py-4 text-lg` (~52px tall)

**Variants:**
- `primary`: `bg-forest-800 text-white hover:bg-forest-700 active:bg-forest-900 shadow-card`
- `secondary`: `bg-surface border border-forest-800 text-forest-800 hover:bg-mint-100`
- `ghost`: `bg-transparent text-forest-800 hover:bg-mint-200`
- `destructive`: `bg-danger text-white hover:bg-[#9C3E3E]`

**Shared:**
- `rounded-lg`, `font-medium`, `transition-colors duration-150`
- Focus: `focus-visible:ring-2 ring-forest-500 ring-offset-2 outline-none`
- Disabled: `opacity-40 cursor-not-allowed`
- Loading state: preserve width, swap label for spinner

### Card

```
<Card>
  <CardHeader />   {/* optional icon + title + subtitle + actions */}
  <CardBody />
  <CardFooter />   {/* optional */}
</Card>
```

- `bg-surface rounded-lg shadow-card border border-surface-border`
- Internal padding: `p-6`
- `CardHeader`: `flex items-center gap-4 mb-4`; title `text-2xl font-semibold text-forest-800`; subtitle `text-sm text-sage-500`
- Interactive card (hover elevates): `hover:shadow-cardHover transition-shadow cursor-pointer`

### Input

```
<Input label="Email" helperText="We'll never share this" error="Invalid email" />
```

- Wrapper: `flex flex-col gap-1.5`
- Label: `text-sm font-medium text-forest-800`
- Field: `bg-surface border border-surface-border rounded-md px-4 py-2.5 text-base placeholder:text-sage-400`
- Focus: `border-forest-500 ring-2 ring-forest-500/15 outline-none`
- Error: border `border-danger`, helper text becomes `text-danger`
- Disabled: `bg-surface-soft text-sage-500 cursor-not-allowed`

### Label

`text-sm font-medium text-forest-800` — separate component so it pairs with non-Input controls (checkboxes, radio groups).

### Badge / Pill

```
<Badge variant="mint | cream | danger | muted | success | warning">
```

- `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium`
- `mint`: `bg-mint-200 text-forest-800`
- `cream`: `bg-cream-200 text-forest-700`
- `success`: `bg-success/10 text-success`
- `warning`: `bg-warning/10 text-warning`
- `danger`: `bg-danger/10 text-danger`
- `muted`: `bg-surface-soft text-sage-500`

### Avatar

```
<Avatar name="Hemant" src="..." size="sm | md | lg" />
```

- `rounded-full`, sizes: `sm` (32px), `md` (40px), `lg` (56px)
- Fallback: initials on `bg-mint-200 text-forest-800 font-medium`

### InfoStrip (Role / LOB / Position pattern)

From the reference screenshot, the horizontal white pill that shows `Role: ENTREPRENEUR · LOB: CCRC · Position: CEO`.

```
<InfoStrip>
  <InfoStrip.Item icon={<User />} label="Role" value="Candidate" />
  <InfoStrip.Item icon={<Globe />} label="Market" value="US IT Staffing" />
  <InfoStrip.Item icon={<Briefcase />} label="Visa" value="H-1B" />
</InfoStrip>
```

- Container: `bg-surface rounded-lg border border-surface-border p-4 flex flex-wrap items-center gap-x-8 gap-y-3`
- Item: `flex items-center gap-2`; icon in `text-sage-500`; label `text-sm text-sage-500`; value `text-sm font-semibold text-forest-800 uppercase tracking-wide`

### ProgressCard

The "Verification Progress — 2/4 complete" pattern.

```
<ProgressCard
  title="Onboarding Progress"
  totalSteps={4}
  completedSteps={2}
  steps={[
    { label: "Email verified", icon: <Mail />, status: "complete" },
    { label: "ID verification", icon: <Shield />, status: "complete" },
    { label: "Resume uploaded", icon: <FileText />, status: "pending" },
    { label: "Profile complete", icon: <User />, status: "pending" },
  ]}
/>
```

- Outer `Card` with padding `p-6`
- Header row: title (`text-2xl font-semibold`) on left, "2/4 complete" in `text-sm text-sage-500` on right
- Progress bar: `h-2 bg-cream-300 rounded-full` with inner `bg-forest-800 rounded-full` width = percent complete
- Grid of step cards: `grid grid-cols-2 md:grid-cols-4 gap-4` (responsive)
- Each step card:
  - Complete: `bg-mint-200 border border-mint-300 rounded-lg p-4 flex flex-col items-center gap-2`; icon in `bg-mint-100 rounded-full p-2 text-forest-600`; checkmark overlay
  - Pending: `bg-surface-soft border border-surface-border rounded-lg p-4 flex flex-col items-center gap-2`; icon in `bg-surface rounded-full p-2 text-sage-400`
  - Label: `text-sm font-medium text-forest-800 text-center` (complete), `text-sm text-sage-500 text-center` (pending)

### NavBar

Sticky top nav like the reference:

```
<NavBar>
  <NavBar.Logo />
  <NavBar.Links>
    <NavBar.Link href="/dashboard" active>Home</NavBar.Link>
    <NavBar.Link href="/requirements">Requirements</NavBar.Link>
    ...
  </NavBar.Links>
  <NavBar.Actions>
    <NotificationBell count={3} />
    <UserMenu />
  </NavBar.Actions>
</NavBar>
```

- `sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-surface-border`
- Height: `h-16`, content `px-6 md:px-12`
- Logo: icon tile (`w-10 h-10 rounded-md bg-forest-800 text-white flex items-center justify-center font-bold`) + brand text (`text-xl font-semibold text-forest-800`)
- Links center: `flex items-center gap-2`
  - Link: `px-4 py-2 rounded-md text-base font-medium text-forest-800 hover:bg-mint-100`
  - Active link: `bg-mint-200`
- Actions right: `flex items-center gap-3`

### PageHeader

Icon tile + title + subtitle pattern (like "Entrepreneur Dashboard" in the reference).

```
<PageHeader
  icon={<Briefcase />}
  title="Dashboard"
  subtitle="Welcome back, Hemant"
  actions={<Button>New Requirement</Button>}
/>
```

- Container: `flex items-start justify-between gap-4 mb-8`
- Icon tile: `w-14 h-14 rounded-lg bg-surface-soft flex items-center justify-center text-forest-800`
- Title: `text-4xl font-bold text-forest-800 leading-tight`
- Subtitle: `text-lg text-sage-500 mt-1`
- Actions area: right-aligned, optional

---

## Layout patterns

### App shell

```
<div className="min-h-screen bg-cream-100">
  <NavBar />
  <main className="max-w-7xl mx-auto px-6 md:px-12 py-8 md:py-12">
    {children}
  </main>
</div>
```

### Dashboard layout

- `PageHeader` at top
- `InfoStrip` below header (for context pills)
- Cards stacked vertically with `gap-6`
- Two-column grid on desktop for kanban / split views: `grid md:grid-cols-2 gap-6`

### Form layout

- Single-column on mobile, two-column on desktop: `grid md:grid-cols-2 gap-4`
- Section headings: `text-xl font-semibold text-forest-800 mb-4`
- Submit actions in a sticky footer: `sticky bottom-0 bg-surface border-t border-surface-border px-6 py-4`

---

## Accessibility

- Every interactive element has a visible focus ring (`focus-visible:ring-2 ring-forest-500 ring-offset-2`)
- Color contrast: all text/background combinations pass WCAG AA (4.5:1 for body text)
- Icons accompanying text are `aria-hidden`; icon-only buttons have `aria-label`
- Forms use proper `<label>` association; error messages linked via `aria-describedby`
- Motion respects `prefers-reduced-motion`: reduce or disable non-essential animations

---

## What NOT to do

- Don't use gradients. This is a professional product; flat color only.
- Don't use drop shadows larger than `shadow-cardHover`. Keep it grounded.
- Don't introduce new colors without updating this doc first.
- Don't use emojis in UI chrome. Use Lucide icons.
- Don't use pure black (`#000`) or pure white with reckless abandon — pure white is for card surfaces only; text is `forest-800`.
- Don't use italic as the primary mechanism for emphasis — use weight (`font-semibold`) or color (`text-forest-500`).
- Don't let page width exceed `max-w-7xl` (1280px) in dashboard context. Marketing pages can go wider.
